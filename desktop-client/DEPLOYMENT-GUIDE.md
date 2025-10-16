# Desktop Client Deployment Guide

## Overview

This guide explains how to deploy the desktop client with **frontend button control** via subprocess API.

## Architecture

```
React Frontend (Button Click)
    ↓ HTTP Request
Backend API (Express on port 3001)
    ↓ subprocess.spawn()
PowerShell Scripts (Windows)
    ↓
Windows Registry & Task Scheduler
```

## Quick Start

### 1. Start the Setup API Server

**Option A: With Administrator Privileges (Required for full functionality)**
```bash
# Right-click START-SETUP-API.bat → Run as administrator
START-SETUP-API.bat
```

**Option B: Command Line**
```bash
cd desktop-client
node setup-api.js
```

### 2. Start the React Frontend

```bash
npm run dev
```

### 3. Access the Setup Page

Open browser: `http://localhost:5173/desktop-setup`

### 4. Click "Run Permission Setup" Button

The frontend will:
- Send POST request to `http://localhost:3001/api/setup/run-permissions`
- Backend spawns PowerShell process
- Real-time output streamed to browser via Server-Sent Events (SSE)
- User sees live setup progress

## API Endpoints

### GET /api/setup/check-admin
Check if API server has administrator privileges

**Response:**
```json
{
  "isAdmin": true,
  "message": "Server has administrator privileges"
}
```

### POST /api/setup/run-permissions
Run the permission setup script (requires admin)

**Response:** Server-Sent Events (SSE) stream
```
data: {"type":"info","message":"Starting permission setup..."}
data: {"type":"stdout","message":"✅ Screen capture enabled globally"}
data: {"type":"success","message":"Setup completed successfully!"}
```

### POST /api/setup/check-permissions
Run diagnostic script

**Response:** SSE stream with diagnostic output

### POST /api/setup/restart-client
Restart the desktop capture client

**Response:**
```json
{
  "success": true,
  "message": "Desktop client restarted",
  "pid": 12345
}
```

### GET /api/setup/status
Check if desktop client is running

**Response:**
```json
{
  "clientRunning": true,
  "message": "Desktop client is running"
}
```

## Frontend Component

The `DesktopClientSetup.tsx` component provides:
- ✅ Admin status indicator
- ✅ Desktop client status with real-time polling
- ✅ One-click permission setup button
- ✅ Diagnostics button
- ✅ Restart client button
- ✅ Live output logs with color-coded messages
- ✅ Auto-scrolling log viewer
- ✅ Manual setup instructions fallback

## How It Works

### 1. Frontend Button Click
```typescript
const handleRunSetup = async () => {
  const response = await fetch('http://localhost:3001/api/setup/run-permissions', {
    method: 'POST'
  });

  // Read Server-Sent Events stream
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    // Parse and display logs in real-time
  }
};
```

### 2. Backend Subprocess Execution
```javascript
function runPowerShellScript(scriptPath, res) {
  const powershell = spawn('powershell.exe', [
    '-ExecutionPolicy', 'Bypass',
    '-File', scriptPath
  ]);

  powershell.stdout.on('data', (data) => {
    // Stream output to client via SSE
    res.write(`data: ${JSON.stringify({ type: 'stdout', message: data.toString() })}\n\n`);
  });
}
```

### 3. PowerShell Script Execution
```powershell
# Enable screen capture permissions
Set-ItemProperty -Path $capturePath -Name "Value" -Value "Allow"

# Configure power settings
powercfg /change monitor-timeout-ac 0

# Create auto-start task
Register-ScheduledTask -TaskName "DesktopCaptureClient" ...
```

## Cross-Platform Support

### Current Status: Windows Only

The current implementation uses:
- PowerShell scripts
- Windows Registry (`HKLM` and `HKCU`)
- Windows Task Scheduler
- `tasklist` and `taskkill` commands

### Making it Cross-Platform

To support **macOS** and **Linux**:

#### 1. OS Detection in Backend
```javascript
import os from 'os';

const platform = os.platform(); // 'win32', 'darwin', 'linux'

function getSetupScript() {
  switch (platform) {
    case 'win32':
      return path.join(__dirname, 'setup-permissions.ps1');
    case 'darwin':
      return path.join(__dirname, 'setup-permissions-macos.sh');
    case 'linux':
      return path.join(__dirname, 'setup-permissions-linux.sh');
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}
```

#### 2. macOS Setup Script (`setup-permissions-macos.sh`)
```bash
#!/bin/bash
# Enable screen recording permissions on macOS

# Check if running with sudo
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (sudo)"
  exit 1
fi

# Add Python to screen recording permissions
tccutil reset ScreenCapture
# User must manually approve in System Preferences > Security & Privacy

# Create LaunchAgent for auto-start
cat > ~/Library/LaunchAgents/com.desktop.capture.plist <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.desktop.capture</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/python3</string>
        <string>$(pwd)/dual_screen_capture_client.py</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
EOF

launchctl load ~/Library/LaunchAgents/com.desktop.capture.plist

echo "Setup complete! Please approve screen recording in System Preferences."
```

#### 3. Linux Setup Script (`setup-permissions-linux.sh`)
```bash
#!/bin/bash
# Setup for Linux systems

# Create systemd service for auto-start
cat > ~/.config/systemd/user/desktop-capture.service <<EOF
[Unit]
Description=Desktop Capture Client
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/python3 $(pwd)/dual_screen_capture_client.py
Restart=always

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable desktop-capture.service
systemctl --user start desktop-capture.service

echo "Setup complete! Desktop client will start automatically."
```

#### 4. Update Backend to Spawn Appropriate Scripts
```javascript
function runSetupScript(platform) {
  let command, args;

  switch (platform) {
    case 'win32':
      command = 'powershell.exe';
      args = ['-ExecutionPolicy', 'Bypass', '-File', 'setup-permissions.ps1'];
      break;
    case 'darwin':
    case 'linux':
      command = 'bash';
      args = ['setup-permissions-' + (platform === 'darwin' ? 'macos' : 'linux') + '.sh'];
      break;
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }

  return spawn(command, args, { cwd: __dirname });
}
```

### iOS Support

**Important:** iOS **cannot run desktop screen capture** because:
1. iOS doesn't allow background screen recording
2. No subprocess execution in iOS apps
3. Apple restricts screen recording APIs

**Alternative for iOS:**
- Build a **React Native mobile app** as a **viewer only**
- iOS app connects to desktop client via WebSocket
- iOS app displays streams from Windows/Mac/Linux desktop clients
- No setup required on iOS (just view mode)

```
Windows Desktop Client (Captures screen)
    ↓ WebSocket
Supabase Edge Function (Relay)
    ↓ WebSocket
iOS React Native App (View only)
```

## Deployment Checklist

### For Windows Users:
- [x] Create PowerShell scripts (`setup-permissions.ps1`, `check-screen-capture-permissions.ps1`)
- [x] Create batch file launchers (`RUN-SETUP.bat`, `START-SETUP-API.bat`)
- [x] Create Express API server (`setup-api.js`)
- [x] Create React frontend component (`DesktopClientSetup.tsx`)
- [x] Add navigation route
- [ ] Test on Windows 10 and Windows 11
- [ ] Package as installer (Electron or NSIS)

### For macOS Users:
- [ ] Create bash script (`setup-permissions-macos.sh`)
- [ ] Handle TCC (Transparency, Consent, and Control) permissions
- [ ] Create LaunchAgent plist file
- [ ] Test on macOS 12+ (Monterey, Ventura, Sonoma)
- [ ] Code sign the application

### For Linux Users:
- [ ] Create bash script (`setup-permissions-linux.sh`)
- [ ] Create systemd service file
- [ ] Test on Ubuntu, Fedora, Arch
- [ ] Create .deb and .rpm packages

### For iOS Users:
- [ ] Build React Native viewer app
- [ ] Test WebSocket connectivity
- [ ] Submit to App Store (requires Apple Developer account)

## Security Considerations

### Administrator Privileges
The setup API **requires administrator privileges** to:
- Modify Windows Registry
- Create Task Scheduler entries
- Change power settings

**Never expose the setup API to the internet!** Only run on `localhost`.

### Cross-Site Request Forgery (CSRF)
Current implementation uses CORS to allow requests from React frontend on `localhost:5173`.

For production, add:
```javascript
app.use((req, res, next) => {
  const allowedOrigins = ['http://localhost:5173', 'https://yourdomain.com'];
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  next();
});
```

## Testing

### Test Setup API (Windows)
```bash
# 1. Start API server as admin
START-SETUP-API.bat

# 2. Test admin check
curl http://localhost:3001/api/setup/check-admin

# 3. Test client status
curl http://localhost:3001/api/setup/status
```

### Test Frontend
```bash
# 1. Start frontend
npm run dev

# 2. Open browser
http://localhost:5173/desktop-setup

# 3. Click buttons and verify logs appear
```

## Troubleshooting

### API Server Not Starting
- Check if port 3001 is already in use: `netstat -an | findstr 3001`
- Verify Node.js is installed: `node --version`
- Check for missing dependencies: `npm install`

### Permission Setup Fails
- Ensure API server is running as Administrator
- Check PowerShell execution policy: `Get-ExecutionPolicy`
- Review PowerShell script output for errors

### Frontend Can't Connect to API
- Verify API server is running on port 3001
- Check CORS settings in `setup-api.js`
- Ensure frontend is running on port 5173

## Production Deployment

### Option 1: Electron App (Recommended)
Package the entire app (frontend + backend + desktop client) into a single Electron executable.

**Benefits:**
- Single installer
- No manual setup
- Built-in auto-updater
- Cross-platform (Windows, Mac, Linux)

### Option 2: Web App + Desktop Agent
Keep frontend as web app, distribute desktop agent as standalone installer.

**Benefits:**
- Smaller download size
- Centralized web updates
- Multiple desktop clients can connect

### Option 3: Docker Container (Linux only)
Run entire stack in Docker for server deployments.

## Next Steps

1. **Test the current Windows implementation**
   - Run `START-SETUP-API.bat` as admin
   - Navigate to `http://localhost:5173/desktop-setup`
   - Click "Run Permission Setup"

2. **If it works, create macOS/Linux versions**
   - Write bash scripts for each platform
   - Update backend to detect OS
   - Test on each platform

3. **Package for distribution**
   - Create installers (NSIS for Windows, DMG for macOS, AppImage for Linux)
   - Add digital signatures
   - Create auto-updater

4. **Build iOS viewer app** (if needed)
   - React Native or Swift
   - WebSocket connection to Edge Function
   - View-only mode (no setup required)
