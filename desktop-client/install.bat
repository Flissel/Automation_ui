@echo off
echo Installing Desktop Capture Client for TRAE Unity AI Platform
echo.

:: Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

:: Install required packages
echo Installing required Python packages...
pip install -r requirements.txt

if errorlevel 1 (
    echo ERROR: Failed to install requirements
    pause
    exit /b 1
)

echo.
echo Installation completed successfully!
echo.
echo To start the desktop client, run:
echo python desktop_capture_client.py
echo.
pause