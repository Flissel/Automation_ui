# TRAE Unity AI - Desktop Client Agent

This agent captures your desktop screen(s) and streams them in real-time to the TRAE Unity AI platform.

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Run the Agent

```bash
# Run with default settings (desktop_001)
python desktop_client.py

# Run with custom client ID (to match UI selection)
python desktop_client.py --client-id desktop_003

# Run with custom settings
python desktop_client.py --client-id my_desktop --fps 15 --quality 85 --scale 0.75
```

## Command Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--client-id` | Unique identifier for this desktop | `desktop_001` |
| `--fps` | Frames per second to stream | `10` |
| `--quality` | JPEG quality (1-100) | `75` |
| `--scale` | Scale factor for frames | `1.0` |
| `--url` | WebSocket server URL | Supabase edge function |

**Examples:**
- `--client-id desktop_003` - Match the desktop ID from the UI
- `--fps 15` - Stream at 15 FPS for smoother video
- `--quality 60` - Lower quality to save bandwidth
- `--scale 0.5` - Half resolution to reduce bandwidth

## Features

✅ **Multi-Monitor Support** - Automatically detects and streams all monitors  
✅ **Real-time Streaming** - Configurable FPS up to 30 FPS  
✅ **Bandwidth Optimization** - JPEG compression and scaling  
✅ **Screenshot on Demand** - Web interface can request single screenshots  
✅ **Auto-reconnect** - Handles network interruptions gracefully  
✅ **Live Configuration** - Change FPS/quality without restarting  

## Usage Examples

### Stream Office Desktop

```bash
python desktop_client.py --client-id office_desktop --fps 10 --quality 75
```

### Stream Remote Server (Low Bandwidth)

```bash
python desktop_client.py --client-id remote_server --fps 5 --quality 60 --scale 0.5
```

### Stream Gaming PC (High Quality)

```bash
python desktop_client.py --client-id gaming_pc --fps 15 --quality 85
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
