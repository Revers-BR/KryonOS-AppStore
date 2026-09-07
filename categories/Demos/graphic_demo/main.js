// Graphic Demo
// Draws random rectangles and colors

Display.fillScreen(0x0000); // TFT_BLACK

// Draw random rectangles
for (var i = 0; i < 50; i++) {
    var x = Math.floor(Math.random() * (Display.screenWidth() - 60));
    var y = Math.floor(Math.random() * (Display.screenHeight() - 60));
    var w = Math.floor(10 + Math.random() * 50);
    var h = Math.floor(10 + Math.random() * 50);
    
    // Generate a random 16-bit RGB565 color
    var color = Math.floor(Math.random() * 65535);
    
    Display.fillRect(x, y, w, h, color);
}

var y_pos = Display.screenHeight() - 20;
Display.drawString("Graphics Demo Finished!", 10, y_pos);
Display.drawString("Touch top-right to exit", 10, y_pos - 20);

// Application loop for input polling
while (true) {
    var touch = Input.getTouch();
    
    if (touch.touched &&
        touch.x >= Display.screenWidth() - 40 &&
        touch.y <= 40) {
        break;
    }
    
    var key = Input.getKey();
    if (key === "ESC") {
        break;
    }
    
    Harix.delay(10);
}