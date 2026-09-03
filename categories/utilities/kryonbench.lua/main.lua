-- =================================================================
-- KryonBench v1.3 - Benchmark Adaptativo para KryonOS
-- Resolução: Adaptativa (240x135 ou 240x320)
-- Engine: Lua Engine (KryonOS) | Suporte Teclado & Sliced Buffer
-- =================================================================

-- --- SEÇÃO 1: CONFIGURAÇÃO DE DISPLAY E SLICE BUFFER ---
local DISPLAY_W = System.screenWidth()  -- 240
local DISPLAY_H = System.screenHeight() -- 135 ou 320
local isSmall   = (DISPLAY_H <= 135)

local headerH   = isSmall and 18 or 30
local sliceH    = 80                    -- Fatias de 40px para a GPU
local numSlices = math.ceil(DISPLAY_H / sliceH)

-- Alocação ÚNICA do Sprite Buffer na RAM
System.createSprite(DISPLAY_W, sliceH)

-- --- SEÇÃO 2: PALETA DE CORES 16-BITS (RGB565) ---
local BG_MAIN     = System.color(15, 23, 42)    -- 0x0F172A - Slate 900
local CARD_BG     = System.color(30, 41, 59)    -- 0x1E293B - Slate 800
local CARD_BORDER = System.color(51, 65, 85)    -- 0x334155 - Slate 700
local PRIMARY     = System.color(59, 130, 246)  -- 0x3B82F6 - Azul Neon
local CYAN        = System.color(6, 182, 212)   -- 0x06B6D4 - Ciano Accent
local SUCCESS     = System.color(16, 185, 129)  -- 0x10B981 - Verde Emerald
local WARNING     = System.color(245, 158, 11)  -- 0xF59E0B - Âmbar Gold
local DANGER      = System.color(239, 68, 68)   -- 0xEF4444 - Vermelho
local TEXT_MAIN   = System.color(255, 255, 255) -- 0xFFFFFF - Branco
local TEXT_MUTED  = System.color(148, 163, 184) -- 0x94A3B8 - Cinza Texto
local PANEL_DARK  = System.color(2, 6, 23)      -- 0x020617 - Fundo Barra

-- --- SEÇÃO 3: ESTADOS E MÉTRICAS DO BENCHMARK ---
local STATE_READY   = 0 -- Tela Inicial / Ready
local STATE_TESTING = 1 -- Executando os testes
local STATE_RESULTS = 2 -- Exibindo Resultados

local currentState = STATE_READY
local testPhase    = 0  -- 0: CPU, 1: RAM, 2: GPU/Graphics
local testProgress = 0  -- 0% a 100%

-- Métricas e Resultados
local scores = { cpu = 0, memory = 0, gpu = 0, total = 0 }
local metrics = {
    cpuTimeMs = 0,
    mathOpsDone = 0,
    ramTimeMs = 0,
    arrayOpsDone = 0,
    avgFps = 0,
    totalFrames = 0
}

-- Configuração de Partículas Adaptativa para o Teste Gráfico
local particles = {}
local NUM_PARTICLES = isSmall and 20 or 40
local minYBound = isSmall and 67 or 107
local maxYBound = isSmall and 111 or 242

for p = 1, NUM_PARTICLES do
    table.insert(particles, {
        x = math.floor(math.random() * 180) + 30,
        y = math.floor(math.random() * (maxYBound - minYBound - 10)) + minYBound + 5,
        vx = (math.random() - 0.5) * (isSmall and 4 or 6),
        vy = (math.random() - 0.5) * (isSmall and 4 or 6),
        color = (p % 2 == 1) and CYAN or PRIMARY
    })
end

-- Controladores de Tempo e Interface
local lastTouch     = false
local testStartTime = 0
local frameStart    = 0

-- --- SEÇÃO 4: AUXILIARES E COMPONENTES DE UI (SLICED) ---

local function inSlice(y, h, sliceY)
    return (y + h >= sliceY and y < sliceY + sliceH)
end

local function getTimeMs()
    return System.millis()
end

local function drawCard(x, y, w, h, title, sliceY)
    if not inSlice(y, h, sliceY) then return end
    local sy = y - sliceY

    System.fillRect(x, sy, w, h, CARD_BG)
    System.drawRect(x, sy, w, h, CARD_BORDER)
    if title then
        System.setTextColor(TEXT_MUTED, CARD_BG)
        System.drawString(title, x + 6, sy + (isSmall and 3 or 6), 1)
        if not isSmall then
            System.drawLine(x + 1, sy + 18, x + w - 2, sy + 18, CARD_BORDER)
        end
    end
end

local function drawButton(x, y, w, h, label, bgColor, textColor, sliceY)
    if not inSlice(y, h, sliceY) then return end
    local sy = y - sliceY

    System.fillRect(x, sy, w, h, bgColor)
    System.drawRect(x, sy, w, h, CARD_BORDER)
    System.setTextColor(textColor, bgColor)
    
    local textX = x + math.floor((w / 2) - (#label * 3))
    local textY = sy + math.floor((h / 2) - 4)
    System.drawString(label, textX > x and textX or x + 2, textY, 1)
end

local function drawProgressBar(x, y, w, h, percent, color, sliceY)
    if not inSlice(y, h, sliceY) then return end
    local sy = y - sliceY

    System.fillRect(x, sy, w, h, CARD_BORDER)
    local fillWidth = math.floor((w - 2) * (percent / 100))
    if fillWidth > 0 then
        System.fillRect(x + 1, sy + 1, fillWidth, h - 2, color)
    end
end

-- --- SEÇÃO 5: WORKLOADS DE ESTRESSE (CPU & MEMÓRIA) ---

local function runCpuWorkload(chunkSize)
    local ops = 0
    for i = 1, chunkSize do
        local val = math.sin(i) * math.cos(i) + math.sqrt(i + 1)
        local num = i + 1000
        local isPrime = true
        local d = 2
        while d * d <= num do
            if num % d == 0 then 
                isPrime = false 
                break 
            end
            d = d + 1
        end
        ops = ops + 2
    end
    return ops
end

local function runMemoryWorkload()
    local arr = {}
    local size = isSmall and 800 or 1500
    for i = 1, size do
        table.insert(arr, math.floor(math.random() * 10000))
    end
    table.sort(arr)
    
    local t_slice = {}
    for i = 1, 60 do
        if arr[i] then
            table.insert(t_slice, tostring(arr[i]))
        end
    end
    local str = table.concat(t_slice, "-")
    
    local splitArr = {}
    for match in string.gmatch(str, "[^-]+") do
        table.insert(splitArr, match)
    end
    
    return size + #splitArr
end

-- --- SEÇÃO 6: RENDERIZADORES DAS TELAS DE BENCHMARK ---

local function drawHeaderBar(sliceY)
    if not inSlice(0, headerH, sliceY) then return end
    local sy = 0 - sliceY

    System.fillRect(0, sy, 240, headerH, PANEL_DARK)
    System.drawLine(0, sy + headerH, 240, sy + headerH, CARD_BORDER)
    System.setTextColor(PRIMARY, PANEL_DARK)
    
    if isSmall then
        System.drawString("KryonBench v1.3", 6, sy + 4, 1)
        drawButton(198, 2, 38, 14, "X", DANGER, TEXT_MAIN, sliceY)
    else
        System.drawString("KryonBench", 10, sy + 8, 2)
        drawButton(195, 4, 40, 22, "X", DANGER, TEXT_MAIN, sliceY)
    end
end

local function drawStateReady(sliceY)
    if isSmall then
        -- Layout 240x135
        drawCard(6, 20, 228, 42, "BENCHMARK DE PERFORMANCE", sliceY)
        if inSlice(34, 20, sliceY) then
            System.setTextColor(TEXT_MAIN, CARD_BG)
            System.drawString("Teste de CPU, RAM e Render GPU.", 10, 34 - sliceY, 1)
        end

        drawCard(6, 64, 228, 42, "ESPECIFICACOES", sliceY)
        if inSlice(78, 20, sliceY) then
            System.setTextColor(CYAN, CARD_BG)
            System.drawString("SoC: ESP32 | Display: 240x135", 10, 78 - sliceY, 1)
        end

        drawButton(6, 108, 228, 22, "INICIAR TESTE [ESPACO/1]", SUCCESS, TEXT_MAIN, sliceY)
    else
        -- Layout 240x320
        drawCard(10, 40, 220, 85, "SOBRE O BENCHMARK", sliceY)
        if inSlice(62, 50, sliceY) then
            System.setTextColor(TEXT_MAIN, CARD_BG)
            System.drawString("Avalia o desempenho real do", 18, 62 - sliceY, 1)
            System.drawString("hardware sob carga maxima:", 18, 76 - sliceY, 1)
            System.setTextColor(CYAN, CARD_BG)
            System.drawString("- CPU (Floating Math & Primes)", 18, 92 - sliceY, 1)
            System.drawString("- RAM & Garbage Collector", 18, 104 - sliceY, 1)
        end

        drawCard(10, 135, 220, 100, "ESPECIFICACOES DO DISPOSITIVO", sliceY)
        if inSlice(158, 60, sliceY) then
            System.setTextColor(TEXT_MUTED, CARD_BG)
            System.drawString("SoC:", 20, 158 - sliceY, 1)
            System.drawString("Display:", 20, 175 - sliceY, 1)
            System.drawString("Lua Engine:", 20, 192 - sliceY, 1)
            System.drawString("GUI Framework:", 20, 209 - sliceY, 1)

            System.setTextColor(TEXT_MAIN, CARD_BG)
            System.drawString("ESP32 Dual-Core", 100, 158 - sliceY, 1)
            System.drawString("240x320 ST7789", 100, 175 - sliceY, 1)
            System.drawString("Lua Engine v5.4", 100, 192 - sliceY, 1)
            System.drawString("KryonOS Native", 100, 209 - sliceY, 1)
        end

        drawButton(20, 250, 200, 50, "INICIAR TESTE", SUCCESS, TEXT_MAIN, sliceY)
    end
end

local function drawStateTesting(sliceY)
    if isSmall then
        -- Layout 240x135
        drawCard(6, 20, 228, 110, "PROGRESSO DO TESTE", sliceY)

        if testPhase == 0 then
            if inSlice(34, 12, sliceY) then
                System.setTextColor(CYAN, CARD_BG)
                System.drawString("[1/3] CPU Math...", 10, 34 - sliceY, 1)
            end
            drawProgressBar(10, 48, 220, 10, testProgress, PRIMARY, sliceY)
        elseif testPhase == 1 then
            if inSlice(34, 12, sliceY) then
                System.setTextColor(WARNING, CARD_BG)
                System.drawString("[2/3] Memoria RAM...", 10, 34 - sliceY, 1)
            end
            drawProgressBar(10, 48, 220, 10, testProgress, WARNING, sliceY)
        elseif testPhase == 2 then
            if inSlice(34, 12, sliceY) then
                System.setTextColor(SUCCESS, CARD_BG)
                System.drawString("[3/3] Render GPU...", 10, 34 - sliceY, 1)
            end
            drawProgressBar(10, 48, 220, 8, testProgress, SUCCESS, sliceY)

            -- Moldura do Teste Gráfico em 135px
            if inSlice(65, 48, sliceY) then
                System.drawRect(20, 65 - sliceY, 200, 48, CARD_BORDER)
            end

            -- Renderização de Partículas
            for i = 1, #particles do
                local p = particles[i]
                local px = math.floor(p.x)
                local py = math.floor(p.y)

                if inSlice(py - 1, 3, sliceY) then
                    System.fillRect(px - 1, py - 1 - sliceY, 3, 3, p.color)
                end
            end
        end
    else
        -- Layout 240x320
        drawCard(10, 40, 220, 220, "PROGRESSO DO TESTE", sliceY)

        if testPhase == 0 then
            if inSlice(65, 12, sliceY) then
                System.setTextColor(CYAN, CARD_BG)
                System.drawString("[1/3] Testando CPU & Math...", 20, 65 - sliceY, 1)
            end
            drawProgressBar(20, 85, 200, 16, testProgress, PRIMARY, sliceY)
            if inSlice(115, 12, sliceY) then
                System.setTextColor(TEXT_MAIN, CARD_BG)
                System.drawString("Ops Calculadas: " .. metrics.mathOpsDone, 20, 115 - sliceY, 1)
            end
        elseif testPhase == 1 then
            if inSlice(65, 12, sliceY) then
                System.setTextColor(WARNING, CARD_BG)
                System.drawString("[2/3] Testando Memoria & RAM...", 20, 65 - sliceY, 1)
            end
            drawProgressBar(20, 85, 200, 16, testProgress, WARNING, sliceY)
            if inSlice(115, 12, sliceY) then
                System.setTextColor(TEXT_MAIN, CARD_BG)
                System.drawString("Alocacoes Lua: " .. metrics.arrayOpsDone, 20, 115 - sliceY, 1)
            end
        elseif testPhase == 2 then
            if inSlice(65, 12, sliceY) then
                System.setTextColor(SUCCESS, CARD_BG)
                System.drawString("[3/3] Testando Renderizacao GPU...", 20, 65 - sliceY, 1)
            end
            drawProgressBar(20, 85, 200, 12, testProgress, SUCCESS, sliceY)

            if inSlice(105, 140, sliceY) then
                System.drawRect(20, 105 - sliceY, 200, 140, CARD_BORDER)
            end

            for i = 1, #particles do
                local p = particles[i]
                local px = math.floor(p.x)
                local py = math.floor(p.y)

                if inSlice(py - 2, 5, sliceY) then
                    System.fillRect(px - 2, py - 2 - sliceY, 5, 5, p.color)
                end

                if i < #particles then
                    local pNext = particles[i + 1]
                    local pNextX = math.floor(pNext.x)
                    local pNextY = math.floor(pNext.y)
                    local dx = p.x - pNext.x
                    local dy = p.y - pNext.y

                    if (dx * dx + dy * dy) < 1600 then
                        local minY = math.min(py, pNextY)
                        local maxY = math.max(py, pNextY)
                        if inSlice(minY, (maxY - minY) + 1, sliceY) then
                            System.drawLine(px, py - sliceY, pNextX, pNextY - sliceY, CARD_BORDER)
                        end
                    end
                end
            end
        end

        if inSlice(275, 45, sliceY) then
            local sy = 275 - sliceY
            System.fillRect(0, sy, 240, 45, PANEL_DARK)
            System.setTextColor(TEXT_MUTED, PANEL_DARK)
            System.drawString("Executando testes...", 15, sy + 15, 1)
        end
    end
end

local function drawStateResults(sliceY)
    if isSmall then
        -- Layout 240x135
        drawCard(6, 20, 228, 42, "PONTUACAO TOTAL", sliceY)
        if inSlice(34, 20, sliceY) then
            System.setTextColor(SUCCESS, CARD_BG)
            System.drawString(scores.total .. " pts", 10, 34 - sliceY, 2)
        end

        drawCard(6, 64, 228, 42, "DETALHAMENTO", sliceY)
        if inSlice(78, 20, sliceY) then
            System.setTextColor(TEXT_MAIN, CARD_BG)
            System.drawString("CPU:" .. scores.cpu .. " | RAM:" .. scores.memory .. " | GPU:" .. scores.gpu, 10, 78 - sliceY, 1)
        end

        drawButton(6, 108, 228, 22, "RETESTAR [ESPACO/1]", PRIMARY, TEXT_MAIN, sliceY)
    else
        -- Layout 240x320
        drawCard(10, 38, 220, 75, "PONTUACAO TOTAL", sliceY)

        if inSlice(58, 45, sliceY) then
            System.setTextColor(SUCCESS, CARD_BG)
            System.drawString(scores.total .. " pts", 20, 58 - sliceY, 3)

            local rating = "Medio"
            local ratingColor = WARNING
            if scores.total > 2500 then 
                rating = "Excelente!" 
                ratingColor = SUCCESS 
            elseif scores.total < 1200 then 
                rating = "Modesto" 
                ratingColor = DANGER 
            end

            System.setTextColor(ratingColor, CARD_BG)
            System.drawString("Rating: " .. rating, 20, 92 - sliceY, 1)
        end

        drawCard(10, 120, 220, 125, "DETALHAMENTO", sliceY)

        if inSlice(140, 85, sliceY) then
            System.setTextColor(TEXT_MAIN, CARD_BG)
            System.drawString("CPU Score:", 20, 140 - sliceY, 1)
            System.setTextColor(CYAN, CARD_BG)
            System.drawString(scores.cpu .. " pts", 140, 140 - sliceY, 1)

            System.setTextColor(TEXT_MAIN, CARD_BG)
            System.drawString("RAM Score:", 20, 162 - sliceY, 1)
            System.setTextColor(WARNING, CARD_BG)
            System.drawString(scores.memory .. " pts", 140, 162 - sliceY, 1)

            System.setTextColor(TEXT_MAIN, CARD_BG)
            System.drawString("GPU / FPS:", 20, 184 - sliceY, 1)
            System.setTextColor(SUCCESS, CARD_BG)
            System.drawString(scores.gpu .. " pts (" .. metrics.avgFps .. " FPS)", 125, 184 - sliceY, 1)

            System.setTextColor(TEXT_MUTED, CARD_BG)
            System.drawString("Tempo do Teste: " .. math.floor((getTimeMs() - testStartTime) / 1000) .. "s", 20, 215 - sliceY, 1)
        end

        drawButton(20, 255, 200, 45, "RETESTAR", PRIMARY, TEXT_MAIN, sliceY)
    end
end

-- --- SEÇÃO 7: PROCESSAMENTO DE ENTRADAS (TOUCH E TECLADO System.getChar) ---

local function startTestSequence()
    currentState = STATE_TESTING
    testPhase = 0
    testProgress = 0
    metrics.mathOpsDone = 0
    metrics.arrayOpsDone = 0
    metrics.totalFrames = 0
    metrics.cpuTimeMs = 0
    metrics.ramTimeMs = 0
    testStartTime = getTimeMs()
end

local function processKeyboardInput()
    if type(System.getChar) == "function" then
        local ch = System.getChar()
        if ch ~= nil and ch ~= "" and ch ~= 0 then
            local strCh = tostring(ch)
            local code = type(ch) == "number" and ch or string.byte(strCh)

            -- Tecla 'x', 'X' ou ESC (27) -> Sair/Reiniciar
            if strCh == "x" or strCh == "X" or code == 27 then
                System.restart()
                return
            end

            -- Alternar telas via Teclado (Espaço, Enter, TAB, '1', 's', 'r')
            if currentState == STATE_READY then
                if strCh == " " or strCh == "s" or strCh == "S" or strCh == "1" or code == 13 or code == 9 then
                    startTestSequence()
                end
            elseif currentState == STATE_RESULTS then
                if strCh == " " or strCh == "r" or strCh == "R" or strCh == "1" or code == 13 or code == 9 then
                    currentState = STATE_READY
                end
            end
        end
    end
end

local function handleInput(isClick, tx, ty)
    if not isClick then return end

    -- Botão Sair (X)
    local closeXMin = isSmall and 198 or 195
    local closeYMax = isSmall and 18 or 26
    if tx >= closeXMin and ty <= closeYMax then
        System.restart()
        return
    end

    if currentState == STATE_READY then
        local btnYMin = isSmall and 108 or 250
        local btnYMax = isSmall and 130 or 300
        if ty >= btnYMin and ty <= btnYMax then
            startTestSequence()
        end
    elseif currentState == STATE_RESULTS then
        local btnYMin = isSmall and 108 or 255
        local btnYMax = isSmall and 130 or 300
        if ty >= btnYMin and ty <= btnYMax then
            currentState = STATE_READY
        end
    end
end

local function updateState()
    if currentState ~= STATE_TESTING then return end

    -- --- FASE 0: TESTE DE CPU ---
    if testPhase == 0 then
        local cpuStart = getTimeMs()
        metrics.mathOpsDone = metrics.mathOpsDone + runCpuWorkload(isSmall and 2000 or 4000)
        metrics.cpuTimeMs = metrics.cpuTimeMs + (getTimeMs() - cpuStart)

        testProgress = testProgress + 5
        if testProgress >= 33 then
            testPhase = 1
        end

    -- --- FASE 1: TESTE DE MEMÓRIA & RAM ---
    elseif testPhase == 1 then
        local ramStart = getTimeMs()
        metrics.arrayOpsDone = metrics.arrayOpsDone + runMemoryWorkload()
        metrics.ramTimeMs = metrics.ramTimeMs + (getTimeMs() - ramStart)

        testProgress = testProgress + 4
        if testProgress >= 66 then
            testPhase = 2
            frameStart = getTimeMs()
        end

    -- --- FASE 2: TESTE GRÁFICO / GPU & PARTÍCULAS ---
    elseif testPhase == 2 then
        testProgress = testProgress + 1

        -- Atualização das partículas adaptada ao tamanho
        for i = 1, #particles do
            local p = particles[i]
            p.x = p.x + p.vx
            p.y = p.y + p.vy

            -- Limites da caixa física
            if p.x <= 22 or p.x >= 216 then p.vx = -p.vx end
            if p.y <= minYBound or p.y >= maxYBound then p.vy = -p.vy end
        end

        metrics.totalFrames = metrics.totalFrames + 1

        if testProgress >= 100 then
            local gpuTotalTimeSec = (getTimeMs() - frameStart) / 1000
            metrics.avgFps = math.floor(metrics.totalFrames / (gpuTotalTimeSec > 0 and gpuTotalTimeSec or 1))

            -- Cálculo final dos Scores
            scores.cpu    = math.floor((metrics.mathOpsDone / (metrics.cpuTimeMs > 0 and metrics.cpuTimeMs or 1)) * 12)
            scores.memory = math.floor((metrics.arrayOpsDone / (metrics.ramTimeMs > 0 and metrics.ramTimeMs or 1)) * 45)
            scores.gpu    = math.floor(metrics.avgFps * 85)
            scores.total  = math.floor((scores.cpu * 0.4) + (scores.memory * 0.3) + (scores.gpu * 0.3))

            currentState = STATE_RESULTS
        end
    end
end

-- --- SEÇÃO 8: LOOP PRINCIPAL DE RENDERIZAÇÃO ---

while true do
    -- 1. Leitura de Teclado (System.getChar)
    processKeyboardInput()

    -- 2. Leitura de Toque e Debounce
    local touch = System.getTouch()
    local isClick = touch and touch.touched and not lastTouch
    lastTouch = touch and touch.touched or false

    local touchX = touch and touch.x or 0
    local touchY = touch and touch.y or 0

    -- 3. Processa Lógica e Inputs
    handleInput(isClick, touchX, touchY)
    updateState()

    -- 4. Loop de Renderização Fatiada (Slice Buffer)
    for slice = 0, numSlices - 1 do
        local sliceY = slice * sliceH

        System.bindSprite(true)
        System.fillScreen(BG_MAIN)

        -- Renderiza Barra Superior
        drawHeaderBar(sliceY)

        -- Renderiza Tela Correspondente ao Estado
        if currentState == STATE_READY then
            drawStateReady(sliceY)
        elseif currentState == STATE_TESTING then
            drawStateTesting(sliceY)
        elseif currentState == STATE_RESULTS then
            drawStateResults(sliceY)
        end

        System.bindSprite(false)
        System.pushSprite(0, sliceY)
    end

    -- 5. Sincronização de Quadros (~30 FPS)
    System.delay(33)
end