@echo off
echo 🚀 Starting TRAE Unity AI Platform...

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js not found. Please install Node.js first.
    pause
    exit /b 1
)

REM Check FFmpeg availability
if exist "tools\ffmpeg\ffmpeg.exe" (
    echo ✅ FFmpeg found
) else (
    echo ⚠️  FFmpeg not found - run setup-ffmpeg.bat for media processing
)

REM Install dependencies if needed
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
)

echo 🚀 Starting services...

REM Start WebSocket Server
echo 🌐 Starting WebSocket Server...
if exist "local-websocket-server.js" (
    start "WebSocket Server" node local-websocket-server.js
    timeout /t 3 /nobreak >nul
    echo ✅ WebSocket Server started!
) else (
    echo ❌ WebSocket server not found!
    pause
    exit /b 1
)

REM Start Desktop Spawner (optional)
if exist "desktop-client\desktop_spawner.py" (
    echo 🖥️  Starting Desktop Spawner...
    start "Desktop Spawner" python desktop-client\desktop_spawner.py
    timeout /t 2 /nobreak >nul
    echo ✅ Desktop Spawner started!
) else (
    echo ⚠️  Desktop spawner not found, skipping...
)

REM Start Frontend
echo 🎨 Starting Frontend...
start "Frontend Server" npm run dev
timeout /t 5 /nobreak >nul

echo.
echo 🎉 TRAE Unity AI Platform is ready!
echo 📊 Access points:
echo   • Frontend: http://localhost:8081
echo   • Multi-Desktop: http://localhost:8081/multi-desktop
echo   • WebSocket: ws://localhost:8084
echo.
echo 💡 Close the opened windows to stop services
pause