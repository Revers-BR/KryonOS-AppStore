-- Hello World Test App
-- KryonOS Lua 5.1
-- Compatível com telas 240x320 e 240x135
--
-- Sair:
--   • Toque no X no canto superior direito
--   • Tecla ESC

local width = System.screenWidth()
local height = System.screenHeight()

local BLUE = 0x001F
local WHITE = 0xFFFF
local RED = 0xF800

-- Limpa a tela
System.fillScreen(BLUE)

-- Configuração do texto
System.setTextColor(WHITE, BLUE)
System.setTextSize(1)

-- Título
System.drawString(
    "Hello from KryonOS Lua!",
    10,
    15
)

-- Layout adaptativo
if height >= 200 then

    -- Tela 240x320
    System.drawString(
        "Lua is working!",
        10,
        50
    )

    System.drawString(
        "This is running natively",
        10,
        80
    )

    System.drawString(
        "on your ESP32!",
        10,
        110
    )

else

    -- Tela 240x135
    System.drawString(
        "Lua is working!",
        10,
        45
    )

    System.drawString(
        "Running natively on ESP32",
        10,
        70
    )

end

-- Botão de saída
local exitX = width - 45
local exitY = 5
local exitW = 40
local exitH = 25

System.fillRoundRect(
    exitX,
    exitY,
    exitW,
    exitH,
    5,
    RED
)

System.setTextColor(WHITE, RED)

System.drawString(
    "X",
    width - 31,
    11
)

-- Volta para as cores normais
System.setTextColor(WHITE, BLUE)

-- Loop principal
while true do

    ------------------------------------------------
    -- TOUCHSCREEN
    ------------------------------------------------

    local touch = System.getTouch()

    if touch.touched then

        -- Canto superior direito = sair
        if touch.x >= width - 40 and
           touch.y <= 40 then

            break
        end

    end

    ------------------------------------------------
    -- KEYBOARD
    ------------------------------------------------

    local key = System.getKey()

    -- ESC = sair
    if key == "ESC" then
        break
    end

    ------------------------------------------------
    -- CHARACTER INPUT
    ------------------------------------------------

    local char = System.getChar()

    if char ~= "" then
        -- Entrada de caracteres disponível.
        -- Não é necessária para este Hello World.
    end

    ------------------------------------------------
    -- KERNEL / GARBAGE COLLECTION
    ------------------------------------------------

    System.delay(10)

end

------------------------------------------------
-- CLEANUP
------------------------------------------------

System.fillScreen(BLUE)