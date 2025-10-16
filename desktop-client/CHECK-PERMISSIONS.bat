@echo off
REM Desktop Client Permission Checker
REM This checks if screen capture permissions are configured correctly

echo.
echo ========================================
echo   Desktop Client Diagnostics
echo ========================================
echo.
echo Checking:
echo   - Screen capture permissions
echo   - Monitor configuration
echo   - Python MSS capture test
echo.
pause

powershell -ExecutionPolicy Bypass -File "%~dp0check-screen-capture-permissions.ps1"

echo.
echo ========================================
echo   Diagnostics Complete!
echo ========================================
echo.
pause
