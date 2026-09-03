// =================================================================
// KryonBench v1.3 - Benchmark Adaptativo para KryonOS
// Resolução: Adaptativa (240x135 ou 240x320)
// Engine: Wren Engine (KryonOS) | Suporte Teclado & Sliced Buffer
// =================================================================

// --- SEÇÃO 1: CONFIGURAÇÃO DE DISPLAY E SLICE BUFFER ---
var DISPLAY_W = Display.screenWidth()   // 240
var DISPLAY_H = Display.screenHeight()  // 135 ou 320
var isSmall   = (DISPLAY_H <= 135)

var headerH   = isSmall ? 18 : 30
var sliceH    = 80                     // Fatias de 80px para a GPU
var numSlices = (DISPLAY_H / sliceH).ceil

// Alocação ÚNICA do Sprite Buffer na RAM
Sprite.create(DISPLAY_W, sliceH)

// --- SEÇÃO 2: PALETA DE CORES 16-BITS (RGB565) ---
var BG_MAIN     = Display.color(15, 23, 42)     // 0x0F172A - Slate 900
var CARD_BG     = Display.color(30, 41, 59)     // 0x1E293B - Slate 800
var CARD_BORDER = Display.color(51, 65, 85)     // 0x334155 - Slate 700
var PRIMARY     = Display.color(59, 130, 246)   // 0x3B82F6 - Azul Neon
var CYAN        = Display.color(6, 182, 212)    // 0x06B6D4 - Ciano Accent
var SUCCESS     = Display.color(16, 185, 129)   // 0x10B981 - Verde Emerald
var WARNING     = Display.color(245, 158, 11)   // 0xF59E0B - Âmbar Gold
var DANGER      = Display.color(239, 68, 68)    // 0xEF4444 - Vermelho
var TEXT_MAIN   = Display.color(255, 255, 255)  // 0xFFFFFF - Branco
var TEXT_MUTED  = Display.color(148, 163, 184)  // 0x94A3B8 - Cinza Texto
var PANEL_DARK  = Display.color(2, 6, 23)       // 0x020617 - Fundo Barra

// --- SEÇÃO 3: ESTADOS E MÉTRICAS DO BENCHMARK ---
var STATE_READY   = 0  // Tela Inicial / Ready
var STATE_TESTING = 1  // Executando os testes
var STATE_RESULTS = 2  // Exibindo Resultados

var currentState = STATE_READY
var testPhase    = 0   // 0: CPU, 1: RAM, 2: GPU/Graphics
var testProgress = 0   // 0% a 100%

// Métricas e Resultados
var scores = { "cpu": 0, "memory": 0, "gpu": 0, "total": 0 }
var metrics = {
    "cpuTimeMs": 0,
    "mathOpsDone": 0,
    "ramTimeMs": 0,
    "arrayOpsDone": 0,
    "avgFps": 0,
    "totalFrames": 0
}

// Configuração de Partículas Adaptativa para o Teste Gráfico
var NUM_PARTICLES = isSmall ? 20 : 40
var minYBound = isSmall ? 67 : 107
var maxYBound = isSmall ? 111 : 242

// Função para gerar números pseudo-aleatórios
var seed = Harix.millis()
var randomNext = Fn.new {
    seed = (seed * 1103515245 + 12345) % 2147483648
    return seed / 2147483648.0
}

class Particle {
    construct new(minY, maxY, small, counter, randFn) {
        _minY = minY
        _maxY = maxY
        _small = small
        
        // Posição inicial mais distribuída
        _x = 30 + ((counter * 37) % 180)
        _y = minY + 5 + ((counter * 23) % (maxY - minY - 10))
        
        // Velocidades com direções variadas
        var speed = small ? 2 : 3
        _vx = speed * (0.5 - randFn.call())
        _vy = speed * (0.5 - randFn.call())
        
        // Alternância de cores mais estável
        _color = (counter % 2 == 0) ? CYAN : PRIMARY
    }
    
    x { _x }
    y { _y }
    vx { _vx }
    vy { _vy }
    color { _color }
    
    x=(value) { _x = value }
    y=(value) { _y = value }
    vx=(value) { _vx = value }
    vy=(value) { _vy = value }
    
    update() {
        _x = _x + _vx
        _y = _y + _vy
        
        if (_x <= 22) {
            _x = 22
            _vx = -_vx
        }
        if (_x >= 216) {
            _x = 216
            _vx = -_vx
        }
        if (_y <= _minY) {
            _y = _minY
            _vy = -_vy
        }
        if (_y >= _maxY) {
            _y = _maxY
            _vy = -_vy
        }
    }
}

var particles = []
var p = 0
while (p < NUM_PARTICLES) {
    particles.add(Particle.new(minYBound, maxYBound, isSmall, p, randomNext))
    p = p + 1
}

// Controladores de Tempo e Interface
var lastTouch     = false
var testStartTime = 0
var frameStart    = 0

// --- SEÇÃO 4: AUXILIARES E COMPONENTES DE UI (SLICED) ---

var inSlice = Fn.new { |y, h, sliceY|
    return (y + h >= sliceY && y < sliceY + sliceH)
}

var getTimeMs = Fn.new {
    return Harix.millis()
}

var drawCard = Fn.new { |x, y, w, h, title, sliceY|
    if (!inSlice.call(y, h, sliceY)) return
    var sy = y - sliceY

    Display.fillRect(x, sy, w, h, CARD_BG)
    Display.drawRect(x, sy, w, h, CARD_BORDER)
    if (title != null) {
        Display.setTextColor(TEXT_MUTED, CARD_BG)
        Display.drawString(title, x + 6, sy + (isSmall ? 3 : 6), 1)
        if (!isSmall) {
            Display.drawLine(x + 1, sy + 18, x + w - 2, sy + 18, CARD_BORDER)
        }
    }
}

var drawButton = Fn.new { |x, y, w, h, label, bgColor, textColor, sliceY|
    if (!inSlice.call(y, h, sliceY)) return
    var sy = y - sliceY

    Display.fillRect(x, sy, w, h, bgColor)
    Display.drawRect(x, sy, w, h, CARD_BORDER)
    Display.setTextColor(textColor, bgColor)
    
    var textX = x + ((w / 2) - (label.count * 3)).floor
    var textY = sy + ((h / 2) - 4).floor
    Display.drawString(label, textX > x ? textX : x + 2, textY, 1)
}

var drawProgressBar = Fn.new { |x, y, w, h, percent, color, sliceY|
    if (!inSlice.call(y, h, sliceY)) return
    var sy = y - sliceY

    Display.fillRect(x, sy, w, h, CARD_BORDER)
    var fillWidth = ((w - 2) * (percent / 100)).floor
    if (fillWidth > 0) {
        Display.fillRect(x + 1, sy + 1, fillWidth, h - 2, color)
    }
}

// --- SEÇÃO 5: WORKLOADS DE ESTRESSE (CPU & MEMÓRIA) ---

var runCpuWorkload = Fn.new { |chunkSize|
    var ops = 0
    var i = 1
    while (i <= chunkSize) {
        var num = i + 1000
        var isPrime = true
        var d = 2
        while (d * d <= num) {
            if (num % d == 0) { 
                isPrime = false 
                break 
            }
            d = d + 1
        }
        ops = ops + 1
        i = i + 1
    }
    return ops
}

var runMemoryWorkload = Fn.new {
    var arr = []
    var size = isSmall ? 800 : 1500
    var i = 1
    while (i <= size) {
        arr.add((i * 7919) % 10000)
        i = i + 1
    }
    
    // Simulando manipulação de strings
    var t_slice = []
    var j = 0
    while (j < 60) {
        if (j < arr.count) {
            t_slice.add(arr[j].toString)
        }
        j = j + 1
    }
    var str = t_slice.join("-")
    
    var splitArr = str.split("-")
    
    return size + splitArr.count
}

// --- SEÇÃO 6: RENDERIZADORES DAS TELAS DE BENCHMARK ---

var drawHeaderBar = Fn.new { |sliceY|
    if (!inSlice.call(0, headerH, sliceY)) return
    var sy = 0 - sliceY

    Display.fillRect(0, sy, 240, headerH, PANEL_DARK)
    Display.drawLine(0, sy + headerH, 240, sy + headerH, CARD_BORDER)
    Display.setTextColor(PRIMARY, PANEL_DARK)
    
    if (isSmall) {
        Display.drawString("KryonBench v1.3", 6, sy + 4, 1)
        drawButton.call(198, 2, 38, 14, "X", DANGER, TEXT_MAIN, sliceY)
    } else {
        Display.drawString("KryonBench", 10, sy + 8, 2)
        drawButton.call(195, 4, 40, 22, "X", DANGER, TEXT_MAIN, sliceY)
    }
}

var drawStateReady = Fn.new { |sliceY|
    if (isSmall) {
        // Layout 240x135
        drawCard.call(6, 20, 228, 42, "BENCHMARK DE PERFORMANCE", sliceY)
        if (inSlice.call(34, 20, sliceY)) {
            Display.setTextColor(TEXT_MAIN, CARD_BG)
            Display.drawString("Teste de CPU, RAM e Render GPU.", 10, 34 - sliceY, 1)
        }

        drawCard.call(6, 64, 228, 42, "ESPECIFICACOES", sliceY)
        if (inSlice.call(78, 20, sliceY)) {
            Display.setTextColor(CYAN, CARD_BG)
            Display.drawString("SoC: ESP32 | Display: 240x135", 10, 78 - sliceY, 1)
        }

        drawButton.call(6, 108, 228, 22, "INICIAR TESTE [ESPACO/1]", SUCCESS, TEXT_MAIN, sliceY)
    } else {
        // Layout 240x320
        drawCard.call(10, 40, 220, 85, "SOBRE O BENCHMARK", sliceY)
        if (inSlice.call(62, 50, sliceY)) {
            Display.setTextColor(TEXT_MAIN, CARD_BG)
            Display.drawString("Avalia o desempenho real do", 18, 62 - sliceY, 1)
            Display.drawString("hardware sob carga maxima:", 18, 76 - sliceY, 1)
            Display.setTextColor(CYAN, CARD_BG)
            Display.drawString("- CPU (Floating Math & Primes)", 18, 92 - sliceY, 1)
            Display.drawString("- RAM & Garbage Collector", 18, 104 - sliceY, 1)
        }

        drawCard.call(10, 135, 220, 100, "ESPECIFICACOES DO DISPOSITIVO", sliceY)
        if (inSlice.call(158, 60, sliceY)) {
            Display.setTextColor(TEXT_MUTED, CARD_BG)
            Display.drawString("SoC:", 20, 158 - sliceY, 1)
            Display.drawString("Display:", 20, 175 - sliceY, 1)
            Display.drawString("Wren Engine:", 20, 192 - sliceY, 1)
            Display.drawString("GUI Framework:", 20, 209 - sliceY, 1)

            Display.setTextColor(TEXT_MAIN, CARD_BG)
            Display.drawString("ESP32 Dual-Core", 100, 158 - sliceY, 1)
            Display.drawString("240x320 ST7789", 100, 175 - sliceY, 1)
            Display.drawString("Wren Engine v1.0", 100, 192 - sliceY, 1)
            Display.drawString("KryonOS Native", 100, 209 - sliceY, 1)
        }

        drawButton.call(20, 250, 200, 50, "INICIAR TESTE", SUCCESS, TEXT_MAIN, sliceY)
    }
}

var drawStateTesting = Fn.new { |sliceY|
    if (isSmall) {
        // Layout 240x135
        drawCard.call(6, 20, 228, 110, "PROGRESSO DO TESTE", sliceY)

        if (testPhase == 0) {
            if (inSlice.call(34, 12, sliceY)) {
                Display.setTextColor(CYAN, CARD_BG)
                Display.drawString("[1/3] CPU Math...", 10, 34 - sliceY, 1)
            }
            drawProgressBar.call(10, 48, 220, 10, testProgress, PRIMARY, sliceY)
        } else if (testPhase == 1) {
            if (inSlice.call(34, 12, sliceY)) {
                Display.setTextColor(WARNING, CARD_BG)
                Display.drawString("[2/3] Memoria RAM...", 10, 34 - sliceY, 1)
            }
            drawProgressBar.call(10, 48, 220, 10, testProgress, WARNING, sliceY)
        } else if (testPhase == 2) {
            if (inSlice.call(34, 12, sliceY)) {
                Display.setTextColor(SUCCESS, CARD_BG)
                Display.drawString("[3/3] Render GPU...", 10, 34 - sliceY, 1)
            }
            drawProgressBar.call(10, 48, 220, 8, testProgress, SUCCESS, sliceY)

            // Moldura do Teste Gráfico em 135px
            if (inSlice.call(65, 48, sliceY)) {
                Display.drawRect(20, 65 - sliceY, 200, 48, CARD_BORDER)
            }

            // Renderização de Partículas
            var i = 0
            while (i < particles.count) {
                var p = particles[i]
                var px = p.x.floor
                var py = p.y.floor

                if (inSlice.call(py - 1, 3, sliceY)) {
                    Display.fillRect(px - 1, py - 1 - sliceY, 3, 3, p.color)
                }
                i = i + 1
            }
        }
    } else {
        // Layout 240x320
        drawCard.call(10, 40, 220, 220, "PROGRESSO DO TESTE", sliceY)

        if (testPhase == 0) {
            if (inSlice.call(65, 12, sliceY)) {
                Display.setTextColor(CYAN, CARD_BG)
                Display.drawString("[1/3] Testando CPU & Math...", 20, 65 - sliceY, 1)
            }
            drawProgressBar.call(20, 85, 200, 16, testProgress, PRIMARY, sliceY)
            if (inSlice.call(115, 12, sliceY)) {
                Display.setTextColor(TEXT_MAIN, CARD_BG)
                Display.drawString("Ops Calculadas: %(metrics["mathOpsDone"])", 20, 115 - sliceY, 1)
            }
        } else if (testPhase == 1) {
            if (inSlice.call(65, 12, sliceY)) {
                Display.setTextColor(WARNING, CARD_BG)
                Display.drawString("[2/3] Testando Memoria & RAM...", 20, 65 - sliceY, 1)
            }
            drawProgressBar.call(20, 85, 200, 16, testProgress, WARNING, sliceY)
            if (inSlice.call(115, 12, sliceY)) {
                Display.setTextColor(TEXT_MAIN, CARD_BG)
                Display.drawString("Alocacoes Wren: %(metrics["arrayOpsDone"])", 20, 115 - sliceY, 1)
            }
        } else if (testPhase == 2) {
            if (inSlice.call(65, 12, sliceY)) {
                Display.setTextColor(SUCCESS, CARD_BG)
                Display.drawString("[3/3] Testando Renderizacao GPU...", 20, 65 - sliceY, 1)
            }
            drawProgressBar.call(20, 85, 200, 12, testProgress, SUCCESS, sliceY)

            if (inSlice.call(105, 140, sliceY)) {
                Display.drawRect(20, 105 - sliceY, 200, 140, CARD_BORDER)
            }

            var i = 0
            while (i < particles.count) {
                var p = particles[i]
                var px = p.x.floor
                var py = p.y.floor

                if (inSlice.call(py - 2, 5, sliceY)) {
                    Display.fillRect(px - 2, py - 2 - sliceY, 5, 5, p.color)
                }

                if (i < particles.count - 1) {
                    var pNext = particles[i + 1]
                    var pNextX = pNext.x.floor
                    var pNextY = pNext.y.floor
                    var dx = p.x - pNext.x
                    var dy = p.y - pNext.y

                    if ((dx * dx + dy * dy) < 1600) {
                        var minY = py.min(pNextY)
                        var maxY = py.max(pNextY)
                        if (inSlice.call(minY, (maxY - minY) + 1, sliceY)) {
                            Display.drawLine(px, py - sliceY, pNextX, pNextY - sliceY, CARD_BORDER)
                        }
                    }
                }
                i = i + 1
            }
        }

        if (inSlice.call(275, 45, sliceY)) {
            var sy = 275 - sliceY
            Display.fillRect(0, sy, 240, 45, PANEL_DARK)
            Display.setTextColor(TEXT_MUTED, PANEL_DARK)
            Display.drawString("Executando testes...", 15, sy + 15, 1)
        }
    }
}

var drawStateResults = Fn.new { |sliceY|
    if (isSmall) {
        // Layout 240x135
        drawCard.call(6, 20, 228, 42, "PONTUACAO TOTAL", sliceY)
        if (inSlice.call(34, 20, sliceY)) {
            Display.setTextColor(SUCCESS, CARD_BG)
            Display.drawString("%(scores["total"]) pts", 10, 34 - sliceY, 2)
        }

        drawCard.call(6, 64, 228, 42, "DETALHAMENTO", sliceY)
        if (inSlice.call(78, 20, sliceY)) {
            Display.setTextColor(TEXT_MAIN, CARD_BG)
            Display.drawString("CPU:%(scores["cpu"]) | RAM:%(scores["memory"]) | GPU:%(scores["gpu"])", 10, 78 - sliceY, 1)
        }

        drawButton.call(6, 108, 228, 22, "RETESTAR [ESPACO/1]", PRIMARY, TEXT_MAIN, sliceY)
    } else {
        // Layout 240x320
        drawCard.call(10, 38, 220, 75, "PONTUACAO TOTAL", sliceY)

        if (inSlice.call(58, 45, sliceY)) {
            Display.setTextColor(SUCCESS, CARD_BG)
            Display.drawString("%(scores["total"]) pts", 20, 58 - sliceY, 3)

            var rating = "Medio"
            var ratingColor = WARNING
            if (scores["total"] > 2500) { 
                rating = "Excelente!" 
                ratingColor = SUCCESS 
            } else if (scores["total"] < 1200) { 
                rating = "Modesto" 
                ratingColor = DANGER 
            }

            Display.setTextColor(ratingColor, CARD_BG)
            Display.drawString("Rating: %(rating)", 20, 92 - sliceY, 1)
        }

        drawCard.call(10, 120, 220, 125, "DETALHAMENTO", sliceY)

        if (inSlice.call(140, 85, sliceY)) {
            Display.setTextColor(TEXT_MAIN, CARD_BG)
            Display.drawString("CPU Score:", 20, 140 - sliceY, 1)
            Display.setTextColor(CYAN, CARD_BG)
            Display.drawString("%(scores["cpu"]) pts", 140, 140 - sliceY, 1)

            Display.setTextColor(TEXT_MAIN, CARD_BG)
            Display.drawString("RAM Score:", 20, 162 - sliceY, 1)
            Display.setTextColor(WARNING, CARD_BG)
            Display.drawString("%(scores["memory"]) pts", 140, 162 - sliceY, 1)

            Display.setTextColor(TEXT_MAIN, CARD_BG)
            Display.drawString("GPU / FPS:", 20, 184 - sliceY, 1)
            Display.setTextColor(SUCCESS, CARD_BG)
            Display.drawString("%(scores["gpu"]) pts (%(metrics["avgFps"]) FPS)", 125, 184 - sliceY, 1)

            Display.setTextColor(TEXT_MUTED, CARD_BG)
            var elapsedSec = ((getTimeMs.call() - testStartTime) / 1000).floor
            Display.drawString("Tempo do Teste: %(elapsedSec)s", 20, 215 - sliceY, 1)
        }

        drawButton.call(20, 255, 200, 45, "RETESTAR", PRIMARY, TEXT_MAIN, sliceY)
    }
}

// --- SEÇÃO 7: PROCESSAMENTO DE ENTRADAS (TOUCH E TECLADO) ---

var startTestSequence = Fn.new {
    currentState = STATE_TESTING
    testPhase = 0
    testProgress = 0
    metrics["mathOpsDone"] = 0
    metrics["arrayOpsDone"] = 0
    metrics["totalFrames"] = 0
    metrics["cpuTimeMs"] = 0
    metrics["ramTimeMs"] = 0
    testStartTime = getTimeMs.call()
}

var processKeyboardInput = Fn.new {
    var ch = Input.getChar()
    if (ch != "") {
        // Tecla 'x', 'X' ou ESC (27) -> Sair/Reiniciar
        if (ch == "x" || ch == "X" || ch == "\x1b") {
            Harix.restart()
            return
        }

        // Alternar telas via Teclado (Espaço, Enter, TAB, '1', 's', 'r')
        if (currentState == STATE_READY) {
            if (ch == " " || ch == "s" || ch == "S" || ch == "1" || ch == "\r" || ch == "\t") {
                startTestSequence.call()
            }
        } else if (currentState == STATE_RESULTS) {
            if (ch == " " || ch == "r" || ch == "R" || ch == "1" || ch == "\r" || ch == "\t") {
                currentState = STATE_READY
            }
        }
    }
    
    // Também verificar teclas de navegação
    var key = Input.getKey()
    if (key == "ESC") {
        Harix.restart()
        return
    }
    if (currentState == STATE_READY && (key == "ENTER" || key == "UP" || key == "DOWN")) {
        startTestSequence.call()
    } else if (currentState == STATE_RESULTS && key == "ENTER") {
        currentState = STATE_READY
    }
}

var handleInput = Fn.new { |isClick, tx, ty|
    if (!isClick) return

    // Botão Sair (X)
    var closeXMin = isSmall ? 198 : 195
    var closeYMax = isSmall ? 18 : 26
    if (tx >= closeXMin && ty <= closeYMax) {
        Harix.restart()
        return
    }

    if (currentState == STATE_READY) {
        var btnYMin = isSmall ? 108 : 250
        var btnYMax = isSmall ? 130 : 300
        if (ty >= btnYMin && ty <= btnYMax) {
            startTestSequence.call()
        }
    } else if (currentState == STATE_RESULTS) {
        var btnYMin = isSmall ? 108 : 255
        var btnYMax = isSmall ? 130 : 300
        if (ty >= btnYMin && ty <= btnYMax) {
            currentState = STATE_READY
        }
    }
}

var updateState = Fn.new {
    if (currentState != STATE_TESTING) return

    // --- FASE 0: TESTE DE CPU ---
    if (testPhase == 0) {
        var cpuStart = getTimeMs.call()
        metrics["mathOpsDone"] = metrics["mathOpsDone"] + runCpuWorkload.call(isSmall ? 2000 : 4000)
        metrics["cpuTimeMs"] = metrics["cpuTimeMs"] + (getTimeMs.call() - cpuStart)

        testProgress = testProgress + 5
        if (testProgress >= 33) {
            testPhase = 1
        }

    // --- FASE 1: TESTE DE MEMÓRIA & RAM ---
    } else if (testPhase == 1) {
        var ramStart = getTimeMs.call()
        metrics["arrayOpsDone"] = metrics["arrayOpsDone"] + runMemoryWorkload.call()
        metrics["ramTimeMs"] = metrics["ramTimeMs"] + (getTimeMs.call() - ramStart)

        testProgress = testProgress + 4
        if (testProgress >= 66) {
            testPhase = 2
            frameStart = getTimeMs.call()
        }

    // --- FASE 2: TESTE GRÁFICO / GPU & PARTÍCULAS ---
    } else if (testPhase == 2) {
        testProgress = testProgress + 1

        // Atualização das partículas adaptada ao tamanho
        var i = 0
        while (i < particles.count) {
            particles[i].update()
            i = i + 1
        }

        metrics["totalFrames"] = metrics["totalFrames"] + 1

        if (testProgress >= 100) {
            var gpuTotalTimeSec = (getTimeMs.call() - frameStart) / 1000
            metrics["avgFps"] = (metrics["totalFrames"] / (gpuTotalTimeSec > 0 ? gpuTotalTimeSec : 1)).floor

            // Cálculo final dos Scores
            scores["cpu"]    = ((metrics["mathOpsDone"] / (metrics["cpuTimeMs"] > 0 ? metrics["cpuTimeMs"] : 1)) * 12).floor
            scores["memory"] = ((metrics["arrayOpsDone"] / (metrics["ramTimeMs"] > 0 ? metrics["ramTimeMs"] : 1)) * 45).floor
            scores["gpu"]    = (metrics["avgFps"] * 85).floor
            scores["total"]  = ((scores["cpu"] * 0.4) + (scores["memory"] * 0.3) + (scores["gpu"] * 0.3)).floor

            currentState = STATE_RESULTS
        }
    }
}

// --- SEÇÃO 8: LOOP PRINCIPAL DE RENDERIZAÇÃO ---

while (true) {
    // 1. Leitura de Teclado
    processKeyboardInput.call()

    // 2. Leitura de Toque e Debounce
    var touch = Input.getTouch()
    var isClick = touch["touched"] && !lastTouch
    lastTouch = touch["touched"]

    var touchX = touch["x"]
    var touchY = touch["y"]

    // 3. Processa Lógica e Inputs
    handleInput.call(isClick, touchX, touchY)
    updateState.call()

    // 4. Loop de Renderização Fatiada (Slice Buffer)
    var slice = 0
    while (slice < numSlices) {
        var sliceY = slice * sliceH

        Sprite.bind(true)
        Display.fillScreen(BG_MAIN)

        // Renderiza Barra Superior
        drawHeaderBar.call(sliceY)

        // Renderiza Tela Correspondente ao Estado
        if (currentState == STATE_READY) {
            drawStateReady.call(sliceY)
        } else if (currentState == STATE_TESTING) {
            drawStateTesting.call(sliceY)
        } else if (currentState == STATE_RESULTS) {
            drawStateResults.call(sliceY)
        }

        Sprite.bind(false)
        Sprite.push(0, sliceY)
        
        slice = slice + 1
    }

    // 5. Sincronização de Quadros (~30 FPS)
    Harix.delay(33)
}

// Cleanup
Sprite.delete()
Display.fillScreen(BG_MAIN)