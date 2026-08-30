// Hello World Test App
// Compatível com telas 240x320 e 240x135
// Toque no canto superior direito para fechar
// Teclado também pode solicitar o fechamento

var width = System.screenWidth();
var height = System.screenHeight();

var BLUE = 0x001F;
var WHITE = 0xFFFF;

// Limpa a tela
System.fillScreen(BLUE);

// Configura texto
System.setTextColor(WHITE, BLUE);
System.setTextSize(1);

// Título
System.drawString("Hello from HarixOS JS!", 10, 15);

// Ajusta o conteúdo conforme a altura da tela
if (height >= 200) {
    System.drawString("JavaScript is working!", 10, 45);
    System.drawString("This is running natively", 10, 75);
    System.drawString("on your ESP32!", 10, 105);

    // Área visual do botão de saída
    System.fillRoundRect(width - 45, 5, 40, 25, 5, 0xF800);
    System.setTextColor(WHITE, 0xF800);
    System.drawString("X", width - 31, 11);
} else {
    // Layout compacto para 240x135
    System.drawString("JavaScript is working!", 10, 45);
    System.drawString("Running natively on ESP32", 10, 70);

    // Botão de saída
    System.fillRoundRect(width - 45, 5, 40, 25, 5, 0xF800);
    System.setTextColor(WHITE, 0xF800);
    System.drawString("X", width - 31, 11);
}

// Volta para a cor normal do texto
System.setTextColor(WHITE, BLUE);

// Loop principal.
// É IMPORTANTE chamar getTouch() para que o sistema possa
// detectar o toque e permitir o fechamento do aplicativo.
while (true) {

    // Verifica touchscreen
    var touch = System.getTouch();

    if (touch.touched) {

        // Botão X no canto superior direito
        if (touch.x >= width - 45 && touch.y <= 35) {
            break;
        }
    }

    // Verifica teclado.
    // O caractere recebido pode ser usado pelo kernel
    // como evento de saída.
    var key = System.getChar();

    if (key !== undefined && key !== null) {

        // ESC / Q / q = sair
        if (key === 27 || key === "q" || key === "Q") {
            break;
        }
    }

    // Necessário para não travar o kernel e permitir GC.
    System.delay(10);
}

// Ao sair do loop, o script termina.
// O KryonOS/HarixOS pode então devolver o controle ao sistema.
System.fillScreen(BLUE);