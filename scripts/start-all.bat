@echo off
echo ============================================
echo   Starting Automation_ui + MoireTracker
echo ============================================
echo.

cd /d "%~dp0.."
echo [INFO] Project root: %CD%
echo.

echo [1/5] Starting FastAPI Backend (Port 8007)...
start "FastAPI Backend" cmd /k "cd /d %CD%\backend && python server.py"
echo       Started in new window
ping -n 3 127.0.0.1 > nul

echo [2/5] Starting MoireServer (Port 8766)...
if exist "moire_server\package.json" (
    start "MoireServer" cmd /k "cd /d %CD%\moire_server && npm run dev"
    echo       Started in new window
) else (
    echo       [SKIP] moire_server not found
)
ping -n 3 127.0.0.1 > nul

echo [3/5] Starting Moire Agents...
if exist "backend\moire_agents\worker_bridge\__main__.py" (
    start "Moire Agents" cmd /k "cd /d %CD%\backend\moire_agents && python -m worker_bridge"
    echo       Started in new window
) else (
    echo       [SKIP] worker_bridge not found
)
ping -n 2 127.0.0.1 > nul

echo [4/5] Starting Frontend (Port 3003)...
start "Frontend" cmd /k "cd /d %CD% && npm run dev"
echo       Started in new window
ping -n 3 127.0.0.1 > nul

echo [5/5] Starting Desktop Client...
if exist "desktop-client\dual_screen_capture_client.py" (
    start "Desktop Client" cmd /k "cd /d %CD%\desktop-client && python dual_screen_capture_client.py --server-url ws://localhost:8007/ws/live-desktop"
    echo       Started in new window (connecting to local backend)
) else (
    echo       [SKIP] Desktop client not found
)

echo.
echo ============================================
echo   All services launched!
echo ============================================
echo.
echo Services:
echo   - FastAPI Backend:  http://localhost:8007
echo   - MoireServer:      ws://localhost:8766
echo   - Frontend:         http://localhost:3003
echo   - Desktop Client:   Streaming
echo.
echo Quick Links:
echo   - Main Page:           http://localhost:3003/
echo   - Electron Automation: http://localhost:3003/electron
echo.
echo Opening browser in 3 seconds...
ping -n 4 127.0.0.1 > nul
start http://localhost:3003/electron
echo.
echo Done! Close terminal windows to stop services.
pause
