// HarixOS Custom JS Calculator
// High-performance Android-style touch calculator

var SW = Display.screenWidth();
var SH = Display.screenHeight();

var expression = "";
var result = "";
var lastTouch = false;

// UI Colors
var BG_COLOR = 0x18E3; // Dark UI background
var BTN_NUM = 0x3186;  // Dark Grey
var BTN_OP = 0x03FF;   // Cyan/Blue
var BTN_EQUAL = 0xFA20; // Orange
var BTN_CLEAR = 0xF800; // Red
var TEXT_COLOR = 0xFFFF; // White

var buttons = [
    { l: "C",   r: 0, c: 0, type: "clear" },
    { l: "(",   r: 0, c: 1, type: "op" },
    { l: ")",   r: 0, c: 2, type: "op" },
    { l: "/",   r: 0, c: 3, type: "op" },
    
    { l: "7",   r: 1, c: 0, type: "num" },
    { l: "8",   r: 1, c: 1, type: "num" },
    { l: "9",   r: 1, c: 2, type: "num" },
    { l: "*",   r: 1, c: 3, type: "op" },
    
    { l: "4",   r: 2, c: 0, type: "num" },
    { l: "5",   r: 2, c: 1, type: "num" },
    { l: "6",   r: 2, c: 2, type: "num" },
    { l: "-",   r: 2, c: 3, type: "op" },
    
    { l: "1",   r: 3, c: 0, type: "num" },
    { l: "2",   r: 3, c: 1, type: "num" },
    { l: "3",   r: 3, c: 2, type: "num" },
    { l: "+",   r: 3, c: 3, type: "op" },
    
    { l: "0",   r: 4, c: 0, type: "num" },
    { l: ".",   r: 4, c: 1, type: "num" },
    { l: "DEL", r: 4, c: 2, type: "del" },
    { l: "=",   r: 4, c: 3, type: "eq" }
];

var btnW = 50;
var btnH = 40;
var spacing = 6;
var startX = 12;
var startY = 100;

function drawUI() {
    Display.fillScreen(BG_COLOR);
    
    // Display Screen Area
    Display.fillRoundRect(10, 10, SW - 20, 80, 5, 0x0000); // Black screen
    Display.drawRoundRect(10, 10, SW - 20, 80, 5, 0x7BEF); // Border
    
    drawDisplay();

    // Draw Buttons
    for (var i = 0; i < buttons.length; i++) {
        var b = buttons[i];
        var bx = startX + (b.c * (btnW + spacing));
        var by = startY + (b.r * (btnH + spacing));
        
        var color = BTN_NUM;
        if (b.type === "op") color = BTN_OP;
        if (b.type === "clear" || b.type === "del") color = BTN_CLEAR;
        if (b.type === "eq") color = BTN_EQUAL;
        
        Display.fillRoundRect(bx, by, btnW, btnH, 8, color);
        
        // Center text roughly
        var tx = bx + (btnW / 2);
        var ty = by + 12;
        if (b.l === "DEL") {
            tx -= 15;
            Display.setTextColor(TEXT_COLOR, color);
            Display.drawString(b.l, tx, ty, 2);
        } else {
            tx -= 8;
            Display.setTextColor(TEXT_COLOR, color);
            Display.drawString(b.l, tx, ty, 4);
        }
    }
}

function drawDisplay() {
    // Clear display area
    Display.fillRoundRect(12, 12, SW - 24, 76, 5, 0x0000);
    
    Display.setTextColor(TEXT_COLOR, 0x0000);
    
    // Expression
    if (expression.length > 15) {
        Display.drawString(expression.substring(expression.length - 15), 18, 20, 4);
    } else {
        Display.drawString(expression, 18, 20, 4);
    }
    
    // Result
    Display.setTextColor(0x7BEF, 0x0000); // Light blue for result
    Display.drawString(result, 18, 55, 4);
}

function handleButton(b) {
    if (b.type === "num" || b.type === "op") {
        expression += b.l;
    } 
    else if (b.type === "clear") {
        expression = "";
        result = "";
    } 
    else if (b.type === "del") {
        if (expression.length > 0) {
            expression = expression.substring(0, expression.length - 1);
        }
    } 
    else if (b.type === "eq") {
        try {
            var evalRes = eval(expression);
            result = "= " + String(evalRes);
        } catch (e) {
            result = "Error";
        }
    }
    
    drawDisplay();
}

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
    
    if (isTapped && t.y >= startY && t.x < SW - 40) { // Avoid OS close button area
        // Calculate which button was pressed
        for (var i = 0; i < buttons.length; i++) {
            var b = buttons[i];
            var bx = startX + (b.c * (btnW + spacing));
            var by = startY + (b.r * (btnH + spacing));
            
            if (t.x >= bx && t.x <= bx + btnW && t.y >= by && t.y <= by + btnH) {
                // Button Press Animation
                Display.drawRoundRect(bx, by, btnW, btnH, 8, TEXT_COLOR);
                Harix.delay(50);
                Display.drawRoundRect(bx, by, btnW, btnH, 8, BG_COLOR); // remove highlight
                
                handleButton(b);
                break;
            }
        }
    }
    
    lastTouch = t.touched;
    Harix.delay(15);
}

// Cleanup
Display.fillScreen(BG_COLOR);