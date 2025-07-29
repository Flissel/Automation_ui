# Desktop Capture Client

Native desktop client for TRAE Unity AI Platform that captures desktop screenshots and streams them in real-time to the web interface.

## Features

- Real-time desktop capture at configurable FPS (1-60 FPS)
- Adjustable image quality and scaling
- WebSocket connection to Supabase edge function
- Multi-monitor support
- Automatic reconnection
- Health monitoring

## Installation

1. Install Python 3.8 or higher
2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Usage

### Basic Usage
```bash
python desktop_capture_client.py
```

### Advanced Usage
```bash
python desktop_capture_client.py \
  --server-url wss://dgzreelowtzquljhxskq.functions.supabase.co/live-desktop-stream \
  --client-id my-desktop-001 \
  --log-level INFO
```

### Command Line Options

- `--server-url`: WebSocket server URL (default: Supabase edge function)
- `--client-id`: Optional unique client identifier
- `--log-level`: Logging level (DEBUG, INFO, WARNING, ERROR)

## How It Works

1. **Connection**: Client connects to Supabase edge function as a desktop client
2. **Capabilities**: Reports supported features (screen capture, mouse/keyboard control)
3. **Commands**: Listens for start/stop capture commands from web interface
4. **Streaming**: Captures desktop screenshots and streams as base64-encoded frames
5. **Configuration**: Supports dynamic FPS, quality, and scaling adjustments

## Message Protocol

### From Desktop Client to Server:
- `capability_report`: Reports client capabilities
- `frame_data`: Desktop screenshot frame
- `stream_status`: Current streaming status
- `pong`: Response to ping

### From Server to Desktop Client:
- `start_capture`: Begin desktop capture with config
- `stop_capture`: Stop desktop capture
- `config_update`: Update capture parameters
- `capture_screenshot`: Take single screenshot
- `ping`: Health check

## Configuration Options

The client supports dynamic configuration via the web interface:

```json
{
  "fps": 10,           // Frames per second (1-60)
  "quality": 80,       // JPEG quality (1-100)
  "scale": 1.0,        // Image scaling (0.1-2.0)
  "format": "jpeg"     // Image format (jpeg/png)
}
```

## Security Considerations

- Only connects to configured Supabase edge function
- No file system access beyond screenshot capture
- Client ID based authentication
- WebSocket connection with health monitoring

## Troubleshooting

### Connection Issues
- Check internet connectivity
- Verify Supabase edge function is running
- Check firewall settings for WebSocket connections

### Performance Issues
- Reduce FPS for lower CPU usage
- Decrease image quality or scale for smaller data transfer
- Monitor system resources during streaming

### Platform-Specific Issues

**Windows:**
- May require running as administrator for some applications
- Check Windows Defender settings

**macOS:**
- Grant screen recording permissions in System Preferences
- May require accessibility permissions

**Linux:**
- Install additional packages: `sudo apt-get install python3-tk python3-dev`
- Check X11 permissions for screen capture

## Development

### Adding New Features

1. **Mouse Control**: Extend with `pynput.mouse` for click automation
2. **Keyboard Input**: Add `pynput.keyboard` for text input
3. **File Operations**: Implement file upload/download capabilities
4. **OCR Integration**: Add local OCR processing with `pytesseract`

### Testing

```bash
# Test connection only
python desktop_capture_client.py --log-level DEBUG

# Test with mock server
python test_mock_server.py  # Run mock WebSocket server
python desktop_capture_client.py --server-url ws://localhost:8765
```