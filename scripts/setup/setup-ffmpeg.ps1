# FFmpeg Setup Script für TRAE Unity AI Platform
# Dieses Skript lädt FFmpeg herunter und richtet es für das Projekt ein

param(
    [switch]$Global = $false,
    [string]$InstallPath = ".\tools\ffmpeg"
)

# Ensure working directory is the project root when running from scripts/setup
Push-Location (Resolve-Path (Join-Path $PSScriptRoot "..\.."))

Write-Host "🎬 FFmpeg Setup für TRAE Unity AI Platform..." -ForegroundColor Green
Write-Host "📁 Installationspfad: $InstallPath" -ForegroundColor Yellow

# Erstelle Tools-Verzeichnis falls nicht vorhanden
$ToolsPath = ".\tools"
if (-not (Test-Path $ToolsPath)) {
    New-Item -ItemType Directory -Path $ToolsPath -Force | Out-Null
    Write-Host "📁 Tools-Verzeichnis erstellt: $ToolsPath" -ForegroundColor Green
}

# FFmpeg Download URL (Windows 64-bit essentials build)
$FFmpegUrl = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
$DownloadPath = ".\tools\ffmpeg-release-essentials.zip"
$ExtractPath = ".\tools\ffmpeg-temp"

Write-Host "⬇️  Lade FFmpeg herunter..." -ForegroundColor Cyan
try {
    # Download FFmpeg
    Invoke-WebRequest -Uri $FFmpegUrl -OutFile $DownloadPath -UseBasicParsing
    Write-Host "✅ FFmpeg erfolgreich heruntergeladen!" -ForegroundColor Green
} catch {
    Write-Host "❌ Fehler beim Herunterladen von FFmpeg: $($_.Exception.Message)" -ForegroundColor Red
    Pop-Location
    exit 1
}

Write-Host "📦 Extrahiere FFmpeg..." -ForegroundColor Cyan
try {
    # Extrahiere ZIP-Datei
    Expand-Archive -Path $DownloadPath -DestinationPath $ExtractPath -Force
    
    # Finde den extrahierten Ordner (normalerweise ffmpeg-*-essentials_build)
    $ExtractedFolder = Get-ChildItem -Path $ExtractPath -Directory | Where-Object { $_.Name -like "ffmpeg-*-essentials_build" } | Select-Object -First 1
    
    if ($ExtractedFolder) {
        # Kopiere bin-Verzeichnis zum Zielort
        $SourceBinPath = Join-Path $ExtractedFolder.FullName "bin"
        $TargetPath = $InstallPath
        
        if (Test-Path $TargetPath) {
            Remove-Item -Path $TargetPath -Recurse -Force
        }
        
        Copy-Item -Path $SourceBinPath -Destination $TargetPath -Recurse -Force
        Write-Host "✅ FFmpeg erfolgreich extrahiert nach: $TargetPath" -ForegroundColor Green
    } else {
        Write-Host "❌ Extrahierter FFmpeg-Ordner nicht gefunden!" -ForegroundColor Red
        Pop-Location
        exit 1
    }
} catch {
    Write-Host "❌ Fehler beim Extrahieren: $($_.Exception.Message)" -ForegroundColor Red
    Pop-Location
    exit 1
}

# Aufräumen
Write-Host "🧹 Räume temporäre Dateien auf..." -ForegroundColor Cyan
Remove-Item -Path $DownloadPath -Force -ErrorAction SilentlyContinue
Remove-Item -Path $ExtractPath -Recurse -Force -ErrorAction SilentlyContinue

# Teste FFmpeg Installation
$FFmpegExe = Join-Path $InstallPath "ffmpeg.exe"
if (Test-Path $FFmpegExe) {
    Write-Host "🧪 Teste FFmpeg Installation..." -ForegroundColor Cyan
    try {
        $FFmpegVersion = & $FFmpegExe -version 2>&1 | Select-Object -First 1
        Write-Host "✅ FFmpeg erfolgreich installiert!" -ForegroundColor Green
        Write-Host "📋 Version: $FFmpegVersion" -ForegroundColor Yellow
    } catch {
        Write-Host "⚠️  FFmpeg installiert, aber Test fehlgeschlagen: $($_.Exception.Message)" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ FFmpeg.exe nicht gefunden nach Installation!" -ForegroundColor Red
    Pop-Location
    exit 1
}

# Erstelle Wrapper-Skript für einfache Nutzung
$WrapperScript = @"
@echo off
REM FFmpeg Wrapper für TRAE Unity AI Platform
REM Dieses Skript ermöglicht die Nutzung von FFmpeg aus dem Projektverzeichnis

set FFMPEG_PATH=%~dp0tools\ffmpeg
set PATH=%FFMPEG_PATH%;%PATH%

REM Führe FFmpeg mit allen übergebenen Argumenten aus
"%FFMPEG_PATH%\ffmpeg.exe" %*
"@

$WrapperPath = ".\ffmpeg.bat"
$WrapperScript | Out-File -FilePath $WrapperPath -Encoding ASCII
Write-Host "✅ FFmpeg Wrapper erstellt: $WrapperPath" -ForegroundColor Green

Write-Host ""
Write-Host "🎉 FFmpeg Setup abgeschlossen!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Verwendung:" -ForegroundColor Yellow
Write-Host "  • Direkt: .\tools\ffmpeg\ffmpeg.exe -version" -ForegroundColor Cyan
Write-Host "  • Wrapper: .\ffmpeg.bat -version" -ForegroundColor Cyan
Write-Host "  • In Skripten: `$env:PATH += ';.\tools\ffmpeg'" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Tipp: Fügen Sie '.\tools\ffmpeg' zu Ihrer PATH-Umgebungsvariable hinzu" -ForegroundColor Yellow
Write-Host "    für systemweite Verfügbarkeit." -ForegroundColor Yellow

# Return to original directory before exiting
Pop-Location