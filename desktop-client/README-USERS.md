# Desktop Client - User Guide

## For Non-Technical Users

### First Time Setup (Do this once)

1. **Right-click** `RUN-SETUP.bat`
2. Select **"Run as administrator"**
3. Follow the prompts
4. Restart your computer

**That's it!** The desktop client will start automatically when you log in.

---

## Files You Need to Know

| File | What It Does | When to Use |
|------|--------------|-------------|
| `RUN-SETUP.bat` | One-click setup | **First time only** (run as admin) |
| `CHECK-PERMISSIONS.bat` | Check if setup worked | If you have problems |
| `START-CLIENT.bat` | Start client manually | If auto-start isn't working |

---

## Common Problems

### "Streams don't appear" or "Canvas not available"

1. **Wake up your monitors**
   - Move mouse to each screen
   - Open a window on each monitor

2. **Close streaming apps**
   - Netflix, Prime Video, Disney+ block screen capture
   - Close these before starting

3. **Run diagnostics**
   - Double-click `CHECK-PERMISSIONS.bat`
   - Follow the recommendations

### "Desktop client won't start"

1. Check Python is installed:
   - Open Command Prompt
   - Type: `python --version`
   - Should show Python 3.8 or higher

2. Install Python if needed:
   - Download from https://www.python.org/downloads/
   - ✅ Check "Add Python to PATH" during install

3. Run `START-CLIENT.bat` to see error messages

### "Monitor 2 shows black screen"

This is usually a Windows permission or power setting issue:

1. Run `CHECK-PERMISSIONS.bat` to diagnose
2. If needed, run `RUN-SETUP.bat` again (as admin)
3. Ensure monitor is not sleeping:
   - Settings → System → Power & Sleep
   - Set "Screen" to "Never" when plugged in

---

## Advanced Users

### Manual Start

```bash
cd desktop-client
python dual_screen_capture_client.py
```

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Configuration

The client auto-configures based on your system. If you need to customize:

- Edit `dual_screen_capture_client.py`
- Change WebSocket URL, client ID, or capture settings

### Disable Auto-Start

1. Open **Task Scheduler**
2. Find task: `DesktopCaptureClient`
3. Right-click → Disable or Delete

---

## How It Works

```
Desktop Client (Python)
    ↓
    Captures screens using MSS
    ↓
    Sends to Supabase Edge Function (WebSocket)
    ↓
    Relayed to Web Browser
    ↓
    Displayed in React UI
```

**Technologies:**
- Python 3.8+ with MSS library (screen capture)
- WebSocket for real-time streaming
- Supabase Edge Functions (relay server)
- React frontend (viewer)

---

## Uninstall

### Remove Auto-Start

1. Open Task Scheduler
2. Find `DesktopCaptureClient`
3. Right-click → Delete

### Revert Permissions

1. Settings → Privacy & Security → Screenshots
2. Disable "Let apps take screenshots"

### Remove Files

Simply delete the `desktop-client` folder.

---

## Need Help?

1. Run `CHECK-PERMISSIONS.bat` and save the output
2. Check Task Manager for running `python.exe` processes
3. Review desktop client console window for errors
4. Verify web interface at: http://localhost:5173/multi-desktop

---

## Technical Details

See `SETUP-GUIDE.md` for detailed technical documentation.
