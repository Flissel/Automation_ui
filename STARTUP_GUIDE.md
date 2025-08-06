# TRAE Unity AI Platform - Startup Guide

This guide explains how to start the complete TRAE Unity AI Platform application, including the frontend, WebSocket server, and desktop capture services.

## 🚀 Quick Start

### Windows Users

#### Option 1: Simple Batch Files (Easiest)
```bash
# Start all services
.\start-all.bat

# Stop all services
.\stop-all.bat
```

#### Option 2: Interactive Batch File (Recommended)
```bash
# Double-click or run from command prompt
start-application.bat
```

This will present you with a menu:
1. **Start with logs** - Shows real-time logs from all services (recommended for development)
2. **Start in background** - Runs services in background (recommended for production)
3. **Start without desktop capture** - Frontend + WebSocket only (if you don't need desktop streaming)

#### Option 3: PowerShell Script (Advanced)
```powershell
# Basic startup
.\start-application.ps1

# With real-time logs
.\start-application.ps1 -ShowLogs

# Without desktop capture
.\start-application.ps1 -SkipDesktopClient

# Custom ports
.\start-application.ps1 -WebSocketPort 8085 -FrontendPort 3000
```

### Linux/macOS Users

```bash
# Make script executable (first time only)
chmod +x start-application.sh

# Basic startup
./start-application.sh

# With real-time logs
./start-application.sh --show-logs

# Without desktop capture
./start-application.sh --skip-desktop-client

# Custom ports
./start-application.sh --websocket-port 8085 --frontend-port 3000

# Show help
./start-application.sh --help
```

## 📋 Prerequisites

### Required Software

1. **Node.js** (v16 or higher)
   - Download from: https://nodejs.org/
   - Verify: `node --version`

2. **npm** (comes with Node.js)
   - Verify: `npm --version`

3. **Python** (v3.8 or higher) - *Only needed for desktop capture*
   - Download from: https://python.org/
   - Verify: `python --version` or `python3 --version`

4. **FFmpeg** (optional for media processing)
   - Automatic setup available through startup scripts
   - Manual download: https://ffmpeg.org/

### Automatic Dependency Installation

The startup scripts will automatically:
- Install Node.js dependencies (`npm install`)
- Install Python dependencies from `desktop-client/requirements.txt`
- Check if required ports are available
- Verify all prerequisites are met

## 🌐 Services Overview

When you start the application, the following services will be launched:

### 1. WebSocket Server
- **Port**: 8084 (default)
- **Purpose**: Handles real-time communication between frontend and desktop clients
- **File**: `local-websocket-server.js`

### 2. Frontend Development Server
- **Port**: 8081 (default, auto-switches if 8080 is busy)
- **Purpose**: Serves the React application
- **Command**: `npm run dev`

### 3. Desktop Spawner Service *(Optional)*
- **Purpose**: Manages desktop capture clients for screen streaming
- **File**: `desktop-client/desktop_spawner.py`
- **Dependencies**: Python packages from `requirements.txt`

## 🔗 Access Points

Once started, you can access:

- **Main Application**: http://localhost:8081
- **Multi-Desktop Streaming**: http://localhost:8081/multi-desktop
- **WebSocket Server**: ws://localhost:8084

## 🛠️ Troubleshooting

### Common Issues

#### Port Already in Use
```
❌ Port 8084 is already in use
```
**Solution**: Stop the service using the port or use custom ports:
```powershell
# Windows
.\start-application.ps1 -WebSocketPort 8085 -FrontendPort 3001

# Linux/macOS
./start-application.sh --websocket-port 8085 --frontend-port 3001
```

#### Python Dependencies Failed
```
❌ Failed to install Python dependencies
```
**Solutions**:
1. Ensure Python is installed and in PATH
2. Try installing manually:
   ```bash
   cd desktop-client
   pip install -r requirements.txt
   ```
3. Or skip desktop capture:
   ```bash
   # Windows
   .\start-application.ps1 -SkipDesktopClient
   
   # Linux/macOS
   ./start-application.sh --skip-desktop-client
   ```

#### Node.js Dependencies Failed
```
❌ Failed to install frontend dependencies
```
**Solution**: Install manually:
```bash
npm install
```

### Checking Service Status

#### Windows (PowerShell)
```powershell
# View running background jobs
Get-Job

# View logs from background jobs
Get-Job | Receive-Job

# Stop all background jobs
Get-Job | Stop-Job; Get-Job | Remove-Job
```

#### Linux/macOS
```bash
# Check if services are running
ps aux | grep -E "(node|python.*desktop)"

# Check specific ports
lsof -i :8081  # Frontend
lsof -i :8084  # WebSocket

# Kill specific processes
kill <PID>
```

## 🔧 Advanced Configuration

### FFmpeg Setup

Für Media-Verarbeitung (Video/Audio) installieren Sie FFmpeg:

```batch
# Automatisches FFmpeg-Setup (Windows)
setup-ffmpeg.bat
```

Das Skript:
- Lädt FFmpeg automatisch herunter
- Installiert es im `tools/ffmpeg/` Verzeichnis
- Erstellt einen Wrapper für einfache Nutzung
- Testet die Installation

### Environment Variables

You can customize the application by setting environment variables:

```bash
# WebSocket server port
export WS_PORT=8084

# Frontend port
export PORT=8081

# Development mode
export NODE_ENV=development
```

### Manual Service Startup

If you prefer to start services individually:

```bash
# 1. Start WebSocket server
node local-websocket-server.js

# 2. Start frontend (in another terminal)
npm run dev

# 3. Start desktop spawner (in another terminal)
cd desktop-client
python desktop_spawner.py --server-url ws://localhost:8084
```

## 📊 Monitoring and Logs

### Real-time Logs
Use the `-ShowLogs` (Windows) or `--show-logs` (Linux/macOS) option to see real-time output from all services.

### Individual Service Logs
When running in background mode, you can check logs for specific services:

```powershell
# Windows - Check specific job logs
Get-Job -Name "WebSocket-Server" | Receive-Job
Get-Job -Name "Frontend-Server" | Receive-Job
Get-Job -Name "Desktop-Spawner" | Receive-Job
```

## 🛑 Stopping Services

### Graceful Shutdown
- **With logs mode**: Press `Ctrl+C` to stop all services
- **Background mode**: Use the provided commands to stop background jobs

### Force Stop (if needed)
```bash
# Windows
taskkill /f /im node.exe
taskkill /f /im python.exe

# Linux/macOS
pkill -f "node.*local-websocket-server"
pkill -f "npm.*run.*dev"
pkill -f "python.*desktop_spawner"
```

## 💡 Tips

1. **Development**: Use the logs mode (`-ShowLogs` / `--show-logs`) to see real-time output
2. **Production**: Use background mode for cleaner terminal experience
3. **Testing**: Use `--skip-desktop-client` if you only need to test the frontend
4. **Custom Ports**: Useful when default ports are occupied by other services
5. **Multiple Instances**: You can run multiple instances with different ports for testing

## 🆘 Getting Help

If you encounter issues:

1. Check this troubleshooting guide
2. Ensure all prerequisites are installed
3. Try starting with logs to see detailed error messages
4. Check if ports are available
5. Verify file permissions (especially on Linux/macOS)

For more detailed information about the application architecture, see the main README.md file.