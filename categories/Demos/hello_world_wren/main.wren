// Hello World Test App
// KryonOS Wren

var width = Display.screenWidth()
var height = Display.screenHeight()

var BLUE = 0x001F
var WHITE = 0xFFFF
var RED = 0xF800

Display.fillScreen(BLUE)
Display.setTextColor(WHITE, BLUE)
Display.setTextSize(1)

Display.drawString("Hello from KryonOS Wren!", 10, 15, 2)

if (height >= 200) {
    Display.drawString("Wren is working!", 10, 50, 2)
    Display.drawString("This is running natively", 10, 80, 2)
    Display.drawString("on your ESP32!", 10, 110, 2)
} else {
    Display.drawString("Wren is working!", 10, 45, 2)
    Display.drawString("Running natively on ESP32", 10, 70, 2)
}

// Botão de saída
var exitX = width - 45
var exitY = 5
var exitW = 40
var exitH = 25

Display.fillRoundRect(exitX, exitY, exitW, exitH, 5, RED)
Display.setTextColor(WHITE, RED)
Display.drawString("X", width - 31, 11, 2)

Display.setTextColor(WHITE, BLUE)

while (true) {
    // Touchscreen
    var touch = Input.getTouch()

    if (touch == null) {
        // Área de saída (topo direito) foi tocada
        break
    }

    // Keyboard
    var key = Input.getKey()
    if (key == "ESC") {
        break
    }

    // Character input
    var character = Input.getChar()

    // Kernel / GC
    Harix.delay(10)
}