@echo off
setlocal ENABLEDELAYEDEXPANSION

REM 🚀 Starting TRAE Unity AI Platform...
echo 🚀 Starting TRAE Unity AI Platform...

REM Resolve script directory to project root
set SCRIPT_DIR=%~dp0
pushd "%SCRIPT_DIR%..\"
set PROJECT_ROOT=%CD%
popd

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js not found. Please install Node.js first.
    pause
    exit /b 1
)

REM Check FFmpeg availability
if exist "%PROJECT_ROOT%\tools\ffmpeg\ffmpeg.exe" (
    echo ✅ FFmpeg found
) else (
    echo ⚠️  FFmpeg not found - run scripts\setup\setup-ffmpeg.bat (or .ps1) for media processing
)

REM Install dependencies if needed
if not exist "%PROJECT_ROOT%\node_modules" (
    echo 📦 Installing dependencies...
    call npm install
)

echo 🚀 Starting services...

REM Start WebSocket Server
echo 🌐 Starting WebSocket Server...
if exist "%PROJECT_ROOT%\scripts\dev\local-websocket-server.js" (
    start "WebSocket Server" node "%PROJECT_ROOT%\scripts\dev\local-websocket-server.js"
    timeout /t 3 /nobreak >nul
    echo ✅ WebSocket Server started!
) else (
    echo [WARN] WebSocket server script not found at %PROJECT_ROOT%\scripts\dev\local-websocket-server.js
)

REM Start Desktop Spawner (optional)
if exist "%PROJECT_ROOT%\desktop-client\desktop_spawner.py" (
    echo 🖥️  Starting Desktop Spawner...
    start "Desktop Spawner" python "%PROJECT_ROOT%\desktop-client\desktop_spawner.py"
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
endlocal