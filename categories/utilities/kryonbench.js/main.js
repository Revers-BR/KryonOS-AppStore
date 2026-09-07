// =================================================================
// KryonBench v1.0 - Benchmark de Desempenho Completo para KryonOS
// Resolução: 240x320 | Arquitetura: 16-bit Sliced Buffer (RGB565)
// Engine: Duktape + KryonOS
// =================================================================

// --- SEÇÃO 1: CONFIGURAÇÃO DE DISPLAY E SLICE BUFFER ---
var DISPLAY_W = Display.screenWidth();  // 240
var DISPLAY_H = Display.screenHeight(); // 320
var sliceH    = 40;                     // 8 fatias de 40px = 320px (~19.2 KB RAM)
var numSlices = Math.ceil(DISPLAY_H / sliceH);

// Alocação ÚNICA do Sprite Buffer na RAM (19.2 KB)
Sprite.create(DISPLAY_W, sliceH);

// --- SEÇÃO 2: PALETA DE CORES 16-BITS (RGB565) ---
var BG_MAIN     = Display.color(15, 23, 42);   // Slate 900
var CARD_BG     = Display.color(30, 41, 59);   // Slate 800
var CARD_BORDER = Display.color(51, 65, 85);   // Slate 700
var PRIMARY     = Display.color(59, 130, 246); // Azul Neon
var CYAN        = Display.color(6, 182, 212);  // Ciano Accent
var SUCCESS     = Display.color(16, 185, 129); // Verde Emerald
var WARNING     = Display.color(245, 158, 11); // Âmbar Gold
var DANGER      = Display.color(239, 68, 68);  // Vermelho
var TEXT_MAIN   = Display.color(255, 255, 255);// Branco
var TEXT_MUTED  = Display.color(148, 163, 184);// Cinza Texto
var PANEL_DARK  = Display.color(2, 6, 23);     // Fundo Barra

// --- SEÇÃO 3: ESTADOS E MÉTRICAS DO BENCHMARK ---
var STATE_READY   = 0; // Tela Inicial / Ready
var STATE_TESTING = 1; // Executando os testes
var STATE_RESULTS = 2; // Exibindo Resultados

var currentState = STATE_READY;
var testPhase    = 0;  // 0: CPU, 1: RAM, 2: GPU/Graphics
var testProgress = 0;  // 0% a 100%

// Métricas e Resultados
var scores = { cpu: 0, memory: 0, gpu: 0, total: 0 };
var metrics = {
    cpuTimeMs: 0,
    mathOpsDone: 0,
    ramTimeMs: 0,
    arrayOpsDone: 0,
    avgFps: 0,
    totalFrames: 0
};

// Partículas para o Teste Gráfico
var particles = [];
var NUM_PARTICLES = 40;

for (var p = 0; p < NUM_PARTICLES; p++) {
    particles.push({
        x: Math.floor(Math.random() * 200) + 20,
        y: Math.floor(Math.random() * 140) + 110,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        color: (p % 2 === 0) ? CYAN : PRIMARY
    });
}

// Controladores de Tempo e Interface
var lastTouch     = false;
var testStartTime = 0;
var frameStart     = 0;

// --- SEÇÃO 4: AUXILIARES E COMPONENTES DE UI (SLICED) ---

function inSlice(y, h, sliceY) {
    return (y + h >= sliceY && y < sliceY + sliceH);
}

function getTimeMs() {
    return Harix.millis();
}

function drawCard(x, y, w, h, title, sliceY) {
    if (!inSlice(y, h, sliceY)) return;
    var sy = y - sliceY;

    Display.fillRect(x, sy, w, h, CARD_BG);
    Display.drawRect(x, sy, w, h, CARD_BORDER);
    if (title) {
        Display.setTextColor(TEXT_MUTED, CARD_BG);
        Display.drawString(title, x + 8, sy + 6, 1);
    }
}

function drawButton(x, y, w, h, label, bgColor, textColor, sliceY) {
    if (!inSlice(y, h, sliceY)) return;
    var sy = y - sliceY;

    Display.fillRect(x, sy, w, h, bgColor);
    Display.drawRect(x, sy, w, h, CARD_BORDER);
    Display.setTextColor(textColor, bgColor);
    Display.drawString(label, x + (w / 2) - (label.length * 3), sy + (h / 2) - 6, 1);
}

function drawProgressBar(x, y, w, h, percent, color, sliceY) {
    if (!inSlice(y, h, sliceY)) return;
    var sy = y - sliceY;

    Display.fillRect(x, sy, w, h, CARD_BORDER);
    var fillWidth = Math.floor((w - 2) * (percent / 100));
    if (fillWidth > 0) {
        Display.fillRect(x + 1, sy + 1, fillWidth, h - 2, color);
    }
}

// --- SEÇÃO 5: WORKLOADS DE ESTRESSE (CPU & MEMÓRIA) ---

function runCpuWorkload(chunkSize) {
    var ops = 0;
    for (var i = 0; i < chunkSize; i++) {
        var val = Math.sin(i) * Math.cos(i) + Math.sqrt(i + 1);
        var num = i + 1000;
        var isPrime = true;
        for (var d = 2; d * d <= num; d++) {
            if (num % d === 0) { isPrime = false; break; }
        }
        ops += 2;
    }
    return ops;
}

function runMemoryWorkload() {
    var arr = [];
    var size = 1500;
    for (var i = 0; i < size; i++) {
        arr.push(Math.floor(Math.random() * 10000));
    }
    arr.sort(function(a, b) { return a - b; });
    var str = arr.slice(0, 100).join("-");
    var splitArr = str.split("-");
    
    return size + splitArr.length;
}

// --- SEÇÃO 6: RENDERIZADORES DAS TELAS DE BENCHMARK ---

function drawHeaderBar(sliceY) {
    if (!inSlice(0, 30, sliceY)) return;
    var sy = 0 - sliceY;

    Display.fillRect(0, sy, 240, 30, PANEL_DARK);
    Display.drawLine(0, sy + 30, 240, sy + 30, CARD_BORDER);
    Display.setTextColor(PRIMARY, PANEL_DARK);
    Display.drawString("KryonBench", 10, sy + 8, 2);

    // Botão Sair (X)
    Display.fillRect(195, sy + 4, 40, 22, DANGER);
    Display.setTextColor(TEXT_MAIN, DANGER);
    Display.drawString("X", 210, sy + 7, 2);
}

function drawStateReady(sliceY) {
    drawCard(10, 40, 220, 85, "SOBRE O BENCHMARK", sliceY);
    if (inSlice(62, 50, sliceY)) {
        Display.setTextColor(TEXT_MAIN, CARD_BG);
        Display.drawString("Avalia o desempenho real do", 18, 62 - sliceY, 1);
        Display.drawString("hardware sob carga maxima:", 18, 76 - sliceY, 1);
        Display.setTextColor(CYAN, CARD_BG);
        Display.drawString("- CPU (Floating Math & Primes)", 18, 92 - sliceY, 1);
        Display.drawString("- RAM & Garbage Collector", 18, 104 - sliceY, 1);
    }

    drawCard(10, 135, 220, 100, "ESPECIFICACOES DO DISPOSITIVO", sliceY);
    if (inSlice(158, 60, sliceY)) {
        Display.setTextColor(TEXT_MUTED, CARD_BG);
        Display.drawString("SoC:", 20, 158 - sliceY, 1);
        Display.drawString("Display:", 20, 175 - sliceY, 1);
        Display.drawString("JS Engine:", 20, 192 - sliceY, 1);
        Display.drawString("GUI Framework:", 20, 209 - sliceY, 1);

        Display.setTextColor(TEXT_MAIN, CARD_BG);
        Display.drawString("ESP32 Dual-Core", 100, 158 - sliceY, 1);
        Display.drawString("240x320 ST7789", 100, 175 - sliceY, 1);
        Display.drawString("Duktape v2.x", 100, 192 - sliceY, 1);
        Display.drawString("KryonOS Native", 100, 209 - sliceY, 1);
    }

    drawButton(20, 250, 200, 50, "INICIAR TESTE", SUCCESS, TEXT_MAIN, sliceY);
}

function drawStateTesting(sliceY) {
    drawCard(10, 40, 220, 220, "PROGRESSO DO TESTE", sliceY);

    if (testPhase === 0) {
        if (inSlice(65, 12, sliceY)) {
            Display.setTextColor(CYAN, CARD_BG);
            Display.drawString("[1/3] Testando CPU & Math...", 20, 65 - sliceY, 1);
        }
        drawProgressBar(20, 85, 200, 16, testProgress, PRIMARY, sliceY);
        if (inSlice(115, 12, sliceY)) {
            Display.setTextColor(TEXT_MAIN, CARD_BG);
            Display.drawString("Ops Calculadas: " + metrics.mathOpsDone, 20, 115 - sliceY, 1);
        }
    } else if (testPhase === 1) {
        if (inSlice(65, 12, sliceY)) {
            Display.setTextColor(WARNING, CARD_BG);
            Display.drawString("[2/3] Testando Memoria & RAM...", 20, 65 - sliceY, 1);
        }
        drawProgressBar(20, 85, 200, 16, testProgress, WARNING, sliceY);
        if (inSlice(115, 12, sliceY)) {
            Display.setTextColor(TEXT_MAIN, CARD_BG);
            Display.drawString("Alocacoes JS: " + metrics.arrayOpsDone, 20, 115 - sliceY, 1);
        }
    } else if (testPhase === 2) {
        if (inSlice(65, 12, sliceY)) {
            Display.setTextColor(SUCCESS, CARD_BG);
            Display.drawString("[3/3] Testando Renderizacao GPU...", 20, 65 - sliceY, 1);
        }
        drawProgressBar(20, 85, 200, 12, testProgress, SUCCESS, sliceY);

        // Moldura da Caixa de Animação
        if (inSlice(105, 140, sliceY)) {
            Display.drawRect(20, 105 - sliceY, 200, 140, CARD_BORDER);
        }

        // Renderização de Partículas
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            var px = Math.floor(p.x);
            var py = Math.floor(p.y);

            if (inSlice(py - 2, 5, sliceY)) {
                Display.fillRect(px - 2, py - 2 - sliceY, 5, 5, p.color);
            }

            // Linhas de proximidade entre partículas (Stress de Draw Calls)
            if (i < particles.length - 1) {
                var pNext = particles[i + 1];
                var pNextX = Math.floor(pNext.x);
                var pNextY = Math.floor(pNext.y);
                var dx = p.x - pNext.x;
                var dy = p.y - pNext.y;

                if ((dx * dx + dy * dy) < 1600) {
                    var minY = Math.min(py, pNextY);
                    var maxY = Math.max(py, pNextY);
                    if (inSlice(minY, (maxY - minY) + 1, sliceY)) {
                        Display.drawLine(px, py - sliceY, pNextX, pNextY - sliceY, CARD_BORDER);
                    }
                }
            }
        }
    }

    // Rodapé
    if (inSlice(275, 45, sliceY)) {
        var sy = 275 - sliceY;
        Display.fillRect(0, sy, 240, 45, PANEL_DARK);
        Display.setTextColor(TEXT_MUTED, PANEL_DARK);
        Display.drawString("Executando testes...", 15, sy + 15, 1);
    }
}

function drawStateResults(sliceY) {
    drawCard(10, 38, 220, 75, "PONTUACAO TOTAL", sliceY);

    if (inSlice(58, 45, sliceY)) {
        Display.setTextColor(SUCCESS, CARD_BG);
        Display.drawString(scores.total + " pts", 20, 58 - sliceY, 3);

        var rating = "Medio";
        var ratingColor = WARNING;
        if (scores.total > 2500) { rating = "Excelente!"; ratingColor = SUCCESS; }
        else if (scores.total < 1200) { rating = "Modesto"; ratingColor = DANGER; }

        Display.setTextColor(ratingColor, CARD_BG);
        Display.drawString("Rating: " + rating, 20, 92 - sliceY, 1);
    }

    drawCard(10, 120, 220, 125, "DETALHAMENTO", sliceY);

    if (inSlice(140, 85, sliceY)) {
        // CPU
        Display.setTextColor(TEXT_MAIN, CARD_BG);
        Display.drawString("CPU Score:", 20, 140 - sliceY, 1);
        Display.setTextColor(CYAN, CARD_BG);
        Display.drawString(scores.cpu + " pts", 140, 140 - sliceY, 1);

        // Memória RAM
        Display.setTextColor(TEXT_MAIN, CARD_BG);
        Display.drawString("RAM Score:", 20, 162 - sliceY, 1);
        Display.setTextColor(WARNING, CARD_BG);
        Display.drawString(scores.memory + " pts", 140, 162 - sliceY, 1);

        // GPU / FPS
        Display.setTextColor(TEXT_MAIN, CARD_BG);
        Display.drawString("GPU / FPS:", 20, 184 - sliceY, 1);
        Display.setTextColor(SUCCESS, CARD_BG);
        Display.drawString(scores.gpu + " pts (" + metrics.avgFps + " FPS)", 125, 184 - sliceY, 1);

        // Tempo total
        Display.setTextColor(TEXT_MUTED, CARD_BG);
        Display.drawString("Tempo do Teste: " + Math.round((getTimeMs() - testStartTime) / 1000) + "s", 20, 215 - sliceY, 1);
    }

    drawButton(20, 255, 200, 45, "RETESTAR", PRIMARY, TEXT_MAIN, sliceY);
}

// --- SEÇÃO 7: LÓGICA DE ATUALIZAÇÃO E WORKLOADS (1x POR FRAME) ---

function handleInput(isClick, tx, ty) {
    if (!isClick) return;

    // Botão Sair (Canto Superior Direito)
    if (tx >= 195 && tx <= 235 && ty >= 4 && ty <= 26) {
        // Ação de saída do benchmark
        return true; // Sinaliza para sair
    }

    if (currentState === STATE_READY) {
        if (tx >= 20 && tx <= 220 && ty >= 250 && ty <= 300) {
            currentState = STATE_TESTING;
            testPhase = 0;
            testProgress = 0;
            metrics.mathOpsDone = 0;
            metrics.arrayOpsDone = 0;
            metrics.totalFrames = 0;
            metrics.cpuTimeMs = 0;
            metrics.ramTimeMs = 0;
            testStartTime = getTimeMs();
        }
    } else if (currentState === STATE_RESULTS) {
        if (tx >= 20 && tx <= 220 && ty >= 255 && ty <= 300) {
            currentState = STATE_READY;
        }
    }
    return false;
}

function updateState() {
    if (currentState !== STATE_TESTING) return;

    // --- FASE 0: TESTE DE CPU ---
    if (testPhase === 0) {
        var cpuStart = getTimeMs();
        metrics.mathOpsDone += runCpuWorkload(4000);
        metrics.cpuTimeMs += (getTimeMs() - cpuStart);

        testProgress += 5;
        if (testProgress >= 33) {
            testPhase = 1;
        }

    // --- FASE 1: TESTE DE MEMÓRIA & RAM ---
    } else if (testPhase === 1) {
        var ramStart = getTimeMs();
        metrics.arrayOpsDone += runMemoryWorkload();
        metrics.ramTimeMs += (getTimeMs() - ramStart);

        testProgress += 4;
        if (testProgress >= 66) {
            testPhase = 2;
            frameStart = getTimeMs();
        }

    // --- FASE 2: TESTE GRÁFICO / GPU & PARTÍCULAS ---
    } else if (testPhase === 2) {
        testProgress += 1;

        // Atualização da física de partículas (Executa 1x por frame)
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            p.x += p.vx;
            p.y += p.vy;

            // Colisão com as bordas da caixa (20..220, 105..245)
            if (p.x <= 22 || p.x >= 216) p.vx = -p.vx;
            if (p.y <= 107 || p.y >= 242) p.vy = -p.vy;
        }

        metrics.totalFrames++;

        if (testProgress >= 100) {
            var gpuTotalTimeSec = (getTimeMs() - frameStart) / 1000;
            metrics.avgFps = Math.round(metrics.totalFrames / (gpuTotalTimeSec > 0 ? gpuTotalTimeSec : 1));

            // Cálculo final dos Scores
            scores.cpu    = Math.round((metrics.mathOpsDone / (metrics.cpuTimeMs || 1)) * 12);
            scores.memory = Math.round((metrics.arrayOpsDone / (metrics.ramTimeMs || 1)) * 45);
            scores.gpu    = Math.round(metrics.avgFps * 85);
            scores.total  = Math.round((scores.cpu * 0.4) + (scores.memory * 0.3) + (scores.gpu * 0.3));

            currentState = STATE_RESULTS;
        }
    }
}

// --- SEÇÃO 8: LOOP PRINCIPAL DE RENDERIZAÇÃO ---

while (true) {
    // 1. Leitura de Toque e Debounce
    var touch = Input.getTouch();
    
    // Check for exit condition (top-right corner)
    if (touch.touched && touch.x >= DISPLAY_W - 40 && touch.y <= 40) {
        break;
    }
    
    // Check for ESC key
    var key = Input.getKey();
    if (key === "ESC") {
        break;
    }
    
    var isClick = touch.touched && !lastTouch;
    lastTouch = touch.touched;

    // 2. Processa Lógica, Cargas de Trabalho e Inputs (1x por Quadro)
    if (isClick && touch.x < DISPLAY_W - 40) { // Avoid OS close button area
        if (handleInput(isClick, touch.x, touch.y)) {
            break; // Exit if X button clicked
        }
    }
    updateState();

    // 3. Loop de Renderização Fatiada (8 Fatias de 40px)
    for (var slice = 0; slice < numSlices; slice++) {
        var sliceY = slice * sliceH;

        Sprite.bind(true);
        Display.fillScreen(BG_MAIN);

        // Renderiza Barra Superior
        drawHeaderBar(sliceY);

        // Renderiza Tela Correspondente ao Estado
        if (currentState === STATE_READY) {
            drawStateReady(sliceY);
        } else if (currentState === STATE_TESTING) {
            drawStateTesting(sliceY);
        } else if (currentState === STATE_RESULTS) {
            drawStateResults(sliceY);
        }

        Sprite.bind(false);
        Sprite.push(0, sliceY);
    }

    // 4. Mantém taxa de atualização constante (~30 FPS)
    Harix.delay(33);
}

// Cleanup
Sprite.delete();
Display.fillScreen(BG_MAIN);