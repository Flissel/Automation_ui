# TRAE Unity AI Platform - Complete Application Startup Script
# This script starts all components of the desktop streaming application

param(
    [switch]$ShowLogs = $false,
    [switch]$SkipDesktopClient = $false,
    [string]$WebSocketPort = "8084",
    [string]$FrontendPort = "8081"
)

Write-Host "🚀 Starting TRAE Unity AI Platform..." -ForegroundColor Green
Write-Host "WebSocket Server Port: $WebSocketPort" -ForegroundColor Yellow
Write-Host "Frontend Port: $FrontendPort" -ForegroundColor Yellow

# Get the root directory of the project
$RootPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $RootPath

# Function to check if a port is available
function Test-Port {
    param([string]$Port)
    try {
        $portInt = [int]$Port
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $portInt)
        $listener.Start()
        $listener.Stop()
        return $true
    } catch {
        return $false
    }
}

# Function to wait for service to be ready
function Wait-ForService {
    param([string]$Url, [string]$ServiceName, [int]$TimeoutSeconds = 30)
    
    Write-Host "⏳ Waiting for $ServiceName to be ready..." -ForegroundColor Yellow
    $timeout = (Get-Date).AddSeconds($TimeoutSeconds)
    
    while ((Get-Date) -lt $timeout) {
        try {
            $response = Invoke-WebRequest -Uri $Url -Method GET -TimeoutSec 5 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                Write-Host "✅ $ServiceName is ready!" -ForegroundColor Green
                return $true
            }
        } catch {
            # Service not ready yet, continue waiting
        }
        Start-Sleep -Seconds 2
    }
    
    Write-Host "⚠️  $ServiceName did not become ready within $TimeoutSeconds seconds" -ForegroundColor Red
    return $false
}

# Check prerequisites
Write-Host "🔍 Checking prerequisites..." -ForegroundColor Cyan

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check npm
try {
    $npmVersion = npm --version
    Write-Host "✅ npm found: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm not found. Please install npm first." -ForegroundColor Red
    exit 1
}

# Check Python (only if not skipping desktop client)
if (-not $SkipDesktopClient) {
    try {
        $pythonVersion = python --version
        Write-Host "✅ Python found: $pythonVersion" -ForegroundColor Green
    } catch {
        Write-Host "❌ Python not found. Please install Python first." -ForegroundColor Red
        Write-Host "   Or use -SkipDesktopClient to start without desktop capture." -ForegroundColor Yellow
        exit 1
    }
}

# Check if ports are available
if (-not (Test-Port -Port $WebSocketPort)) {
    Write-Host "❌ Port $WebSocketPort is already in use. Please stop the service using this port or choose a different port." -ForegroundColor Red
    exit 1
}

Write-Host "✅ All prerequisites met!" -ForegroundColor Green
Write-Host ""

# Install frontend dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install frontend dependencies" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Frontend dependencies installed!" -ForegroundColor Green
}

# Install Python dependencies if needed (only if not skipping desktop client)
if (-not $SkipDesktopClient) {
    $desktopClientPath = Join-Path $RootPath "desktop-client"
    if (Test-Path $desktopClientPath) {
        Write-Host "📦 Installing Python dependencies for desktop client..." -ForegroundColor Cyan
        Set-Location $desktopClientPath
        
        # Check if requirements.txt exists
        if (Test-Path "requirements.txt") {
            pip install -r requirements.txt
            if ($LASTEXITCODE -ne 0) {
                Write-Host "❌ Failed to install Python dependencies" -ForegroundColor Red
                Set-Location $RootPath
                exit 1
            }
        } else {
            # Install common dependencies
            pip install websockets pillow pynput pyautogui
            if ($LASTEXITCODE -ne 0) {
                Write-Host "❌ Failed to install Python dependencies" -ForegroundColor Red
                Set-Location $RootPath
                exit 1
            }
        }
        
        Set-Location $RootPath
        Write-Host "✅ Python dependencies installed!" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "🚀 Starting services..." -ForegroundColor Green

# Array to store background jobs
$jobs = @()

# 1. Start WebSocket Server
Write-Host "🌐 Starting WebSocket Server on port $WebSocketPort..." -ForegroundColor Cyan
$wsServerPath = Join-Path $RootPath "local-websocket-server.js"

if (Test-Path $wsServerPath) {
    $wsJob = Start-Job -ScriptBlock {
        param($serverPath, $port)
        $env:WS_PORT = $port
        node $serverPath
    } -ArgumentList $wsServerPath, $WebSocketPort -Name "WebSocket-Server"
    
    $jobs += $wsJob
    Start-Sleep -Seconds 3
    
    # Verify WebSocket server is running
    $wsRunning = $false
    for ($i = 0; $i -lt 10; $i++) {
        $jobOutput = Receive-Job -Job $wsJob -Keep
        if ($jobOutput -match "WebSocket server listening on port $WebSocketPort") {
            $wsRunning = $true
            break
        }
        Start-Sleep -Seconds 1
    }
    
    if ($wsRunning) {
        Write-Host "✅ WebSocket Server started successfully!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  WebSocket Server may not have started properly. Check logs." -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ WebSocket server file not found at: $wsServerPath" -ForegroundColor Red
    exit 1
}

# 2. Start Desktop Spawner (only if not skipping desktop client)
if (-not $SkipDesktopClient) {
    Write-Host "🖥️  Starting Desktop Spawner Service..." -ForegroundColor Cyan
    $spawnerPath = Join-Path $RootPath "desktop-client\desktop_spawner.py"
    
    if (Test-Path $spawnerPath) {
        $spawnerJob = Start-Job -ScriptBlock {
            param($spawnerPath, $wsPort)
            $serverUrl = "ws://localhost:$wsPort"
            python $spawnerPath --server-url $serverUrl
        } -ArgumentList $spawnerPath, $WebSocketPort -Name "Desktop-Spawner"
        
        $jobs += $spawnerJob
        Start-Sleep -Seconds 3
        Write-Host "✅ Desktop Spawner Service started!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Desktop spawner not found at: $spawnerPath" -ForegroundColor Yellow
        Write-Host "   Desktop capture functionality will not be available." -ForegroundColor Yellow
    }
}

# 3. Start Frontend Development Server
Write-Host "🎨 Starting Frontend Development Server..." -ForegroundColor Cyan
$frontendJob = Start-Job -ScriptBlock {
    param($port)
    $env:PORT = $port
    npm run dev
} -ArgumentList $FrontendPort -Name "Frontend-Server"

$jobs += $frontendJob
Start-Sleep -Seconds 5

# Wait for frontend to be ready
$frontendReady = Wait-ForService -Url "http://localhost:$FrontendPort" -ServiceName "Frontend Server" -TimeoutSeconds 30

if ($frontendReady) {
    Write-Host "✅ Frontend Development Server started successfully!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Frontend server may not have started properly. Check logs." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 TRAE Unity AI Platform is ready!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Service Status:" -ForegroundColor Yellow
Write-Host "  • WebSocket Server: ws://localhost:$WebSocketPort" -ForegroundColor Cyan
Write-Host "  • Frontend Application: http://localhost:$FrontendPort" -ForegroundColor Cyan
Write-Host "  • Multi-Desktop Streams: http://localhost:$FrontendPort/multi-desktop" -ForegroundColor Cyan

if (-not $SkipDesktopClient) {
    Write-Host "  • Desktop Spawner: Connected to WebSocket server" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "🔗 Quick Links:" -ForegroundColor Yellow
Write-Host "  • Main Application: http://localhost:$FrontendPort" -ForegroundColor Cyan
Write-Host "  • Desktop Streaming: http://localhost:$FrontendPort/multi-desktop" -ForegroundColor Cyan

if ($ShowLogs) {
    Write-Host ""
    Write-Host "📋 Showing logs (Press Ctrl+C to stop all services)..." -ForegroundColor Yellow
    try {
        while ($true) {
            foreach ($job in $jobs) {
                $output = Receive-Job -Job $job -Keep
                if ($output) {
                    $timestamp = Get-Date -Format "HH:mm:ss"
                    Write-Host "[$timestamp][$($job.Name)] $output" -ForegroundColor Gray
                }
            }
            Start-Sleep -Seconds 1
        }
    } finally {
        Write-Host ""
        Write-Host "🛑 Stopping all services..." -ForegroundColor Red
        $jobs | Stop-Job -PassThru | Remove-Job
        Write-Host "✅ All services stopped!" -ForegroundColor Green
    }
} else {
    Write-Host ""
    Write-Host "ℹ️  Services are running in background." -ForegroundColor Blue
    Write-Host "📋 View logs with: Get-Job | Receive-Job" -ForegroundColor Cyan
    Write-Host "🛑 Stop all services with: Get-Job | Stop-Job; Get-Job | Remove-Job" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "💡 Tip: Use -ShowLogs parameter to see real-time logs" -ForegroundColor Yellow
    Write-Host "💡 Tip: Use -SkipDesktopClient to start without desktop capture" -ForegroundColor Yellow
}