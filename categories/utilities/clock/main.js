var TAB_CLOCK = 0;
var TAB_WORLD = 1;
var TAB_ALARM = 2;
var TAB_STOPWATCH = 3;
var TAB_TIMER = 4;
var currentTab = TAB_CLOCK;

var COLOR_BG = Display.color(20, 20, 30);
var COLOR_TAB_INACTIVE = Display.color(50, 50, 60);
var COLOR_TAB_ACTIVE = Display.color(0, 200, 255);
var COLOR_TEXT = Display.color(255, 255, 255);
var COLOR_ACCENT = Display.color(0, 255, 150);

var lastTouch = false;

// --- World Clock Data ---
var cities = [
    { name: "New York", offset: -5 },
    { name: "London", offset: 0 },
    { name: "Tokyo", offset: 9 },
    { name: "Dubai", offset: 4 }
];

function parseLocalTime() {
    var tStr = Harix.getTime(); // "14:30" or "02:30 PM"
    var isPM = tStr.indexOf("PM") !== -1;
    var isAM = tStr.indexOf("AM") !== -1;
    var parts = tStr.split(":");
    var h = parseInt(parts[0], 10);
    var mStr = parts[1].split(" ")[0]; // handle "30 PM"
    var m = parseInt(mStr, 10);
    
    if (isPM && h !== 12) h += 12;
    if (isAM && h === 12) h = 0;
    return { h: h, m: m };
}

function parseTZOffset() {
    var tz = Harix.getTimezone(); // e.g. "UTC-5" or "UTC+5:30"
    tz = tz.replace("UTC", "");
    if (tz === "" || tz === "0") return 0;
    var sign = 1;
    if (tz.charAt(0) === '-') sign = -1;
    if (tz.charAt(0) === '+' || tz.charAt(0) === '-') tz = tz.substring(1);
    var parts = tz.split(":");
    var h = parseInt(parts[0], 10);
    var m = parts.length > 1 ? parseInt(parts[1], 10) : 0;
    return sign * (h + m / 60.0);
}

function formatCityTime(offset) {
    var local = parseLocalTime();
    var localOffset = parseTZOffset();
    
    var localDec = local.h + (local.m / 60.0);
    var utcDec = localDec - localOffset;
    var cityDec = utcDec + offset;
    
    while (cityDec < 0) cityDec += 24;
    while (cityDec >= 24) cityDec -= 24;
    
    var ch = Math.floor(cityDec);
    var cm = Math.round((cityDec - ch) * 60);
    if (cm === 60) { cm = 0; ch = (ch + 1) % 24; }
    
    var hStr = ch < 10 ? "0" + ch : ch;
    var mStr = cm < 10 ? "0" + cm : cm;
    return hStr + ":" + mStr;
}

// --- Alarm Data ---
var alarmH = 8;
var alarmM = 0;
var alarmOn = false;
var isAlarmRinging = false;

// --- Stopwatch Data ---
var swRunning = false;
var swStart = 0;
var swAccumulated = 0;

// --- Timer Data ---
var timerRunning = false;
var timerStart = 0;
var timerTotalMs = 5 * 60 * 1000; // 5 mins
var timerRemaining = timerTotalMs;

function drawTabs() {
    Display.fillRect(0, 280, 240, 40, Display.color(10, 10, 15));
    var tabW = 240 / 5;
    var labels = ["Clock", "World", "Alarm", "Stopwatch", "Timer"];
    var xOffsets = [9, 57, 105, 141, 201];
    
    // Draw all backgrounds first so tabs don't overwrite long text from previous tabs
    for (var i = 0; i < 5; i++) {
        var c = (i === currentTab) ? COLOR_TAB_ACTIVE : COLOR_TAB_INACTIVE;
        Display.fillRect(i * tabW, 280, tabW - 1, 40, c);
    }
    // Draw all texts
    for (var i = 0; i < 5; i++) {
        var c = (i === currentTab) ? COLOR_TAB_ACTIVE : COLOR_TAB_INACTIVE;
        Display.setTextColor(COLOR_TEXT, c);
        Display.drawString(labels[i], xOffsets[i], 295, 1);
    }
}

function clearBody() {
    Display.fillRect(0, 0, 240, 280, COLOR_BG);
}

function format2(num) {
    return num < 10 ? "0" + num : num;
}

function formatMillis(ms) {
    var totalSec = Math.floor(ms / 1000);
    var mins = Math.floor(totalSec / 60);
    var secs = totalSec % 60;
    var frac = Math.floor((ms % 1000) / 10);
    return format2(mins) + ":" + format2(secs) + "." + format2(frac);
}

// ==========================================
// RENDERERS
// ==========================================

var currentH = 0;
var currentM = 0;
var currentS = 0;

function updateRealtime() {
    var t = parseLocalTime();
    currentH = t.h;
    currentM = t.m;
    currentS = Harix.getSeconds();
}

var lastRenderedClock = "";
function renderClock() {
    var str = format2(currentH) + ":" + format2(currentM) + ":" + format2(currentS);
    if (str !== lastRenderedClock) {
        Display.setTextColor(COLOR_ACCENT, COLOR_BG);
        Display.drawString(str, 40, 80, 4);
        
        Display.setTextColor(COLOR_TEXT, COLOR_BG);
        Display.drawString("Date: " + Harix.getDate() + "   ", 30, 140, 2);
        Display.drawString("Zone: " + Harix.getTimezone() + "   ", 30, 170, 2);
        lastRenderedClock = str;
    }
}

function renderWorld() {
    Display.setTextColor(COLOR_ACCENT, COLOR_BG);
    Display.drawString("World Clock", 50, 15, 2);
    
    var y = 60;
    for (var i = 0; i < cities.length; i++) {
        var tStr = formatCityTime(cities[i].offset);
        Display.setTextColor(COLOR_TEXT, COLOR_BG);
        Display.drawString(cities[i].name, 20, y, 2);
        
        Display.setTextColor(Display.color(255,200,0), COLOR_BG);
        Display.drawString(tStr + "   ", 160, y, 2);
        y += 40;
    }
}

function renderAlarm() {
    Display.setTextColor(COLOR_ACCENT, COLOR_BG);
    Display.drawString("Alarm", 90, 15, 2);
    
    // Live ticking current time
    Display.setTextColor(Display.color(150,150,150), COLOR_BG);
    Display.drawString("Now: " + format2(currentH) + ":" + format2(currentM) + ":" + format2(currentS), 55, 45, 2);
    
    Display.setTextColor(COLOR_TEXT, COLOR_BG);
    Display.drawString(format2(alarmH) + ":" + format2(alarmM), 65, 80, 4);
    
    // Buttons + - (H, M)
    Display.fillRoundRect(20, 140, 40, 40, 5, Display.color(50,50,50));
    Display.drawString("H+", 30, 150, 2);
    Display.fillRoundRect(70, 140, 40, 40, 5, Display.color(50,50,50));
    Display.drawString("H-", 80, 150, 2);
    
    Display.fillRoundRect(130, 140, 40, 40, 5, Display.color(50,50,50));
    Display.drawString("M+", 140, 150, 2);
    Display.fillRoundRect(180, 140, 40, 40, 5, Display.color(50,50,50));
    Display.drawString("M-", 190, 150, 2);
    
    // Toggle
    var tc = alarmOn ? Display.color(0, 255, 0) : Display.color(255, 0, 0);
    Display.fillRoundRect(50, 210, 140, 40, 5, tc);
    Display.setTextColor(Display.color(0,0,0), tc);
    Display.drawString(alarmOn ? "ALARM ON" : "ALARM OFF", 75, 222, 2);
}

function renderStopwatch() {
    Display.setTextColor(COLOR_ACCENT, COLOR_BG);
    Display.drawString("Stopwatch", 65, 15, 2);
    
    var currentMs = swAccumulated;
    if (swRunning) {
        currentMs += (Harix.millis() - swStart);
    }
    
    Display.setTextColor(COLOR_TEXT, COLOR_BG);
    Display.drawString(formatMillis(currentMs), 50, 80, 4);
    
    Display.fillRoundRect(20, 180, 90, 40, 5, swRunning ? Display.color(255,100,0) : Display.color(0,200,0));
    Display.setTextColor(Display.color(0,0,0));
    Display.drawString(swRunning ? "STOP" : "START", 45, 192, 2);
    
    Display.fillRoundRect(130, 180, 90, 40, 5, Display.color(100,100,100));
    Display.drawString("RESET", 155, 192, 2);
}

function renderTimer() {
    Display.setTextColor(COLOR_ACCENT, COLOR_BG);
    Display.drawString("Timer", 90, 15, 2);
    
    var currentMs = timerRemaining;
    if (timerRunning) {
        currentMs = timerTotalMs - (Harix.millis() - timerStart);
        if (currentMs <= 0) {
            currentMs = 0;
            timerRunning = false;
            timerRemaining = 0;
            isAlarmRinging = true; // trigger alarm screen
        }
    } else {
        currentMs = timerTotalMs; // reset visual
    }
    
    Display.setTextColor(COLOR_TEXT, COLOR_BG);
    Display.drawString(formatMillis(currentMs), 50, 80, 4);
    
    if (!timerRunning) {
        Display.fillRoundRect(20, 140, 90, 30, 5, Display.color(50,50,50));
        Display.setTextColor(COLOR_TEXT);
        Display.drawString("+1 Min", 45, 148, 2);
        
        Display.fillRoundRect(130, 140, 90, 30, 5, Display.color(50,50,50));
        Display.drawString("-1 Min", 155, 148, 2);
    } else {
        Display.fillRect(20, 140, 200, 30, COLOR_BG); // hide edit buttons
    }
    
    Display.fillRoundRect(20, 200, 90, 40, 5, timerRunning ? Display.color(255,100,0) : Display.color(0,200,0));
    Display.setTextColor(Display.color(0,0,0));
    Display.drawString(timerRunning ? "PAUSE" : "START", 45, 212, 2);
    
    Display.fillRoundRect(130, 200, 90, 40, 5, Display.color(100,100,100));
    Display.drawString("RESET", 155, 212, 2);
}

function renderRinging() {
    Display.fillRect(0,0,240,320, Display.color(255,0,0));
    Display.setTextColor(Display.color(255,255,255), Display.color(255,0,0));
    Display.drawString("WAKE UP!", 40, 100, 4);
    
    Display.fillRoundRect(40, 200, 160, 60, 10, Display.color(255,255,255));
    Display.setTextColor(Display.color(0,0,0), Display.color(255,255,255));
    Display.drawString("DISMISS", 80, 220, 2);
}

// ==========================================
// INPUT HANDLERS
// ==========================================
function handleTabs(x, y) {
    if (y >= 280) {
        var tabW = 240 / 5;
        var newTab = Math.floor(x / tabW);
        if (newTab !== currentTab) {
            currentTab = newTab;
            lastRenderedClock = ""; // force clock redraw
            clearBody();
            drawTabs();
        }
        return true;
    }
    return false;
}

function handleAlarmTouch(x, y) {
    if (y >= 140 && y <= 180) {
        if (x >= 20 && x <= 60) { alarmH = (alarmH + 1) % 24; }
        if (x >= 70 && x <= 110) { alarmH = (alarmH - 1 + 24) % 24; }
        if (x >= 130 && x <= 170) { alarmM = (alarmM + 1) % 60; }
        if (x >= 180 && x <= 220) { alarmM = (alarmM - 1 + 60) % 60; }
        Display.fillRect(0, 70, 240, 50, COLOR_BG); // clear old text area just in case
        renderAlarm();
    }
    if (y >= 210 && y <= 250 && x >= 50 && x <= 190) {
        alarmOn = !alarmOn;
        renderAlarm();
    }
}

function handleStopwatchTouch(x, y) {
    if (y >= 180 && y <= 220) {
        if (x >= 20 && x <= 110) {
            // Start/Stop
            if (swRunning) {
                swAccumulated += (Harix.millis() - swStart);
                swRunning = false;
            } else {
                swStart = Harix.millis();
                swRunning = true;
            }
            renderStopwatch();
        }
        if (x >= 130 && x <= 220) {
            // Reset
            swRunning = false;
            swAccumulated = 0;
            renderStopwatch();
        }
    }
}

function handleTimerTouch(x, y) {
    if (!timerRunning && y >= 140 && y <= 170) {
        if (x >= 20 && x <= 110) { timerTotalMs += 60000; }
        if (x >= 130 && x <= 220) { timerTotalMs -= 60000; if(timerTotalMs < 0) timerTotalMs = 0; }
        timerRemaining = timerTotalMs;
        renderTimer();
    }
    
    if (y >= 200 && y <= 240) {
        if (x >= 20 && x <= 110) {
            // Start/Pause
            if (timerRunning) {
                timerTotalMs = timerTotalMs - (Harix.millis() - timerStart);
                timerRunning = false;
            } else {
                if (timerTotalMs > 0) {
                    timerStart = Harix.millis();
                    timerRunning = true;
                }
            }
            renderTimer();
        }
        if (x >= 130 && x <= 220) {
            // Reset
            timerRunning = false;
            timerTotalMs = 5 * 60 * 1000;
            timerRemaining = timerTotalMs;
            clearBody();
            renderTimer();
        }
    }
}

// ==========================================
// MAIN LOOP
// ==========================================
Display.fillScreen(COLOR_BG);
drawTabs();

while (true) {
    updateRealtime();
    
    // Check Alarm Trigger
    if (alarmOn && !isAlarmRinging) {
        if (currentH === alarmH && currentM === alarmM) {
            isAlarmRinging = true;
            alarmOn = false; // Trigger once
        }
    }
    
    // Handle Input
    var t = Input.getTouch();
    
    // Check for exit condition (top-right corner)
    if (t.touched && t.x >= Display.screenWidth() - 40 && t.y <= 40) {
        break;
    }
    
    // Check for ESC key
    var key = Input.getKey();
    if (key === "ESC") {
        break;
    }
    
    if (t.touched && t.x < Display.screenWidth() - 40) { // Avoid OS close button area
        if (!lastTouch) {
            if (isAlarmRinging) {
                if (t.x >= 40 && t.x <= 200 && t.y >= 200 && t.y <= 260) {
                    isAlarmRinging = false;
                    Display.fillScreen(COLOR_BG);
                    drawTabs();
                }
            } else {
                if (!handleTabs(t.x, t.y)) {
                    if (currentTab === TAB_ALARM) handleAlarmTouch(t.x, t.y);
                    if (currentTab === TAB_STOPWATCH) handleStopwatchTouch(t.x, t.y);
                    if (currentTab === TAB_TIMER) handleTimerTouch(t.x, t.y);
                }
            }
        }
        lastTouch = true;
    } else {
        lastTouch = false;
    }

    // Render Logic
    if (isAlarmRinging) {
        renderRinging();
    } else {
        if (currentTab === TAB_CLOCK) renderClock();
        if (currentTab === TAB_WORLD) renderWorld();
        if (currentTab === TAB_ALARM) renderAlarm();
        if (currentTab === TAB_STOPWATCH) renderStopwatch();
        if (currentTab === TAB_TIMER) renderTimer();
    }
    
    Harix.delay(20); // ~50fps
}

// Cleanup
Display.fillScreen(COLOR_BG);