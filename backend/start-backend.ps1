# Virtual Desktop Backend Startup Script
# This script starts all backend services for the Virtual Desktop Management System

param(
    [string]$Environment = "development",
    [switch]$UseDocker = $false,
    [switch]$BuildImages = $false,
    [switch]$ShowLogs = $false
)

Write-Host "🚀 Starting Virtual Desktop Backend Services..." -ForegroundColor Green
Write-Host "Environment: $Environment" -ForegroundColor Yellow

# Set working directory to backend folder
$BackendPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $BackendPath

# Check if .env file exists
if (-not (Test-Path "config/.env")) {
    Write-Host "⚠️  .env file not found. Creating from example..." -ForegroundColor Yellow
    Copy-Item "config/.env.example" "config/.env"
    Write-Host "📝 Please edit config/.env with your configuration before continuing." -ForegroundColor Red
    Write-Host "Press any key to continue after editing .env file..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

if ($UseDocker) {
    Write-Host "🐳 Starting services with Docker..." -ForegroundColor Blue
    
    # Change to docker directory
    Set-Location "docker"
    
    if ($BuildImages) {
        Write-Host "🔨 Building Docker images..." -ForegroundColor Yellow
        docker-compose build
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Failed to build Docker images" -ForegroundColor Red
            exit 1
        }
    }
    
    # Start services
    Write-Host "🚀 Starting Docker containers..." -ForegroundColor Green
    if ($ShowLogs) {
        docker-compose up
    } else {
        docker-compose up -d
        Write-Host "✅ Services started in background" -ForegroundColor Green
        Write-Host "📊 Check status with: docker-compose ps" -ForegroundColor Cyan
        Write-Host "📋 View logs with: docker-compose logs -f [service-name]" -ForegroundColor Cyan
    }
    
} else {
    Write-Host "💻 Starting services locally..." -ForegroundColor Blue
    
    # Check if Deno is installed
    try {
        $denoVersion = deno --version
        Write-Host "✅ Deno found: $($denoVersion.Split("`n")[0])" -ForegroundColor Green
    } catch {
        Write-Host "❌ Deno not found. Please install Deno first." -ForegroundColor Red
        Write-Host "Visit: https://deno.land/manual/getting_started/installation" -ForegroundColor Cyan
        exit 1
    }
    
    # Load environment variables
    if (Test-Path "config/.env") {
        Get-Content "config/.env" | ForEach-Object {
            if ($_ -match "^([^#][^=]+)=(.*)$") {
                [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
            }
        }
        Write-Host "✅ Environment variables loaded" -ForegroundColor Green
    }
    
    # Start services in background
    $services = @(
        @{
            Name = "Virtual Desktop Service"
            Script = "services/virtual-desktop-service.ts"
            Port = 8000
        },
        @{
            Name = "Workflow Orchestrator"
            Script = "services/workflow-orchestrator.ts"
            Port = 8001
        },
        @{
            Name = "API Gateway"
            Script = "api/gateway.ts"
            Port = 8080
        }
    )
    
    $jobs = @()
    
    foreach ($service in $services) {
        Write-Host "🚀 Starting $($service.Name) on port $($service.Port)..." -ForegroundColor Cyan
        
        $job = Start-Job -ScriptBlock {
            param($script, $port)
            $env:SERVICE_PORT = $port
            deno run --allow-net --allow-env --allow-read --allow-write $script
        } -ArgumentList $service.Script, $service.Port -Name $service.Name
        
        $jobs += $job
        Start-Sleep -Seconds 2
    }
    
    Write-Host "✅ All services started!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Service Status:" -ForegroundColor Yellow
    foreach ($service in $services) {
        Write-Host "  • $($service.Name): http://localhost:$($service.Port)" -ForegroundColor Cyan
    }
    
    Write-Host ""
    Write-Host "🔗 API Endpoints:" -ForegroundColor Yellow
    Write-Host "  • API Gateway: http://localhost:8080" -ForegroundColor Cyan
    Write-Host "  • Health Check: http://localhost:8080/health" -ForegroundColor Cyan
    Write-Host "  • API Docs: http://localhost:8080/api/docs" -ForegroundColor Cyan
    
    if ($ShowLogs) {
        Write-Host ""
        Write-Host "📋 Showing logs (Press Ctrl+C to stop)..." -ForegroundColor Yellow
        try {
            while ($true) {
                foreach ($job in $jobs) {
                    $output = Receive-Job -Job $job -Keep
                    if ($output) {
                        Write-Host "[$($job.Name)] $output" -ForegroundColor Gray
                    }
                }
                Start-Sleep -Seconds 1
            }
        } finally {
            Write-Host "🛑 Stopping services..." -ForegroundColor Red
            $jobs | Stop-Job
            $jobs | Remove-Job
        }
    } else {
        Write-Host ""
        Write-Host "ℹ️  Services are running in background jobs." -ForegroundColor Blue
        Write-Host "📋 View logs with: Get-Job | Receive-Job" -ForegroundColor Cyan
        Write-Host "🛑 Stop services with: Get-Job | Stop-Job; Get-Job | Remove-Job" -ForegroundColor Cyan
    }
}

Write-Host ""
Write-Host "🎉 Virtual Desktop Backend is ready!" -ForegroundColor Green
Write-Host "📖 Visit http://localhost:8080/api/docs for API documentation" -ForegroundColor Cyan