# TRAE Unity AI Platform - Simple Startup Script
param(
    [switch]$ShowLogs = $false,
    [int]$WebSocketPort = 8084,
    [int]$FrontendPort = 5174
)

Write-Host "Starting TRAE Unity AI Platform..." -ForegroundColor Green

# Check prerequisites
Write-Host "Checking Node.js..." -ForegroundColor Cyan
$nodeCheck = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCheck) {
    Write-Host "Node.js not found!" -ForegroundColor Red
    exit 1
}
Write-Host "Node.js found" -ForegroundColor Green

Write-Host "Checking Python..." -ForegroundColor Cyan
$pythonCheck = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCheck) {
    Write-Host "Python not found!" -ForegroundColor Red
    exit 1
}
Write-Host "Python found" -ForegroundColor Green

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install npm dependencies" -ForegroundColor Red
    exit 1
}

python -m pip install -r desktop-client/requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install Python dependencies" -ForegroundColor Red
    exit 1
}

# Start services
Write-Host "Starting WebSocket server..." -ForegroundColor Cyan
$wsJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    node local-websocket-server.js
}

Start-Sleep -Seconds 3

Write-Host "Starting frontend server..." -ForegroundColor Cyan
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    npm run dev
}

Start-Sleep -Seconds 5

Write-Host "Starting auto monitor system..." -ForegroundColor Cyan
$monitorJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    python auto-start-dual-monitors.py --server-url "ws://localhost:8084"
}

Start-Sleep -Seconds 5

Write-Host ""
Write-Host "TRAE Unity AI Platform started successfully!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:$FrontendPort" -ForegroundColor Cyan
Write-Host "WebSocket: ws://localhost:$WebSocketPort" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to stop all services..." -ForegroundColor Yellow

$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Write-Host "Stopping services..." -ForegroundColor Red
Get-Job | Stop-Job
Get-Job | Remove-Job
Write-Host "All services stopped!" -ForegroundColor Green