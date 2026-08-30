-- HarixOS Benchmark Tool
-- Tests CPU, 2D Graphics, and 3D Graphics performance

local SW = System.screenWidth()
local SH = System.screenHeight()

local STATE_MENU = 0
local STATE_RUNNING = 1
local STATE_RESULT = 2
local state = STATE_MENU

local selectedBench = 0 -- 0=CPU, 1=2D, 2=3D
local lastTouch = false
local resultText = ""
local resultScore = 0
local minT = 999
local maxT = -999


function drawMenu()
    System.fillScreen(0x0000)
    System.setTextColor(0x07FF, 0x0000)
    System.drawString("HARIX BENCHMARK", 20, 20, 4)

    System.setTextColor(0xFFFF, 0x0000)
    System.drawString("Select a stress test:", 20, 60, 2)

    -- CPU Button
    System.fillRoundRect(30, 90, 180, 45, 5, 0xF800)
    System.setTextColor(0xFFFF, 0xF800)
    System.drawString("CPU & MATH", 70, 105, 2)

    -- 2D Button
    System.fillRoundRect(30, 150, 180, 45, 5, 0x07E0)
    System.setTextColor(0x0000, 0x07E0)
    System.drawString("2D GRAPHICS", 65, 165, 2)

    -- 3D Button
    System.fillRoundRect(30, 210, 180, 45, 5, 0x001F)
    System.setTextColor(0xFFFF, 0x001F)
    System.drawString("3D GRAPHICS", 65, 225, 2)
end


function updateTemps()
    if System.hasTemperatureSensor() then
        local t = System.getTemperature()

        if t < minT then
            minT = t
        end

        if t > maxT then
            maxT = t
        end

        return t
    end

    return 0
end


function runCPU(durationMs)
    local start = System.millis()
    local ops = 0
    local runningVal = 1.0

    System.fillScreen(0x0000)
    System.setTextColor(0x07FF, 0x0000)
    System.drawString("CPU BENCHMARK RUNNING", 10, 100, 2)

    while System.millis() - start < durationMs do

        local chunkStart = System.millis()
        local tempOps = 0

        while System.millis() - chunkStart < 50 do

            -- Heavy math payload that mutates
            for i = 1, 100 do
                runningVal =
                    math.sin(runningVal + i) *
                    math.sqrt(i * 3.14)

                if runningVal == 0 or runningVal ~= runningVal then
                    runningVal = 1.0
                end
            end

            tempOps = tempOps + 1
        end

        ops = ops + tempOps

        local t = updateTemps()

        System.fillRect(10, 140, 220, 30, 0x0000)

        System.setTextColor(0xFFFF, 0x0000)

        System.drawString(
            "Ops: " .. ops ..
            " Temp: " .. math.floor(t) .. "C",
            10,
            140,
            2
        )

        System.drawString(
            "Val: " .. string.format("%.2f", runningVal),
            10,
            160,
            2
        )

        System.delay(1) -- Watchdog
    end

    resultScore = math.floor((ops * 1000) / durationMs)
    resultText = "Math OPs/sec"
end


function run2D(durationMs)
    local start = System.millis()
    local frames = 0

    local colors = {
        0xF800,
        0x07E0,
        0x001F,
        0xFFE0,
        0xF81F,
        0x07FF,
        0xFFFF
    }

    while System.millis() - start < durationMs do

        local x1 = math.floor(math.random() * SW)
        local y1 = math.floor(math.random() * SH)

        local w = math.floor(math.random() * 100)
        local h = math.floor(math.random() * 100)

        local c =
            colors[math.floor(math.random() * #colors) + 1]

        local shape = math.floor(math.random() * 4)

        if shape == 0 then

            System.fillRect(
                x1,
                y1,
                w,
                h,
                c
            )

        elseif shape == 1 then

            System.fillCircle(
                x1,
                y1,
                w / 2,
                c
            )

        elseif shape == 2 then

            System.drawLine(
                x1,
                y1,
                x1 + w,
                y1 + h,
                c
            )

        elseif shape == 3 then

            System.fillRoundRect(
                x1,
                y1,
                w,
                h,
                10,
                c
            )
        end

        frames = frames + 1

        if frames % 20 == 0 then

            local t = updateTemps()

            System.fillRect(
                0,
                0,
                SW,
                20,
                0x0000
            )

            System.setTextColor(
                0xFFFF,
                0x0000
            )

            System.drawString(
                "2D Primitives: " ..
                frames ..
                " Temp: " ..
                math.floor(t) ..
                "C",
                5,
                2,
                2
            )

            System.delay(1)
        end
    end

    resultScore =
        math.floor((frames * 1000) / durationMs)

    resultText = "Primitives/sec"
end


function run3D(durationMs)
    local start = System.millis()
    local frames = 0

    local cubeNodes = {
        {-1, -1, -1},
        { 1, -1, -1},
        { 1,  1, -1},
        {-1,  1, -1},

        {-1, -1,  1},
        { 1, -1,  1},
        { 1,  1,  1},
        {-1,  1,  1}
    }

    local cubeFaces = {
        {nodes = {1, 2, 3, 4}, color = 0xF800},
        {nodes = {6, 5, 8, 7}, color = 0x07E0},
        {nodes = {5, 6, 2, 1}, color = 0x001F},
        {nodes = {4, 3, 7, 8}, color = 0xFFE0},
        {nodes = {5, 1, 4, 8}, color = 0xF81F},
        {nodes = {2, 6, 7, 3}, color = 0x07FF}
    }

    local angleX = 0
    local angleY = 0

    local sliceH = 32
    -- 10 slices of 32px = 320px
    -- Reduced to save RAM and keep 16-bit color

    local numSlices =
        math.ceil(SH / sliceH)

    local lastFrameTime = System.millis()
    local fps = 0

    while System.millis() - start < durationMs do

        local now = System.millis()

        local dt =
            now - lastFrameTime

        if dt > 0 then
            fps = math.floor(1000 / dt)
        end

        lastFrameTime = now

        angleX = angleX + 0.05
        angleY = angleY + 0.07

        local sinX = math.sin(angleX)
        local cosX = math.cos(angleX)

        local sinY = math.sin(angleY)
        local cosY = math.cos(angleY)

        -- Transform vertices once per frame
        local proj = {}

        for i = 1, 8 do

            local x = cubeNodes[i][1]
            local y = cubeNodes[i][2]
            local z = cubeNodes[i][3]

            -- Rot Y
            local x1 =
                x * cosY -
                z * sinY

            local z1 =
                x * sinY +
                z * cosY

            -- Rot X
            local y2 =
                y * cosX -
                z1 * sinX

            local z2 =
                y * sinX +
                z1 * cosX

            -- Project
            local fov = 150
            local dist = 3.5

            local zDist =
                z2 + dist

            if zDist < 0.1 then
                zDist = 0.1
            end

            proj[i] = {
                px = SW / 2 +
                    (x1 * fov) / zDist,

                py = SH / 2 +
                    (y2 * fov) / zDist,

                pz = zDist
            }
        end

        -- Calculate face depths
        -- and sort (Painter's Algorithm)

        for f = 1, 6 do

            local face = cubeFaces[f]

            face.zDepth =
                (
                    proj[face.nodes[1]].pz +
                    proj[face.nodes[2]].pz +
                    proj[face.nodes[3]].pz +
                    proj[face.nodes[4]].pz
                ) / 4.0
        end

        -- Draw furthest first
        table.sort(
            cubeFaces,
            function(a, b)
                return a.zDepth > b.zDepth
            end
        )

        -- Draw Slices

        System.createSprite(
            SW,
            sliceH
        )

        for slice = 0, numSlices - 1 do

            local sliceY =
                slice * sliceH

            System.bindSprite(true)

            -- Clear slice buffer
            System.fillScreen(0x0000)

            -- Draw solid faces
            for f = 1, 6 do

                local face =
                    cubeFaces[f]

                local p0 =
                    proj[face.nodes[1]]

                local p1 =
                    proj[face.nodes[2]]

                local p2 =
                    proj[face.nodes[3]]

                local p3 =
                    proj[face.nodes[4]]

                -- Basic bounding box culling
                -- against the slice

                local minY =
                    math.min(
                        p0.py,
                        p1.py,
                        p2.py,
                        p3.py
                    )

                local maxY =
                    math.max(
                        p0.py,
                        p1.py,
                        p2.py,
                        p3.py
                    )

                if maxY >= sliceY and
                   minY < sliceY + sliceH then

                    -- Draw face as two triangles

                    System.fillTriangle(
                        p0.px,
                        p0.py - sliceY,
                        p1.px,
                        p1.py - sliceY,
                        p2.px,
                        p2.py - sliceY,
                        face.color
                    )

                    System.fillTriangle(
                        p0.px,
                        p0.py - sliceY,
                        p2.px,
                        p2.py - sliceY,
                        p3.px,
                        p3.py - sliceY,
                        face.color
                    )
                end
            end

            -- HUD on top slice
            if slice == 0 then

                local t =
                    updateTemps()

                System.setTextColor(
                    0xFFFF,
                    0x0000
                )

                System.drawString(
                    "3D FPS: " ..
                    fps ..
                    " | Temp: " ..
                    math.floor(t) ..
                    "C",
                    5,
                    5,
                    2
                )
            end

            System.bindSprite(false)

            System.pushSprite(
                0,
                sliceY
            )
        end

        System.deleteSprite()

        frames = frames + 1

        System.delay(1)
    end

    resultScore =
        math.floor(
            (frames * 1000) /
            durationMs
        )

    resultText = "Frames/sec (FPS)"
end


function drawResult()

    System.fillScreen(0x0000)

    System.setTextColor(
        0x07E0,
        0x0000
    )

    System.drawString(
        "BENCHMARK COMPLETE",
        10,
        30,
        4
    )

    System.setTextColor(
        0xFFFF,
        0x0000
    )

    if selectedBench == 0 then

        System.drawString(
            "Type: CPU & MATH",
            20,
            80,
            2
        )

    elseif selectedBench == 1 then

        System.drawString(
            "Type: 2D GRAPHICS",
            20,
            80,
            2
        )

    elseif selectedBench == 2 then

        System.drawString(
            "Type: 3D GRAPHICS",
            20,
            80,
            2
        )
    end

    System.setTextColor(
        0xF800,
        0x0000
    )

    System.drawString(
        "SCORE:",
        20,
        120,
        4
    )

    System.setTextColor(
        0x07FF,
        0x0000
    )

    System.drawString(
        resultScore ..
        " " ..
        resultText,
        20,
        150,
        4
    )

    if minT ~= 999 then

        System.setTextColor(
            0xFFFF,
            0x0000
        )

        System.drawString(
            "Thermal Impact:",
            20,
            210,
            2
        )

        System.setTextColor(
            0x001F,
            0x0000
        )

        System.drawString(
            "Min Temp: " ..
            math.floor(minT) ..
            " C",
            20,
            230,
            2
        )

        System.setTextColor(
            0xF800,
            0x0000
        )

        System.drawString(
            "Max Temp: " ..
            math.floor(maxT) ..
            " C",
            20,
            250,
            2
        )
    end

    System.setTextColor(
        0x7BEF,
        0x0000
    )

    System.drawString(
        "Tap to return",
        60,
        290,
        2
    )
end


drawMenu()


while true do

    local t = System.getTouch()

    local isTapped =
        t.touched and not lastTouch

    if isTapped then

        if state == STATE_MENU then

            local selected = -1

            if t.y >= 90 and
               t.y <= 135 then

                selected = 0

            elseif t.y >= 150 and
                   t.y <= 195 then

                selected = 1

            elseif t.y >= 210 and
                   t.y <= 255 then

                selected = 2
            end

            if selected ~= -1 then

                selectedBench = selected

                local timeStr =
                    System.prompt(
                        "Enter duration in seconds (1-999):",
                        "10"
                    )

                local sec =
                    tonumber(timeStr)

                if sec and
                   sec > 0 and
                   sec <= 999 then

                    minT = 999
                    maxT = -999

                    if selected == 0 then

                        runCPU(
                            sec * 1000
                        )

                    elseif selected == 1 then

                        run2D(
                            sec * 1000
                        )

                    elseif selected == 2 then

                        run3D(
                            sec * 1000
                        )
                    end

                    state = STATE_RESULT

                    drawResult()

                else

                    drawMenu()
                end
            end

        elseif state == STATE_RESULT then

            state = STATE_MENU

            drawMenu()
        end
    end

    lastTouch = t.touched

    System.delay(20)
end