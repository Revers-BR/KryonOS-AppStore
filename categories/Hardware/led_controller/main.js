// HarixOS Hardware LED Controller
// Demonstrates direct GPIO hardware control from JavaScript

var SW = Display.screenWidth();
var SH = Display.screenHeight();

// Standard ESP32 onboard blue LED is usually on GPIO 2
var LED_PIN = 2; 

// Initialize the physical hardware pin as an OUTPUT
GPIO.pinMode(LED_PIN, GPIO.OUTPUT);

var ledState = false;
var lastTouch = false;

function applyState() {
    if (ledState) {
        GPIO.digitalWrite(LED_PIN, GPIO.HIGH); // 3.3v Output
    } else {
        GPIO.digitalWrite(LED_PIN, GPIO.LOW);  // 0v Output
    }
}

function drawUI() {
    Display.fillScreen(0x0000); // Deep Black
    
    // Header
    Display.setTextColor(0x07FF, 0x0000); // Cyan
    Display.drawString("HARDWARE CONTROL", 10, 20, 4);
    Display.setTextColor(0xFFFF, 0x0000);
    Display.drawString("GPIO Pin 2 (Onboard LED)", 20, 50, 2);
    
    // Main Power Button
    var btnColor = ledState ? 0x07E0 : 0xF800; // Green if ON, Red if OFF
    Display.fillRoundRect(40, 100, 160, 120, 15, btnColor);
    Display.drawRoundRect(40, 100, 160, 120, 15, 0xFFFF); // White border
    
    // Button Text
    Display.setTextColor(0xFFFF, btnColor);
    var text = ledState ? "POWER OFF" : "POWER ON";
    Display.drawString(text, 60, 145, 4);
    
    // Instruction Footer
    Display.setTextColor(0x7BEF, 0x0000);
    Display.drawString("Tap the big button to physically", 15, 260, 2);
    Display.drawString("toggle the blue LED on your ESP32!", 15, 280, 2);
}

// Set initial state to OFF
applyState();
drawUI();

while (true) {
    var t = Input.getTouch();
    
    // Check for exit condition (top-right corner)
    if (t.touched && t.x >= SW - 40 && t.y <= 40) {
        break;
    }
    
    // Check for ESC key
    var key = Input.getKey();
    if (key === "ESC") {
        break;
    }
    
    var isTapped = t.touched && !lastTouch;
    
    if (isTapped && t.x < SW - 40) { // Avoid OS close button area
        // Did they tap inside the Power Button box?
        if (t.x >= 40 && t.x <= 200 && t.y >= 100 && t.y <= 220) {
            
            // Toggle the state
            ledState = !ledState;
            
            // Send the electrical signal to the physical pin!
            applyState();
            
            // Visual click feedback (flash the button border yellow)
            Display.drawRoundRect(40, 100, 160, 120, 15, 0xFFE0);
            Harix.delay(60);
            
            // Redraw the UI with the new color
            drawUI();
        }
    }
    
    lastTouch = t.touched;
    
    // Required system yield for Garbage Collection & touch polling
    Harix.delay(20); 
}

// Cleanup - turn off LED when exiting
GPIO.digitalWrite(LED_PIN, GPIO.LOW);
Display.fillScreen(0x0000);