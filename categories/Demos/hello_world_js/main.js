// Hello World Test App
// Compatível com telas 240x320 e 240x135
// Toque no canto superior direito para fechar
// Teclado também pode solicitar o fechamento

var width = Display.screenWidth();
var height = Display.screenHeight();

var BLUE = 0x001F;
var WHITE = 0xFFFF;
var RED = 0xF800;

// Limpa a tela
Display.fillScreen(BLUE);

// Configura texto
Display.setTextColor(WHITE, BLUE);
Display.setTextSize(1);

// Título
Display.drawString("Hello from HarixOS JS!", 10, 15);

// Ajusta o conteúdo conforme a altura da tela
if (height >= 200) {
    Display.drawString("JavaScript is working!", 10, 45);
    Display.drawString("This is running natively", 10, 75);
    Display.drawString("on your ESP32!", 10, 105);

    // Área visual do botão de saída
    Display.fillRoundRect(width - 45, 5, 40, 25, 5, RED);
    Display.setTextColor(WHITE, RED);
    Display.drawString("X", width - 31, 11);
} else {
    // Layout compacto para 240x135
    Display.drawString("JavaScript is working!", 10, 45);
    Display.drawString("Running natively on ESP32", 10, 70);

    // Botão de saída
    Display.fillRoundRect(width - 45, 5, 40, 25, 5, RED);
    Display.setTextColor(WHITE, RED);
    Display.drawString("X", width - 31, 11);
}

// Volta para a cor normal do texto
Display.setTextColor(WHITE, BLUE);

// Loop principal.
// É IMPORTANTE chamar getTouch() para que o sistema possa
// detectar o toque e permitir o fechamento do aplicativo.
while (true) {

    // Verifica touchscreen
    var touch = Input.getTouch();

    if (touch.touched) {
        // Botão X no canto superior direito
        if (touch.x >= width - 45 && touch.y <= 35) {
            break;
        }
    }

    // Verifica teclado
    var key = Input.getKey();
    
    if (key === "ESC") {
        break;
    }

    // Verifica entrada de caracteres
    var character = Input.getChar();
    
    if (character !== "") {
        // ESC / Q / q = sair
        if (character === "\x1B" || character === "q" || character === "Q") {
            break;
        }
    }

    // Necessário para não travar o kernel e permitir GC.
    Harix.delay(10);
}