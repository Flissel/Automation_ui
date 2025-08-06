@echo off
echo 🎬 FFmpeg Setup für TRAE Unity AI Platform...

REM Erstelle Tools-Verzeichnis
if not exist "tools" mkdir tools
if not exist "tools\ffmpeg" mkdir tools\ffmpeg

echo ⬇️  Lade FFmpeg herunter...

REM Download FFmpeg mit PowerShell
powershell -Command "& {Invoke-WebRequest -Uri 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip' -OutFile 'tools\ffmpeg-release-essentials.zip' -UseBasicParsing}"

if not exist "tools\ffmpeg-release-essentials.zip" (
    echo ❌ Download fehlgeschlagen!
    pause
    exit /b 1
)

echo 📦 Extrahiere FFmpeg...

REM Extrahiere mit PowerShell
powershell -Command "& {Expand-Archive -Path 'tools\ffmpeg-release-essentials.zip' -DestinationPath 'tools\ffmpeg-temp' -Force}"

REM Finde und kopiere FFmpeg-Binärdateien
for /d %%i in (tools\ffmpeg-temp\ffmpeg-*-essentials_build) do (
    if exist "%%i\bin" (
        echo 📁 Kopiere FFmpeg-Binärdateien...
        xcopy "%%i\bin\*" "tools\ffmpeg\" /Y /Q
    )
)

REM Aufräumen
if exist "tools\ffmpeg-release-essentials.zip" del "tools\ffmpeg-release-essentials.zip"
if exist "tools\ffmpeg-temp" rmdir /s /q "tools\ffmpeg-temp"

REM Teste Installation
if exist "tools\ffmpeg\ffmpeg.exe" (
    echo ✅ FFmpeg erfolgreich installiert!
    echo 🧪 Teste Installation...
    tools\ffmpeg\ffmpeg.exe -version | findstr "ffmpeg version"
) else (
    echo ❌ FFmpeg Installation fehlgeschlagen!
    pause
    exit /b 1
)

REM Erstelle Wrapper-Batch-Datei
echo @echo off > ffmpeg.bat
echo REM FFmpeg Wrapper für TRAE Unity AI Platform >> ffmpeg.bat
echo set FFMPEG_PATH=%%~dp0tools\ffmpeg >> ffmpeg.bat
echo "%%FFMPEG_PATH%%\ffmpeg.exe" %%* >> ffmpeg.bat

echo.
echo 🎉 FFmpeg Setup abgeschlossen!
echo.
echo 📋 Verwendung:
echo   • Direkt: tools\ffmpeg\ffmpeg.exe -version
echo   • Wrapper: ffmpeg.bat -version
echo.
echo 💡 FFmpeg ist jetzt im Projektverzeichnis verfügbar!
pause