@echo off
echo 🧪 FFmpeg Test für TRAE Unity AI Platform
echo.

REM Überprüfe FFmpeg-Installation
if not exist "tools\ffmpeg\ffmpeg.exe" (
    echo ❌ FFmpeg nicht gefunden!
    echo Führen Sie zuerst setup-ffmpeg.bat aus.
    pause
    exit /b 1
)

echo ✅ FFmpeg gefunden

REM Zeige FFmpeg-Version
echo.
echo 📋 FFmpeg Version:
tools\ffmpeg\ffmpeg.exe -version | findstr "ffmpeg version"

REM Zeige verfügbare Codecs
echo.
echo 🎬 Verfügbare Video-Codecs:
tools\ffmpeg\ffmpeg.exe -codecs | findstr "DEV" | findstr -i "h264\|h265\|vp9\|av1"

echo.
echo 🎵 Verfügbare Audio-Codecs:
tools\ffmpeg\ffmpeg.exe -codecs | findstr "DEA" | findstr -i "aac\|mp3\|opus"

REM Erstelle Test-Video (5 Sekunden, 640x480, rot)
echo.
echo 🎥 Erstelle Test-Video...
if not exist "test-output" mkdir test-output

tools\ffmpeg\ffmpeg.exe -f lavfi -i "testsrc=duration=5:size=640x480:rate=30" -f lavfi -i "sine=frequency=1000:duration=5" -c:v libx264 -c:a aac -t 5 test-output\test-video.mp4 -y

if exist "test-output\test-video.mp4" (
    echo ✅ Test-Video erstellt: test-output\test-video.mp4
    
    REM Hole Video-Informationen
    echo.
    echo 📊 Video-Informationen:
    tools\ffmpeg\ffmpeg.exe -i test-output\test-video.mp4 -f null - 2>&1 | findstr "Duration\|Video\|Audio"
    
    REM Erstelle Thumbnail
    echo.
    echo 📸 Erstelle Thumbnail...
    tools\ffmpeg\ffmpeg.exe -i test-output\test-video.mp4 -ss 00:00:02 -vframes 1 test-output\thumbnail.jpg -y
    
    if exist "test-output\thumbnail.jpg" (
        echo ✅ Thumbnail erstellt: test-output\thumbnail.jpg
    )
    
    REM Extrahiere Audio
    echo.
    echo 🎵 Extrahiere Audio...
    tools\ffmpeg\ffmpeg.exe -i test-output\test-video.mp4 -vn -acodec mp3 test-output\audio.mp3 -y
    
    if exist "test-output\audio.mp3" (
        echo ✅ Audio extrahiert: test-output\audio.mp3
    )
    
    REM Komprimiere Video
    echo.
    echo 🗜️ Komprimiere Video...
    tools\ffmpeg\ffmpeg.exe -i test-output\test-video.mp4 -c:v libx264 -crf 28 -preset fast test-output\compressed.mp4 -y
    
    if exist "test-output\compressed.mp4" (
        echo ✅ Video komprimiert: test-output\compressed.mp4
        
        REM Vergleiche Dateigrößen
        echo.
        echo 📏 Dateigröße-Vergleich:
        for %%f in (test-output\test-video.mp4) do echo Original: %%~zf Bytes
        for %%f in (test-output\compressed.mp4) do echo Komprimiert: %%~zf Bytes
    )
    
) else (
    echo ❌ Test-Video konnte nicht erstellt werden
)

echo.
echo 🎉 FFmpeg-Test abgeschlossen!
echo.
echo 📁 Test-Dateien in: test-output\
echo   • test-video.mp4 (Original)
echo   • thumbnail.jpg (Thumbnail)
echo   • audio.mp3 (Extrahiertes Audio)
echo   • compressed.mp4 (Komprimiert)
echo.
pause