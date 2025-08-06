@echo off
echo 🛑 Stopping TRAE Unity AI Platform services...

REM Stop Node.js processes (WebSocket server and frontend)
echo 🌐 Stopping WebSocket Server and Frontend...
taskkill /f /im node.exe >nul 2>&1
if errorlevel 1 (
    echo ⚠️  No Node.js processes found
) else (
    echo ✅ Node.js processes stopped
)

REM Stop Python processes (Desktop spawner and capture clients)
echo 🖥️  Stopping Desktop services...
taskkill /f /im python.exe >nul 2>&1
if errorlevel 1 (
    echo ⚠️  No Python processes found
) else (
    echo ✅ Python processes stopped
)

REM Stop npm processes
echo 📦 Stopping npm processes...
taskkill /f /im npm.cmd >nul 2>&1
taskkill /f /im npm.exe >nul 2>&1

echo.
echo ✅ All TRAE Unity AI Platform services stopped!
echo.
pause