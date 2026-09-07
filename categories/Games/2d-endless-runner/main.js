// 2D Endless Runner
// Uses Sliced Rendering for 0% Flickering

var SW = Display.screenWidth();
var SH = Display.screenHeight();
var SLICE_H = 32; // Reduced slice height to drastically decrease RAM requirement
var SLICES = Math.ceil(SH / SLICE_H);

// Allocate Sliced Double Buffer
if (!Sprite.create(SW, SLICE_H)) {
    Harix.print("Error: Not enough memory for sprite buffer!");
    while (true) Harix.delay(100);
}

// Colors
var C_BG = 0x18E3;      // Darker Background
var C_LANE = 0x2124;    // Lane separator
var C_PLAYER = 0x07FF;  // Cyan Hoverboard
var C_TRAIN = 0xF800;   // Red Obstacle
var C_COIN = 0xFFE0;    // Gold Coin
var C_TEXT = 0xFFFF;    // White Text

// Game States
var STATE_MENU = 0;
var STATE_PLAY = 1;
var STATE_GAMEOVER = 2;
var STATE_SETTINGS = 3;
var currentState = STATE_MENU;

// Settings
var showFPS = false;
var showTemp = false;

// Game Variables
var lanes = [40, 120, 200]; // X centers for the 3 lanes
var playerLane = 1;         // Starts in the middle lane
var playerY = 260;
var playerBob = 0;

var score = 0;
var speed = 150; // pixels per second
var distanceTraveled = 0;

var entities = []; // Array of objects: { type: "train"|"coin", lane: 0..2, y: int, h: int }

// Timing & Input
var lastTime = Harix.millis();
var lastTouch = false;
var fps = 0;
var frames = 0;
var lastFpsTime = Harix.millis();
var spawnTimer = 0;

// Reset Game
function resetGame() {
    playerLane = 1;
    score = 0;
    speed = 150;
    distanceTraveled = 0;
    entities = [];
    spawnTimer = 0;
    lastTime = Harix.millis();
}

// Update Game Logic
function update(dt) {
    var moveDist = speed * dt;
    distanceTraveled += moveDist;

    // Animate Player Bobbing
    playerBob = Math.sin(Harix.millis() / 150.0) * 5;

    // Spawn Entities
    spawnTimer += dt;
    // Spawning frequency gets faster as speed increases
    var spawnRate = 1.0 - (speed / 1000.0);
    if (spawnRate < 0.2) spawnRate = 0.2;

    if (spawnTimer > spawnRate) {
        spawnTimer = 0;

        // Randomly choose a lane
        var lane = Math.floor(Math.random() * 3);
        if (lane > 2) lane = 2;

        // 70% chance for an obstacle, 30% for a coin
        if (Math.random() > 0.3) {
            // Spawn Train
            entities.push({ type: "train", lane: lane, y: -100, h: 80 });
        } else {
            // Spawn Coin
            entities.push({ type: "coin", lane: lane, y: -20, h: 20 });
        }
    }

    // Update Entities & Collision
    var pX = lanes[playerLane] - 15;
    var pY = playerY - 20;
    var pW = 30;
    var pH = 40;

    for (var i = entities.length - 1; i >= 0; i--) {
        var e = entities[i];
        e.y += moveDist;

        // Remove off-screen entities
        if (e.y > SH + 20) {
            entities.splice(i, 1);
            if (e.type === "train") score += 5; // Passive points for dodging
            continue;
        }

        // Collision Detection
        if (e.lane === playerLane) {
            if (e.type === "train") {
                // Train hitbox
                if (pY < e.y + e.h && pY + pH > e.y) {
                    // CRASH!
                    currentState = STATE_GAMEOVER;
                }
            } else if (e.type === "coin") {
                // Coin hitbox (approximate as rect)
                if (pY < e.y + 10 && pY + pH > e.y - 10) {
                    score += 50;
                    entities.splice(i, 1); // Collect coin
                }
            }
        }
    }

    // Increase difficulty
    speed += dt * 5.0;
}

// Drawing Functions (All rendering happens inside the Sliced loop)
function drawSlice(sliceY, dt) {
    Sprite.bind(true);
    Display.fillScreen(C_BG);

    // --- Draw Background / Lanes ---
    // Moving track lines
    var trackOffset = Math.floor(distanceTraveled) % 40;
    for (var y = -40; y < SH; y += 40) {
        var realY = y + trackOffset;
        if (realY >= sliceY && realY < sliceY + SLICE_H + 40) {
            Display.fillRect(80 - 2, realY - sliceY, 4, 20, C_LANE);
            Display.fillRect(160 - 2, realY - sliceY, 4, 20, C_LANE);
        }
    }

    if (currentState === STATE_PLAY) {
        // --- Draw Entities ---
        for (var i = 0; i < entities.length; i++) {
            var e = entities[i];
            if (e.y + e.h >= sliceY && e.y < sliceY + SLICE_H) {
                var ex = lanes[e.lane];
                if (e.type === "train") {
                    Display.fillRoundRect(ex - 30, e.y - sliceY, 60, e.h, 5, C_TRAIN);
                    Display.fillRect(ex - 25, e.y - sliceY + 5, 50, 15, 0x0000); // Window
                } else if (e.type === "coin") {
                    Display.fillCircle(ex, e.y - sliceY, 15, C_COIN);
                    Display.fillCircle(ex, e.y - sliceY, 10, 0xFEA0); // Inner highlight
                }
            }
        }

        // --- Draw Player ---
        if (playerY + 20 >= sliceY && playerY - 20 < sliceY + SLICE_H) {
            var px = lanes[playerLane];
            var py = playerY + playerBob;
            // Hoverboard shadow
            Display.fillRoundRect(px - 15, py - sliceY - 10, 30, 40, 8, 0x0000);
            // Hoverboard body
            Display.fillRoundRect(px - 15, py - sliceY - 15, 30, 40, 8, C_PLAYER);
            // Engine glow
            Display.fillCircle(px, py - sliceY + 20, 8, 0x07FF);
        }

        // --- HUD ---
        if (sliceY === 0) { // Only draw on top slice
            Display.setTextColor(C_TEXT, C_BG);
            Display.drawString("SCORE: " + score, 10, 10, 2);
        }
    }
    else if (currentState === STATE_MENU) {
        // Animated Menu text
        var titleBob = Math.sin(Harix.millis() / 200.0) * 10;

        Display.setTextColor(0x07FF, C_BG);
        Display.drawString("NEON", 70, 50 + titleBob - sliceY, 4);

        Display.setTextColor(0x07FF, C_BG);
        Display.drawString("SURFER", 50, 100 + titleBob - sliceY, 4);

        // Start Button at Y=180
        Display.fillRoundRect(40, 180 - sliceY, 160, 40, 5, 0x07E0);
        Display.setTextColor(0x0000, 0x07E0);
        Display.drawString("START GAME", 65, 192 - sliceY, 2);

        // Settings Button at Y=240
        Display.fillRoundRect(40, 240 - sliceY, 160, 40, 5, 0x7BEF);
        Display.setTextColor(0x0000, 0x7BEF);
        Display.drawString("SETTINGS", 75, 252 - sliceY, 2);
    }
    else if (currentState === STATE_SETTINGS) {
        Display.setTextColor(C_TEXT, C_BG);
        Display.drawString("SETTINGS", 60, 30 - sliceY, 4);

        // FPS Toggle Y=100
        Display.fillRoundRect(20, 100 - sliceY, 200, 40, 5, showFPS ? 0x07E0 : 0x7BEF);
        Display.setTextColor(0x0000, showFPS ? 0x07E0 : 0x7BEF);
        Display.drawString("FPS Counter: " + (showFPS ? "ON" : "OFF"), 40, 112 - sliceY, 2);

        // Temp Toggle Y=160
        Display.fillRoundRect(20, 160 - sliceY, 200, 40, 5, showTemp ? 0x07E0 : 0x7BEF);
        Display.setTextColor(0x0000, showTemp ? 0x07E0 : 0x7BEF);
        Display.drawString("Temp Counter: " + (showTemp ? "ON" : "OFF"), 35, 172 - sliceY, 2);

        // Back Button Y=250
        Display.fillRoundRect(40, 250 - sliceY, 160, 40, 5, 0xF800);
        Display.setTextColor(0x0000, 0xF800);
        Display.drawString("BACK", 95, 262 - sliceY, 2);
    }
    else if (currentState === STATE_GAMEOVER) {
        Display.setTextColor(0xF800, C_BG);
        Display.drawString("CRASHED!", 50, 120 - sliceY, 4);

        Display.setTextColor(C_TEXT, C_BG);
        Display.drawString("FINAL SCORE: " + score, 45, 160 - sliceY, 2);

        Display.fillRoundRect(40, 220 - sliceY, 160, 40, 5, 0x07E0);
        Display.setTextColor(0x0000, 0x07E0);
        Display.drawString("PLAY AGAIN", 65, 232 - sliceY, 2);
    }

    // --- Global Overlays (FPS/Temp) ---
    if (sliceY === 0) {
        if (showFPS) {
            Display.setTextColor(0xFFE0, C_BG);
            Display.drawString("FPS: " + fps, 170, 10, 2);
        }
        if (showTemp && Harix.hasTemperatureSensor()) {
            Display.setTextColor(0x07FF, C_BG);
            Display.drawString(Harix.getTemperature().toFixed(1) + "C", 170, 30, 2);
        }
    }

    Sprite.bind(false);
    Sprite.push(0, sliceY);
}

// Input Handling
function handleInput() {
    var t = Input.getTouch();

    // Check for exit (top-right corner)
    if (t.touched && t.x >= SW - 40 && t.y <= 40) {
        return true; // Exit app
    }

    // Check for ESC key
    var key = Input.getKey();
    if (key === "ESC") {
        return true; // Exit app
    }

    if (t.touched && !lastTouch && t.x < SW - 40) {
        if (currentState === STATE_MENU) {
            if (t.y > 190 && t.y < 240) {
                resetGame();
                currentState = STATE_PLAY;
            } else if (t.y > 240 && t.y < 290) {
                currentState = STATE_SETTINGS;
            }
        }
        else if (currentState === STATE_SETTINGS) {
            if (t.y > 90 && t.y < 150) { // FPS Toggle
                showFPS = !showFPS;
            } else if (t.y > 150 && t.y < 210) { // Temp Toggle
                showTemp = !showTemp;
            } else if (t.y > 240 && t.y < 300) { // Back
                currentState = STATE_MENU;
            }
        }
        else if (currentState === STATE_PLAY) {
            // Tap left half to move left, right half to move right
            if (t.x < SW / 2) {
                if (playerLane > 0) playerLane--;
            } else {
                if (playerLane < 2) playerLane++;
            }
        }
        else if (currentState === STATE_GAMEOVER) {
            if (t.y > 210 && t.y < 270) {
                resetGame();
                currentState = STATE_PLAY;
            }
        }
    }
    lastTouch = t.touched;
    return false;
}

// Main Loop
while (true) {
    var now = Harix.millis();
    var dt = (now - lastTime) / 1000.0; // Delta time in seconds
    lastTime = now;

    // Safety cap dt to prevent huge jumps if CPU hangs
    if (dt > 0.1) dt = 0.1;

    if (handleInput()) break; // Exit

    if (currentState === STATE_PLAY) {
        update(dt);
    }

    // Render Frame (Sliced)
    for (var slice = 0; slice < SLICES; slice++) {
        drawSlice(slice * SLICE_H, dt);
    }

    // FPS Calculation
    frames++;
    if (now - lastFpsTime >= 1000) {
        fps = frames;
        frames = 0;
        lastFpsTime = now;
    }

    // Yield to OS
    Harix.delay(1);
}

Sprite.delete();
Display.fillScreen(0x0000);