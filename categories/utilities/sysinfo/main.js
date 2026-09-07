var C_BG = 0x0000;
var C_TEXT = 0xFFFF;
var C_ACCENT = 0x07E0; // Green

Display.fillScreen(C_BG);
Display.setTextColor(C_TEXT, C_BG);
Display.drawString("System Information", 10, 10, 2);
Display.drawLine(10, 30, 230, 30, C_ACCENT);

var info = Harix.getInfo();

var y = 45;
var spacing = 20;

function drawRow(label, value) {
    Display.setTextColor(C_ACCENT, C_BG);
    Display.drawString(label + ":", 10, y, 2);
    Display.setTextColor(C_TEXT, C_BG);
    Display.drawString(value, 110, y, 2);
    y += spacing;
}

drawRow("Chip Model", info.chipModel);
drawRow("Cores", "" + info.chipCores);
drawRow("Revision", "" + info.chipRevision);
drawRow("CPU Freq", info.cpuFreqMHz + " MHz");
y += 5; // Extra space
drawRow("Total RAM", info.totalRAM + " B");
drawRow("Free RAM", info.freeRAM + " B");
drawRow("Min Free RAM", info.minFreeRAM + " B");
drawRow("Max Alloc", info.maxAllocRAM + " B");
drawRow("Flash Size", info.flashSize + " B");
drawRow("Uptime", (info.uptimeMs / 1000).toFixed(1) + " sec");

// Wait for touch to exit
while (true) {
    var touch = Input.getTouch();
    
    // Check for exit condition (top-right corner)
    if (touch.touched && touch.x >= Display.screenWidth() - 40 && touch.y <= 40) {
        break;
    }
    
    // Check for ESC key
    var key = Input.getKey();
    if (key === "ESC") {
        break;
    }
    
    // Check for any touch to exit (as originally intended)
    if (touch.touched && touch.x < Display.screenWidth() - 40) {
        break;
    }
    
    Harix.delay(10);
}

// Cleanup
Display.fillScreen(C_BG);