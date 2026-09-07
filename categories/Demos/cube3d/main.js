// KryonOS 3D Cube Engine
// A 3D wireframe renderer in JavaScript

var SW = Display.screenWidth();
var SH = Display.screenHeight();

var STATE_MENU = 0;
var STATE_PLAYING = 1;
var state = STATE_MENU;

// Colors
var BLACK = 0x0000;
var WHITE = 0xFFFF;
var RED = 0xF800;
var GREEN = 0x07E0;
var BLUE = 0x001F;
var YELLOW = 0xFFE0;
var MAGENTA = 0xF81F;
var CYAN = 0x07FF;
var DARKGREY = 0x7BEF;

// 3D Cube Vertices (x, y, z)
var vertices = [
    [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
    [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
];

// Faces definition with distinct colors for a solid color cube
var faces = [
    { indices: [0, 1, 2, 3], color: RED },     // Front (Red)
    { indices: [5, 4, 7, 6], color: GREEN },   // Back (Green)
    { indices: [4, 5, 1, 0], color: BLUE },    // Top (Blue)
    { indices: [3, 2, 6, 7], color: YELLOW },  // Bottom (Yellow)
    { indices: [4, 0, 3, 7], color: MAGENTA }, // Left (Magenta)
    { indices: [1, 5, 6, 2], color: CYAN }     // Right (Cyan)
];

var angleX = 0;
var angleY = 0;
var angleZ = 0;

var lastTouchX = 0;
var lastTouchY = 0;
var isDragging = false;

function drawMenu() {
    Display.fillScreen(BLACK);

    // Draw decorative 3D-ish borders
    Display.drawRect(10, 10, SW - 20, SH - 20, CYAN);
    Display.drawRect(12, 12, SW - 24, SH - 24, BLUE);

    Display.setTextColor(GREEN, BLACK);
    Display.drawString("3D Cube", 55, 60, 4);

    Display.setTextColor(WHITE, BLACK);
    Display.drawString("Interactive Renderer", 35, 100, 2);

    Display.fillRoundRect(50, 180, 140, 50, 8, RED);
    Display.drawRoundRect(50, 180, 140, 50, 8, WHITE);
    Display.setTextColor(WHITE, RED);
    Display.drawString("START", 85, 195, 4);

    Display.setTextColor(DARKGREY, BLACK);
    Display.drawString("Drag finger to rotate", 45, 270, 2);
}

function draw3DFrame() {
    var sinX = Math.sin(angleX); var cosX = Math.cos(angleX);
    var sinY = Math.sin(angleY); var cosY = Math.cos(angleY);

    // Transform and project vertices once per frame using perspective projection
    var proj = [];
    for (var i = 0; i < 8; i++) {
        var x = vertices[i][0];
        var y = vertices[i][1];
        var z = vertices[i][2];

        // Rotate Y
        var x1 = x * cosY - z * sinY;
        var z1 = x * sinY + z * cosY;

        // Rotate X
        var y2 = y * cosX - z1 * sinX;
        var z2 = y * sinX + z1 * cosX;

        // Perspective Projection
        var fov = 150;
        var dist = 3.5;
        var zDist = z2 + dist;
        if (zDist < 0.1) zDist = 0.1;

        proj.push({
            px: Math.floor(SW / 2 + (x1 * fov) / zDist),
            py: Math.floor(SH / 2 + (y2 * fov) / zDist),
            pz: zDist
        });
    }

    // Pre-calculate face properties to sort them by depth
    var processedFaces = [];
    for (var i = 0; i < faces.length; i++) {
        var face = faces[i];
        var p0 = proj[face.indices[0]];
        var p1 = proj[face.indices[1]];
        var p2 = proj[face.indices[2]];
        var p3 = proj[face.indices[3]];
        // Average Z for painter's algorithm sorting
        var avgZ = (p0.pz + p1.pz + p2.pz + p3.pz) / 4.0;
        processedFaces.push({ p0: p0, p1: p1, p2: p2, p3: p3, color: face.color, z: avgZ });
    }

    // Sort faces so furthest are drawn first (Painter's Algorithm: descending depth order)
    processedFaces.sort(function (a, b) { return b.z - a.z; });

    var sliceH = 32; // Slices of 32px (safely fits in RAM)
    var numSlices = Math.ceil(SH / sliceH);

    Sprite.create(SW, sliceH);
    for (var slice = 0; slice < numSlices; slice++) {
        var sliceY = slice * sliceH;
        Sprite.bind(true);
        Display.fillScreen(BLACK);

        // Title bar overlay
        if (slice === 0) {
            Display.fillRect(0, 0, SW, 30, DARKGREY);
            Display.setTextColor(CYAN, DARKGREY);
            Display.drawString("3D Cube", 10, 8, 2);
        }

        // Draw all faces (sorted back-to-front)
        for (var i = 0; i < processedFaces.length; i++) {
            var f = processedFaces[i];
            
            // Basic culling: only draw if the face intersects this slice vertically
            var minY = Math.min(f.p0.py, f.p1.py, f.p2.py, f.p3.py);
            var maxY = Math.max(f.p0.py, f.p1.py, f.p2.py, f.p3.py);
            if (maxY >= sliceY && minY < sliceY + sliceH) {
                // Draw filled triangles for the solid face
                Display.fillTriangle(f.p0.px, f.p0.py - sliceY, f.p1.px, f.p1.py - sliceY, f.p2.px, f.p2.py - sliceY, f.color);
                Display.fillTriangle(f.p0.px, f.p0.py - sliceY, f.p2.px, f.p2.py - sliceY, f.p3.px, f.p3.py - sliceY, f.color);
            }
        }

        Sprite.bind(false);
        Sprite.push(0, sliceY);
    }
    Sprite.delete();
}

drawMenu();

while (true) {
    var t = Input.getTouch();

    // Check for exit condition (top-right corner)
    if (t.touched && t.x >= SW - 40 && t.y <= 40) {
        break;
    }

    if (t.touched && t.x < SW - 40) { // Avoid OS close button area
        if (state === STATE_MENU) {
            if (t.x >= 50 && t.x <= 190 && t.y >= 180 && t.y <= 230) {
                state = STATE_PLAYING;
                Harix.delay(200); // Debounce
            }
        }
        else if (state === STATE_PLAYING) {
            if (!isDragging) {
                isDragging = true;
                lastTouchX = t.x;
                lastTouchY = t.y;
            } else {
                // Calculate drag delta
                var dx = t.x - lastTouchX;
                var dy = t.y - lastTouchY;

                // Adjust rotation angles (inverted for natural swipe) if delta is within a sane range
                if (Math.abs(dx) < 80 && Math.abs(dy) < 80) {
                    angleY += dx * 0.02;
                    angleX += dy * 0.02;
                }

                lastTouchX = t.x;
                lastTouchY = t.y;
            }
        }
    } else {
        isDragging = false;
    }

    // Check for ESC key exit
    var key = Input.getKey();
    if (key === "ESC") {
        break;
    }

    if (state === STATE_PLAYING) {
        // Auto rotate if not dragging
        if (!isDragging) {
            angleX += 0.04;
            angleY += 0.03;
            angleZ += 0.01;
        }

        // Normalize angles to prevent float precision explosion which warps shapes
        var PI2 = Math.PI * 2;
        angleX = angleX % PI2;
        angleY = angleY % PI2;
        angleZ = angleZ % PI2;
        if (angleX < 0) angleX += PI2;
        if (angleY < 0) angleY += PI2;
        if (angleZ < 0) angleZ += PI2;

        draw3DFrame();
    }

    // High FPS yield with GC opportunity
    Harix.delay(10);
}

// Cleanup
Display.fillScreen(BLACK);