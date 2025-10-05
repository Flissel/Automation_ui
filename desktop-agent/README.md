# TRAE Unity AI - Desktop Client Agent

This agent captures your desktop screen(s) and streams them in real-time to the TRAE Unity AI platform.

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Your Desktop

Edit `desktop_client.py` and update the configuration:

```python
WEBSOCKET_URL = "wss://dgzreelowtzquljhxskq.supabase.co/functions/v1/live-desktop-stream"
CLIENT_ID = "desktop_001"  # Change this for each desktop (e.g., "office_pc", "home_laptop")
FPS = 10              # Frames per second (1-30)
QUALITY = 75          # JPEG quality (1-100, higher = better quality, larger size)
SCALE = 1.0           # Scale factor (0.5 = 50% size, 1.0 = full size)
```

### 3. Run the Agent

```bash
python desktop_client.py
```

## Configuration Options

| Parameter | Description | Recommended Values |
|-----------|-------------|-------------------|
| `CLIENT_ID` | Unique identifier for this desktop | `desktop_001`, `office_pc`, etc. |
| `FPS` | Frames per second to stream | 5-15 (10 recommended) |
| `QUALITY` | JPEG compression quality | 60-85 (75 recommended) |
| `SCALE` | Frame scaling (reduce bandwidth) | 0.5-1.0 (1.0 = full resolution) |

## Features

✅ **Multi-Monitor Support** - Automatically detects and streams all monitors  
✅ **Real-time Streaming** - Configurable FPS up to 30 FPS  
✅ **Bandwidth Optimization** - JPEG compression and scaling  
✅ **Screenshot on Demand** - Web interface can request single screenshots  
✅ **Auto-reconnect** - Handles network interruptions gracefully  
✅ **Live Configuration** - Change FPS/quality without restarting  

## Usage Examples

### Stream Office Desktop

```python
CLIENT_ID = "office_desktop"
FPS = 10
QUALITY = 75
SCALE = 1.0  # Full quality
```

### Stream Remote Server (Low Bandwidth)

```python
CLIENT_ID = "remote_server"
FPS = 5
QUALITY = 60
SCALE = 0.5  # Half size to save bandwidth
```

### Stream Gaming PC (High Quality)

```python
CLIENT_ID = "gaming_pc"
FPS = 15
QUALITY = 85
SCALE = 1.0
```

## Troubleshooting

### Connection Issues

If you see "Connection error", verify:
- The WebSocket URL is correct
- Your firewall allows outbound WebSocket connections
- The TRAE platform edge function is deployed and running

### Performance Issues

If streaming is slow or choppy:
- **Reduce FPS**: Try `FPS = 5` instead of 10
- **Lower quality**: Try `QUALITY = 60` instead of 75
- **Scale down**: Try `SCALE = 0.5` to halve the resolution
- **Check CPU usage**: Screen capture is CPU-intensive

### Permission Errors (macOS/Linux)

On macOS, you may need to grant screen recording permissions:
1. System Preferences → Security & Privacy → Privacy
2. Select "Screen Recording"
3. Add Terminal or your Python executable

## Running as a Service

### Windows (Task Scheduler)

1. Create a batch file `start_desktop_agent.bat`:
```batch
@echo off
cd C:\path\to\desktop-agent
python desktop_client.py
```

2. Create a scheduled task to run at startup

### Linux (systemd)

1. Create `/etc/systemd/system/trae-desktop-agent.service`:
```ini
[Unit]
Description=TRAE Desktop Agent
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/desktop-agent
ExecStart=/usr/bin/python3 /path/to/desktop-agent/desktop_client.py
Restart=always

[Install]
WantedBy=multi-user.target
```

2. Enable and start:
```bash
sudo systemctl enable trae-desktop-agent
sudo systemctl start trae-desktop-agent
```

### macOS (launchd)

1. Create `~/Library/LaunchAgents/com.trae.desktop-agent.plist`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.trae.desktop-agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/python3</string>
        <string>/path/to/desktop-agent/desktop_client.py</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

2. Load the service:
```bash
launchctl load ~/Library/LaunchAgents/com.trae.desktop-agent.plist
```

## Security Notes

⚠️ **Important Security Considerations:**

- The desktop agent streams your screen content - ensure the WebSocket connection is secure (wss://)
- Keep your `CLIENT_ID` unique and private
- Only run on trusted networks
- The TRAE platform uses Supabase Edge Functions with secure WebSocket connections
- No screen data is stored; all streaming is real-time only

## License

Copyright © 2025 TRAE Development Team
