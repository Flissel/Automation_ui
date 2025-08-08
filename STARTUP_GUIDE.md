# TRAE Unity AI Platform - Startup Guide

This guide explains how to start the complete TRAE Unity AI Platform application with multi-monitor desktop streaming capabilities.

## 🚀 Current Working Setup (Recommended)

### **Multi-Monitor Desktop Streaming** ✅ TESTED & WORKING

The current setup uses individual services for optimal performance:

```powershell
# 1. Start WebSocket Server (Port 8085)
$env:WS_PORT=8085; node local-websocket-server.js

# 2. Start Primary Monitor Client (Monitor 0)
python desktop-client\multi_monitor_capture_client.py --server-url ws://localhost:8085 --client-id primary --capture-mode primary_only --disable-inactive-detection

# 3. Start Secondary Monitor Client (Monitor 1) 
python desktop-client\multi_monitor_capture_client.py --server-url ws://localhost:8085 --client-id secondary --capture-mode secondary_only --disable-inactive-detection

# 4. Start Frontend Development Server
npm run dev
```

**Access Points:**
- **Main Application**: http://localhost:5174
- **Multi-Desktop Streaming**: http://localhost:5174/multi-desktop ⭐ **RECOMMENDED**
- **WebSocket Server**: ws://localhost:8085

## 🛠️ Alternative Startup Methods

### Option 1: PowerShell Script (Advanced Users)
```powershell
# Full featured startup with options
.\start-application.ps1 -ShowLogs -WebSocketPort 8085

# Simple startup without desktop capture
.\start-application.ps1 -SkipDesktopClient
```

### Option 2: Batch File (Quick Start)
```batch
# Simple all-in-one startup
.\start-all.bat
```

**Note:** The batch file uses older configuration and may need port adjustments.

### Option 3: Individual Service Management (Expert Users)
```powershell
# Manual service startup for maximum control
# Terminal 1: WebSocket Server
$env:WS_PORT=8085; node local-websocket-server.js

# Terminal 2: Primary Monitor Client  
python desktop-client\multi_monitor_capture_client.py --server-url ws://localhost:8085 --client-id primary --capture-mode primary_only --disable-inactive-detection

# Terminal 3: Secondary Monitor Client
python desktop-client\multi_monitor_capture_client.py --server-url ws://localhost:8085 --client-id secondary --capture-mode secondary_only --disable-inactive-detection

# Terminal 4: Frontend
npm run dev
```

## 🛠️ **Multi-Monitor Window Management**

### Move Frontend to Secondary Monitor
```powershell
# Automatically move browser window to secondary monitor
.\move-frontend-to-secondary.ps1
```

**Features:**
- Automatic browser window detection
- Secondary monitor positioning (1920x1080 offset)
- Window maximization on target monitor
- Resolves black screen issues on secondary displays

## 🛑 **Stopping Services**

```batch
# Stop all services cleanly
.\stop-all.bat
```

This will terminate:
- All Node.js processes (WebSocket server, frontend)
- All Python processes (desktop capture clients)
- All npm processes

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