// HarixOS Paint App
// Demonstrates touch input, color picking, and drawing primitives!

// Define layout
var PALETTE_HEIGHT = 40;
var SW = Display.screenWidth();
var SH = Display.screenHeight();

// Colors available
var RED = 0xF800;
var GREEN = 0x07E0;
var BLUE = 0x001F;
var YELLOW = 0xFFE0;
var WHITE = 0xFFFF;
var BLACK = 0x0000;
var DARKGREY = 0x7BEF;

var colors = [RED, GREEN, BLUE, YELLOW, WHITE];
var selectedColor = WHITE;

// Draw initial UI
function drawUI() {
    Display.fillScreen(BLACK);
    
    // Draw palette bar
    Display.fillRect(0, 0, SW, PALETTE_HEIGHT, DARKGREY);
    
    // Draw color buttons
    var btnWidth = SW / (colors.length + 1); // +1 for clear button
    for (var i = 0; i < colors.length; i++) {
        var cx = i * btnWidth;
        Display.fillRect(cx + 2, 2, btnWidth - 4, PALETTE_HEIGHT - 4, colors[i]);
        
        // Highlight selected
        if (colors[i] === selectedColor) {
            Display.drawRect(cx, 0, btnWidth, PALETTE_HEIGHT, WHITE);
            Display.drawRect(cx + 1, 1, btnWidth - 2, PALETTE_HEIGHT - 2, WHITE);
        }
    }
    
    // Draw clear button
    var clearX = colors.length * btnWidth;
    Display.fillRect(clearX + 2, 2, btnWidth - 4, PALETTE_HEIGHT - 4, BLACK);
    Display.drawRect(clearX + 2, 2, btnWidth - 4, PALETTE_HEIGHT - 4, WHITE);
    Display.setTextColor(WHITE, BLACK);
    Display.drawString("CLR", clearX + 8, 12, 2);
}

drawUI();

// Main interaction loop
while (true) {
    var touch = Input.getTouch();
    
    // Check for exit condition (top-right corner)
    if (touch.touched && touch.x >= SW - 40 && touch.y <= 40) {
        break;
    }
    
    // Check for ESC key
    var key = Input.getKey();
    if (key === "ESC") {
        break;
    }
    
    if (touch.touched && touch.x < SW - 40) { // Avoid OS close button area
        if (touch.y < PALETTE_HEIGHT) {
            // Touched the palette area
            var btnWidth = SW / (colors.length + 1);
            var idx = Math.floor(touch.x / btnWidth);
            
            if (idx < colors.length) {
                // Changed color
                selectedColor = colors[idx];
                drawUI(); // Redraw UI to update highlight
                Harix.delay(200); // Debounce
            } else if (idx === colors.length) {
                // Clear canvas
                drawUI(); 
                Harix.delay(200); // Debounce
            }
        } else {
            // Touched the canvas area! Draw!
            Display.fillCircle(touch.x, touch.y, 4, selectedColor);
        }
    }
    
    Harix.delay(10); // Yield to prevent lockup
}

// Cleanup
Display.fillScreen(BLACK);