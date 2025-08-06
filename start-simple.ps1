# Simple TRAE Unity AI Platform Startup Script
param(
    [switch]$SkipDesktopClient = $false,
    [string]$WebSocketPort = "8084",
    [string]$FrontendPort = "8081"
)

Write-Host "🚀 Starting TRAE Unity AI Platform..." -ForegroundColor Green

# Get the root directory
$RootPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $RootPath

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
    npm install
}

Write-Host "🚀 Starting services..." -ForegroundColor Green

# Start WebSocket Server
Write-Host "🌐 Starting WebSocket Server..." -ForegroundColor Cyan
$wsServerPath = "local-websocket-server.js"
if (Test-Path $wsServerPath) {
    Start-Process -FilePath "node" -ArgumentList $wsServerPath -WindowStyle Hidden
    Start-Sleep -Seconds 3
    Write-Host "✅ WebSocket Server started!" -ForegroundColor Green
} else {
    Write-Host "❌ WebSocket server not found!" -ForegroundColor Red
    exit 1
}

# Start Desktop Spawner (if not skipped)
if (-not $SkipDesktopClient) {
    $spawnerPath = "desktop-client\desktop_spawner.py"
    if (Test-Path $spawnerPath) {
        Write-Host "🖥️  Starting Desktop Spawner..." -ForegroundColor Cyan
        Start-Process -FilePath "python" -ArgumentList $spawnerPath -WindowStyle Hidden
        Start-Sleep -Seconds 2
        Write-Host "✅ Desktop Spawner started!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Desktop spawner not found, skipping..." -ForegroundColor Yellow
    }
}

# Start Frontend
Write-Host "🎨 Starting Frontend..." -ForegroundColor Cyan
Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WindowStyle Hidden
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "🎉 TRAE Unity AI Platform is ready!" -ForegroundColor Green
Write-Host "📊 Access points:" -ForegroundColor Yellow
Write-Host "  • Frontend: http://localhost:$FrontendPort" -ForegroundColor Cyan
Write-Host "  • Multi-Desktop: http://localhost:$FrontendPort/multi-desktop" -ForegroundColor Cyan
Write-Host "  • WebSocket: ws://localhost:$WebSocketPort" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 To stop services, close the terminal or use Task Manager" -ForegroundColor Yellow