// HarixOS Notepad App
// An interactive text editor with custom saving to FileSystem

var SW = Display.screenWidth();
var SH = Display.screenHeight();

var content = "";
var STATE_EDIT = 0;
var STATE_SAVE_DRIVE = 1;

var state = STATE_EDIT;
var lastTouch = false;

var saveDrive = "";

// Colors
var C_PAPER = 0xFFFF; // White
var C_TEXT = 0x0000; // Black
var C_HEADER = 0xF800; // Red
var C_BTN_SAVE = 0x07E0; // Green
var C_BTN_CLR = 0xFA20; // Orange

function drawEdit() {
    Display.fillScreen(C_PAPER);
    
    // Header Bar
    Display.fillRoundRect(0, 0, SW, 40, 0, C_HEADER);
    Display.setTextColor(0xFFFF, C_HEADER);
    Display.drawString("Notepad", 80, 10, 4);
    
    // CLEAR Button
    Display.fillRoundRect(5, 5, 60, 30, 4, C_BTN_CLR);
    Display.setTextColor(0x0000, C_BTN_CLR);
    Display.drawString("CLEAR", 15, 12, 2);
    
    // SAVE Button
    Display.fillRoundRect(SW - 65, 5, 60, 30, 4, C_BTN_SAVE);
    Display.setTextColor(0x0000, C_BTN_SAVE);
    Display.drawString("SAVE", SW - 52, 12, 2);
    
    // Drawing Content Text
    Display.setTextColor(C_TEXT, C_PAPER);
    
    if (content.length === 0) {
        Display.setTextColor(0xC618, C_PAPER); // Light grey text
        Display.drawString("Tap anywhere on the paper", 10, 50, 2);
        Display.drawString("to start typing...", 10, 70, 2);
    } else {
        var disp = content;
        if (disp.length > 500) disp = disp.substring(0, 500) + "..."; // Prevent massive render lag
        
        var y = 50;
        var charsPerLine = 26; 
        
        // Custom simple word-wrap logic
        for (var i = 0; i < disp.length; i += charsPerLine) {
            Display.drawString(disp.substring(i, i + charsPerLine), 10, y, 2);
            y += 20;
            if (y > SH - 20) break; // Don't draw offscreen
        }
    }
}

function drawSaveDrive() {
    Display.fillScreen(0x0000);
    Display.setTextColor(0xFFFF, 0x0000);
    Display.drawString("Select Save Drive", 30, 50, 4);
    
    // Internal Flash Button
    Display.fillRoundRect(40, 100, 160, 50, 8, 0x01cf);
    Display.setTextColor(0xFFFF, 0x01cf);
    Display.drawString("Internal Flash", 60, 110, 2);
    Display.drawString("(/local)", 90, 130, 2);
    
    // SD Card Button
    Display.fillRoundRect(40, 170, 160, 50, 8, 0x18e3);
    Display.setTextColor(0xFFFF, 0x18e3);
    Display.drawString("SD Card", 90, 180, 2);
    Display.drawString("(/sd)", 100, 200, 2);
    
    // Cancel Button
    Display.fillRoundRect(80, 240, 80, 35, 4, C_HEADER);
    Display.setTextColor(0xFFFF, C_HEADER);
    Display.drawString("CANCEL", 95, 250, 2);
}

drawEdit();

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
        if (state === STATE_EDIT) {
            if (t.y <= 40) {
                // Header tapped
                if (t.x <= 70) {
                    // CLEAR
                    content = "";
                    drawEdit();
                } else if (t.x >= SW - 70) {
                    // SAVE
                    if (content.length > 0) {
                        state = STATE_SAVE_DRIVE;
                        drawSaveDrive();
                    } else {
                        Keyboard.prompt("Notice", "Write something first!");
                        drawEdit();
                    }
                }
            } else {
                // Paper tapped - start typing
                var added = Keyboard.prompt("Enter text to add to document:", "");
                if (added && added.length > 0) {
                    if (content.length > 0) content += " ";
                    content += added;
                }
                drawEdit();
            }
        } 
        else if (state === STATE_SAVE_DRIVE) {
            var selectedDrive = "";
            
            if (t.x >= 40 && t.x <= 200) {
                if (t.y >= 100 && t.y <= 150) {
                    selectedDrive = "/local";
                } else if (t.y >= 170 && t.y <= 220) {
                    selectedDrive = "/sd";
                }
            }
            
            if (t.y >= 240 && t.y <= 275 && t.x >= 80 && t.x <= 160) {
                // Cancel
                state = STATE_EDIT;
                drawEdit();
            } else if (selectedDrive !== "") {
                // Drive Selected! Now ask for folder and filename
                var folder = Keyboard.prompt("Folder path? (e.g. /apps or /docs) or leave empty", "/docs");
                var fName = Keyboard.prompt("Enter filename (e.g. note.txt)", "note.txt");
                
                if (fName && fName.length > 0) {
                    var fullPath = selectedDrive;
                    
                    if (folder && folder.length > 0) {
                        if (folder.charAt(0) !== '/') fullPath += "/";
                        fullPath += folder;
                    }
                    
                    if (fullPath.charAt(fullPath.length - 1) !== '/') fullPath += "/";
                    fullPath += fName;
                    
                    // Create folder if it doesn't exist
                    var folderPath = fullPath.substring(0, fullPath.lastIndexOf("/"));
                    if (!FileSystem.fileExists(folderPath)) {
                        FileSystem.mkdir(folderPath);
                    }
                    
                    // Save file
                    var success = FileSystem.writeTextFile(fullPath, content);
                    
                    if (success) {
                        Keyboard.prompt("Success", "File saved to " + fullPath);
                    } else {
                        Keyboard.prompt("Error", "Failed to save to " + fullPath);
                    }
                }
                
                state = STATE_EDIT;
                drawEdit();
            }
        }
    }
    
    lastTouch = t.touched;
    Harix.delay(20);
}

// Cleanup
Display.fillScreen(C_PAPER);