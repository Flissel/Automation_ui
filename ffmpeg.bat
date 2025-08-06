@echo off 
REM FFmpeg Wrapper für TRAE Unity AI Platform 
set FFMPEG_PATH=%~dp0tools\ffmpeg 
"%FFMPEG_PATH%\ffmpeg.exe" %* 
