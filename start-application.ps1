# TRAE Unity AI Platform - Startup Script mit Auto Dual Monitor Support
# Teil des autonomen Programmer Projekts

param(
    [switch]$ShowLogs = $false,
    [switch]$SkipDesktopClient = $false,
    [int]$WebSocketPort = 8084,
    [int]$FrontendPort = 5174,
    [switch]$AutoStartMonitors = $true
)

Write-Host "🚀 Starte TRAE Unity AI Platform mit Auto Dual Monitor Support" -ForegroundColor Green
Write-Host "WebSocket Port: $WebSocketPort" -ForegroundColor Yellow
Write-Host "Frontend Port: $FrontendPort" -ForegroundColor Yellow
Write-Host "Auto Start Monitors: $AutoStartMonitors" -ForegroundColor Yellow

# Erkenne Monitor-Setup
Write-Host "🖥️  Erkenne Monitor-Konfiguration..." -ForegroundColor Cyan
try {
    Add-Type -AssemblyName System.Windows.Forms
    $screens = [System.Windows.Forms.Screen]::AllScreens
    $monitorCount = $screens.Count
    
    Write-Host "Erkannte $monitorCount Monitor(e):" -ForegroundColor Green
    for ($i = 0; $i -lt $screens.Count; $i++) {
        $screen = $screens[$i]
        $isPrimary = if ($screen.Primary) { " (Primary)" } else { "" }
        Write-Host "  Monitor $($i + 1): $($screen.Bounds.Width)x$($screen.Bounds.Height)$isPrimary" -ForegroundColor Cyan
    }
} catch {
    Write-Host "⚠️  Fehler bei Monitor-Erkennung, verwende Fallback: 1 Monitor" -ForegroundColor Yellow
    $monitorCount = 1
}

# Prüfe Voraussetzungen
Write-Host "🔍 Prüfe Systemvoraussetzungen..." -ForegroundColor Cyan

try {
    $nodeVersion = & node --version 2>$null
    Write-Host "✅ Node.js gefunden: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js nicht gefunden" -ForegroundColor Red
    exit 1
}

try {
    $npmVersion = & npm --version 2>$null
    Write-Host "✅ npm gefunden: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm nicht gefunden" -ForegroundColor Red
    exit 1
}

try {
    $pythonVersion = & python --version 2>$null
    Write-Host "✅ Python gefunden: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python nicht gefunden" -ForegroundColor Red
    exit 1
}

# Installiere Dependencies
Write-Host "📦 Installiere Dependencies..." -ForegroundColor Cyan

Write-Host "  Frontend Dependencies..." -ForegroundColor Yellow
& npm install --silent
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend Dependencies Installation fehlgeschlagen" -ForegroundColor Red
    exit 1
}

Write-Host "  Python Dependencies..." -ForegroundColor Yellow
& python -m pip install -r desktop-client/requirements.txt --quiet
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Python Dependencies Installation fehlgeschlagen" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Alle Dependencies installiert" -ForegroundColor Green

# Starte Services
$jobs = @()

# WebSocket Server
Write-Host "🌐 Starte WebSocket Server..." -ForegroundColor Cyan
$wsJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    & node local-websocket-server.js
} -Name "WebSocket-Server"
$jobs += $wsJob

Start-Sleep -Seconds 3

# Frontend Server
Write-Host "🎨 Starte Frontend Development Server..." -ForegroundColor Cyan
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    & npm run dev
} -Name "Frontend-Server"
$jobs += $frontendJob

Start-Sleep -Seconds 5

# Auto Dual Monitor System (wenn aktiviert)
if ($AutoStartMonitors -and -not $SkipDesktopClient) {
    Write-Host "🖥️  Starte Auto Dual Monitor System..." -ForegroundColor Cyan
    $autoMonitorJob = Start-Job -ScriptBlock {
        param($serverUrl)
        Set-Location $using:PWD
        & python auto-start-dual-monitors.py --server-url $serverUrl
    } -ArgumentList "ws://localhost:$WebSocketPort" -Name "Auto-Monitor-System"
    $jobs += $autoMonitorJob
    
    Start-Sleep -Seconds 5
    Write-Host "✅ Auto Dual Monitor System gestartet" -ForegroundColor Green
}

# Warte auf Services
Write-Host "⏳ Warte auf Service-Initialisierung..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Zeige Status
Write-Host ""
Write-Host "🎉 TRAE Unity AI Platform erfolgreich gestartet!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 System-Status:" -ForegroundColor Yellow
Write-Host "  ✅ WebSocket Server: ws://localhost:$WebSocketPort" -ForegroundColor Cyan
Write-Host "  ✅ Frontend Server: http://localhost:$FrontendPort" -ForegroundColor Cyan
if ($AutoStartMonitors -and -not $SkipDesktopClient) {
    Write-Host "  ✅ Auto Monitor System: $monitorCount Monitor(e) erkannt" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "🌐 Hauptanwendung: http://localhost:$FrontendPort/" -ForegroundColor Green
Write-Host "📺 Desktop Streams: Automatisch verfügbar im Web-Interface" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Erwarte $monitorCount Monitor-Stream(s) im Web-Interface" -ForegroundColor Yellow
Write-Host ""

if ($ShowLogs) {
    Write-Host "📋 Zeige Logs (Drücken Sie Ctrl+C zum Beenden)..." -ForegroundColor Yellow
    try {
        while ($true) {
            foreach ($job in $jobs) {
                $output = Receive-Job -Job $job -Keep
                if ($output) {
                    $timestamp = Get-Date -Format "HH:mm:ss"
                    Write-Host "[$timestamp][$($job.Name)] $output" -ForegroundColor Gray
                }
            }
            Start-Sleep -Seconds 2
        }
    } finally {
        Write-Host ""
        Write-Host "🛑 Beende alle Services..." -ForegroundColor Red
        $jobs | Stop-Job -PassThru | Remove-Job
        Write-Host "✅ Alle Services beendet!" -ForegroundColor Green
    }
} else {
    Write-Host "ℹ️  Services laufen im Hintergrund." -ForegroundColor Blue
    Write-Host "📋 Logs anzeigen: Get-Job | Receive-Job" -ForegroundColor Cyan
    Write-Host "🛑 Services beenden: Get-Job | Stop-Job; Get-Job | Remove-Job" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🔧 Zum Beenden: Drücken Sie eine beliebige Taste..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    
    Write-Host ""
    Write-Host "🛑 Beende alle Services..." -ForegroundColor Red
    $jobs | Stop-Job -PassThru | Remove-Job
    Write-Host "✅ Alle Services beendet!" -ForegroundColor Green
}