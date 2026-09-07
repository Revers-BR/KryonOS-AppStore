// HarixOS Hardware Thermals Monitor
// Displays real-time ESP32 internal CPU core temperature

var SW = Display.screenWidth();
var SH = Display.screenHeight();

// UI Colors
var C_BG = 0x0000;       // Black
var C_TEXT = 0xFFFF;     // White
var C_RED = 0xF800;      // Hot
var C_GREEN = 0x07E0;    // Normal
var C_BLUE = 0x001F;     // Cold
var C_GREY = 0x3186;     // Frame

function mapColor(tempC) {
    if (tempC < 30) return C_BLUE;
    if (tempC > 65) return C_RED;
    return C_GREEN;
}

// Initial Sensor Check
var hasSensor = Harix.hasTemperatureSensor();

if (!hasSensor) {
    Display.fillScreen(C_BG);
    Display.setTextColor(C_RED, C_BG);
    Display.drawString("UNSUPPORTED", 40, 50, 4);
    
    Display.setTextColor(C_TEXT, C_BG);
    Display.drawString("This specific ESP32 chip", 10, 100, 2);
    Display.drawString("revision does not have", 10, 120, 2);
    Display.drawString("a physical thermal sensor.", 10, 140, 2);
    
    Display.drawString("Tap to exit...", 60, 200, 2);
    
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
        
        // Check for any touch to exit
        if (touch.touched && touch.x < SW - 40) {
            break;
        }
        
        Harix.delay(50);
    }
} else {
    // Sensor Supported - Run App
    Display.fillScreen(C_BG);
    
    // Header
    Display.setTextColor(0x07FF, C_BG); // Cyan
    Display.drawString("THERMAL MONITOR", 20, 20, 4);
    
    // Draw Thermometer Outline
    Display.drawRoundRect(90, 80, 60, 160, 10, C_GREY);
    Display.fillCircle(120, 240, 40, C_GREY); // Bulb outline
    Display.fillCircle(120, 240, 36, C_BG);   // Bulb inner
    Display.fillRect(92, 230, 56, 15, C_BG);  // Connect pipe to bulb
    
    var maxTemp = -999;
    var lastUpdate = 0;
    
    while (true) {
        var now = Harix.millis();
        
        // Check for exit condition (top-right corner)
        var touchExit = Input.getTouch();
        if (touchExit.touched && touchExit.x >= SW - 40 && touchExit.y <= 40) {
            break;
        }
        
        // Check for ESC key
        var keyExit = Input.getKey();
        if (keyExit === "ESC") {
            break;
        }
        
        // Update display every 500ms
        if (now - lastUpdate > 500) {
            var temp = Harix.getTemperature();
            
            if (temp > maxTemp) maxTemp = temp;
            
            var tColor = mapColor(temp);
            
            // Draw Bulb
            Display.fillCircle(120, 240, 34, tColor);
            
            // Map temperature (0C to 80C) to bar height (0 to 140 pixels)
            var barHeight = Math.floor((temp / 80.0) * 140);
            if (barHeight < 0) barHeight = 0;
            if (barHeight > 140) barHeight = 140;
            
            // Clear pipe
            Display.fillRect(95, 85, 50, 140, C_BG);
            
            // Fill pipe
            Display.fillRect(95, 225 - barHeight, 50, barHeight, tColor);
            
            // Display numbers
            Display.setTextColor(tColor, C_BG);
            // Quick hack to clear previous text by overwriting with spaces or drawing a black box
            Display.fillRect(10, 280, 220, 30, C_BG); 
            Display.drawString("Core: " + Math.floor(temp) + " C", 20, 280, 4);
            
            Display.setTextColor(C_TEXT, C_BG);
            Display.fillRect(160, 120, 70, 40, C_BG);
            Display.drawString("MAX", 170, 120, 2);
            Display.setTextColor(C_RED, C_BG);
            Display.drawString(Math.floor(maxTemp) + " C", 170, 140, 2);
            
            lastUpdate = now;
        }
        
        Harix.delay(20);
    }
}

// Cleanup
Display.fillScreen(C_BG);