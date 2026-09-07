// HarixOS Advanced File Manager
// A professional, full-featured JS file manager using the expanded FileSystem API

var SW = Display.screenWidth();
var SH = Display.screenHeight();

// Application State
var STATE_LIST = 0;
var STATE_POPUP = 1;
var state = STATE_LIST;

var currentPath = "/local"; 
var files = [];
var scrollIndex = 0;
var maxDisplay = 6;
var lastTouch = false;

var selectedFile = "";
var isDirCache = {}; // Cache to prevent excessive FileSystem calls while drawing

// Colors
var C_BG = 0x0000;
var C_TOP = 0x01cf; // Deep Blue
var C_BOT = 0x18e3; // Lighter Blue
var C_TEXT = 0xFFFF;
var C_ITEM = 0x2124; // Very dark grey
var C_DIR = 0xFD20; // Orange/Yellow for folders
var C_FILE = 0x07FF; // Cyan for files
var C_MODAL = 0x3186; // Grey
var C_BTN = 0xFA20; // Orange buttons
var C_DEL = 0xF800; // Red

function loadFiles() {
    files = FileSystem.listDir(currentPath) || [];
    scrollIndex = 0;
    
    // Pre-cache types so drawing loop is fast
    isDirCache = {};
    for (var i = 0; i < files.length; i++) {
        isDirCache[files[i]] = FileSystem.isDirectory(files[i]);
    }
}

function goUp() {
    if (currentPath === "/local" || currentPath === "/sd" || currentPath === "/local/" || currentPath === "/sd/") return;
    
    // Remove trailing slash if exists
    if (currentPath.lastIndexOf("/") === currentPath.length - 1) {
        currentPath = currentPath.substring(0, currentPath.length - 1);
    }
    
    var lastSlash = currentPath.lastIndexOf("/");
    if (lastSlash >= 0) {
        currentPath = currentPath.substring(0, lastSlash);
    }
    if (currentPath.length === 0) currentPath = "/local";
    
    loadFiles();
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    else if (bytes < 1048576) return Math.floor(bytes / 1024) + " KB";
    else return Math.floor(bytes / 1048576) + " MB";
}

function drawListUI() {
    Display.fillScreen(C_BG);
    
    // Top Bar
    Display.fillRoundRect(0, 0, SW, 40, 0, C_TOP);
    Display.setTextColor(C_TEXT, C_TOP);
    
    var dispPath = currentPath;
    if (dispPath.length > 20) dispPath = ".." + dispPath.substring(dispPath.length - 18);
    Display.drawString(dispPath, 45, 12, 2);
    
    // UP Button
    Display.fillRoundRect(5, 5, 30, 30, 4, 0x52AA);
    Display.setTextColor(C_TEXT, 0x52AA);
    Display.drawString("UP", 10, 12, 2);
    
    // New Folder Button
    Display.fillRoundRect(SW - 40, 5, 35, 30, 4, 0x07E0);
    Display.setTextColor(C_BG, 0x07E0);
    Display.drawString("+D", SW - 32, 12, 2);
    
    // File List
    var y = 45;
    if (files.length === 0) {
        Display.setTextColor(C_TEXT, C_BG);
        Display.drawString("Empty Directory", 15, 60, 2);
    } else {
        var end = scrollIndex + maxDisplay;
        if (end > files.length) end = files.length;
        
        for (var i = scrollIndex; i < end; i++) {
            var fullPath = files[i];
            var fName = fullPath;
            var lastSlash = fName.lastIndexOf("/");
            if (lastSlash >= 0) fName = fName.substring(lastSlash + 1);
            
            var isDir = isDirCache[fullPath];
            
            Display.fillRoundRect(5, y, SW - 10, 35, 4, C_ITEM);
            
            if (isDir) {
                Display.fillRoundRect(10, y + 8, 20, 18, 3, C_DIR);
                Display.setTextColor(C_TEXT, C_ITEM);
                Display.drawString(fName.substring(0,16), 40, y + 10, 2);
                Display.drawString("<DIR>", SW - 50, y + 10, 2);
            } else {
                Display.fillRoundRect(10, y + 8, 16, 20, 2, C_FILE);
                Display.setTextColor(C_TEXT, C_ITEM);
                Display.drawString(fName.substring(0,18), 35, y + 10, 2);
            }
            
            y += 40;
        }
    }
    
    // Bottom Bar
    Display.fillRoundRect(0, SH - 40, SW, 40, 0, C_BOT);
    
    // Storage Space
    var driveBase = (currentPath.indexOf("/sd") === 0) ? "/sd" : "/local";
    var free = FileSystem.getFreeSpace(driveBase);
    var total = FileSystem.getTotalSpace(driveBase);
    var usedPct = total > 0 ? Math.floor(((total - free) / total) * 100) : 0;
    
    Display.setTextColor(C_TEXT, C_BOT);
    Display.drawString(driveBase + ": " + usedPct + "% full", 5, SH - 30, 2);
    
    // Swap Drive
    Display.fillRoundRect(SW - 60, SH - 35, 55, 30, 4, C_BTN);
    Display.drawString("SWAP", SW - 48, SH - 28, 2);
    
    // Pagination
    if (scrollIndex > 0) {
        Display.fillRoundRect(SW - 110, SH - 35, 40, 30, 4, 0x52AA);
        Display.drawString("<", SW - 95, SH - 28, 2);
    }
    if (scrollIndex + maxDisplay < files.length) {
        Display.fillRoundRect(SW - 160, SH - 35, 40, 30, 4, 0x52AA);
        Display.drawString(">", SW - 145, SH - 28, 2);
    }
}

function drawModal() {
    Display.fillRoundRect(20, 50, SW - 40, 220, 8, C_MODAL);
    Display.drawRoundRect(20, 50, SW - 40, 220, 8, C_TEXT);
    
    var fName = selectedFile;
    var lastSlash = fName.lastIndexOf("/");
    if (lastSlash >= 0) fName = fName.substring(lastSlash + 1);
    
    Display.setTextColor(C_TEXT, C_MODAL);
    Display.drawString(fName.substring(0, 16), 30, 60, 4);
    
    var size = FileSystem.getFileSize(selectedFile);
    Display.drawString("Size: " + formatSize(size), 30, 90, 2);
    
    // Buttons
    Display.fillRoundRect(30, 120, 85, 35, 4, C_BTN);
    Display.drawString("RENAME", 45, 130, 2);
    
    Display.fillRoundRect(125, 120, 85, 35, 4, 0x52AA);
    Display.drawString("HASH", 150, 130, 2);
    
    Display.fillRoundRect(30, 165, 180, 35, 4, C_DEL);
    Display.setTextColor(C_TEXT, C_DEL);
    Display.drawString("DELETE PERMANENTLY", 45, 175, 2);
    
    Display.fillRoundRect(30, 215, 180, 35, 4, C_BG);
    Display.setTextColor(C_TEXT, C_BG);
    Display.drawString("CANCEL", 95, 225, 2);
}

loadFiles();
drawListUI();

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
        if (state === STATE_LIST) {
            // UP Button
            if (t.x <= 35 && t.y <= 35) {
                goUp();
                drawListUI();
            }
            // MKDIR Button
            else if (t.x >= SW - 40 && t.y <= 35) {
                var dName = Keyboard.prompt("New Folder Name:", "");
                if (dName && dName.length > 0) {
                    FileSystem.mkdir(currentPath + "/" + dName);
                    loadFiles();
                }
                drawListUI();
            }
            // SWAP Button
            else if (t.y >= SH - 40 && t.x >= SW - 65) {
                if (currentPath.indexOf("/local") === 0) {
                    currentPath = "/sd";
                    // Attempt mount silently just in case
                    FileSystem.mountSD();
                } else {
                    currentPath = "/local";
                }
                loadFiles();
                drawListUI();
            }
            // Pagination <
            else if (t.y >= SH - 40 && t.x >= SW - 110 && t.x <= SW - 70 && scrollIndex > 0) {
                scrollIndex -= maxDisplay;
                if (scrollIndex < 0) scrollIndex = 0;
                drawListUI();
            }
            // Pagination >
            else if (t.y >= SH - 40 && t.x >= SW - 160 && t.x <= SW - 120 && scrollIndex + maxDisplay < files.length) {
                scrollIndex += maxDisplay;
                drawListUI();
            }
            // File Click
            else if (t.y >= 45 && t.y <= SH - 40) {
                var y = 45;
                var end = scrollIndex + maxDisplay;
                if (end > files.length) end = files.length;
                for (var i = scrollIndex; i < end; i++) {
                    if (t.y >= y && t.y <= y + 35) {
                        var full = files[i];
                        if (isDirCache[full]) {
                            // Enter directory
                            currentPath = full;
                            loadFiles();
                            drawListUI();
                        } else {
                            // Open File Modal
                            selectedFile = full;
                            state = STATE_POPUP;
                            drawModal();
                        }
                        break;
                    }
                    y += 40;
                }
            }
        } 
        else if (state === STATE_POPUP) {
            // RENAME
            if (t.x >= 30 && t.x <= 115 && t.y >= 120 && t.y <= 155) {
                var newName = Keyboard.prompt("New name for file:", "");
                if (newName && newName.length > 0) {
                    var slash = selectedFile.lastIndexOf("/");
                    var newPath = selectedFile.substring(0, slash + 1) + newName;
                    FileSystem.renameFile(selectedFile, newPath);
                    loadFiles();
                }
                state = STATE_LIST;
                drawListUI();
            }
            // HASH
            else if (t.x >= 125 && t.x <= 210 && t.y >= 120 && t.y <= 155) {
                var md5 = FileSystem.getFileMD5(selectedFile);
                Keyboard.prompt("MD5 Hash:", md5); // Use prompt to display text
                state = STATE_LIST;
                drawListUI();
            }
            // DELETE
            else if (t.x >= 30 && t.x <= 210 && t.y >= 165 && t.y <= 200) {
                var conf = Keyboard.prompt("Type YES to delete", "");
                if (conf === "YES") {
                    FileSystem.deleteFile(selectedFile);
                    loadFiles();
                }
                state = STATE_LIST;
                drawListUI();
            }
            // CANCEL
            else if (t.x >= 30 && t.x <= 210 && t.y >= 215 && t.y <= 250) {
                state = STATE_LIST;
                drawListUI();
            }
        }
    }
    
    lastTouch = t.touched;
    Harix.delay(20);
}

// Cleanup
Display.fillScreen(C_BG);