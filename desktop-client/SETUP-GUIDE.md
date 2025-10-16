# Desktop Client Setup Guide

## Quick Start (For Non-Technical Users)

### Step 1: Fix Screen Capture Permissions (One-Time Setup)

1. Navigate to `desktop-client` folder
2. Right-click on `RUN-SETUP.bat`
3. Select **"Run as administrator"**
4. Follow the prompts in the window
5. Restart your computer when done

That's it! The desktop client will now start automatically when you log in.

---

## What the Setup Does

The automated setup script will:
- ✅ Enable Windows screen capture permissions
- ✅ Prevent monitors from sleeping during capture
- ✅ Create an auto-start task (starts on login)
- ✅ Test screen capture from all monitors

---

## Troubleshooting

### Problem: Still seeing black screens

**Try these steps:**

1. **Wake up all monitors**
   - Move your mouse to each monitor
   - Open a window on each monitor

2. **Close protected content**
   - Close Netflix, Prime Video, or other streaming services
   - These apps block screen capture for copyright protection

3. **Check power settings**
   - Open Windows Settings → System → Power & Sleep
   - Set "Screen" to "Never" when plugged in

4. **Run diagnostics**
   - Double-click `CHECK-PERMISSIONS.bat`
   - Review the output for any issues

### Problem: Desktop client won't start

1. Check Python is installed:
   ```
   python --version
   ```

2. Install required packages:
   ```
   pip install -r requirements.txt
   ```

3. Try manual start:
   ```
   python dual_screen_capture_client.py
   ```

### Problem: Auto-start not working

1. Open Task Scheduler (search in Windows Start menu)
2. Look for task named "DesktopCaptureClient"
3. Right-click → Run to test
4. Check task properties if it's not enabled

---

## Manual Setup (Advanced Users)

If you prefer to set up permissions manually:

### Enable Screen Capture in Windows Settings

**Windows 11:**
1. Settings → Privacy & Security → Screenshots
2. Enable "Let apps take screenshots"

**Windows 10:**
1. Settings → Privacy → Screen Capture
2. Set to "Allow apps to capture your screen"

### Disable Monitor Sleep

```powershell
powercfg /change monitor-timeout-ac 0
```

### Create Auto-Start Task

Run PowerShell as Administrator:
```powershell
cd desktop-client
.\setup-permissions.ps1
```

---

## Verification

After setup, verify everything works:

1. **Check desktop client is running:**
   - Look for "Desktop Capture Client" in system tray
   - Or check Task Manager → Details tab for `python.exe`

2. **Check capture works:**
   - Test screenshots should be created: `test_monitor_1.png`, `test_monitor_2.png`
   - Open these files and verify they show your actual screens

3. **Check web interface:**
   - Open browser: `http://localhost:5173/multi-desktop`
   - You should see live streams from your monitors

---

## File Reference

- `RUN-SETUP.bat` - One-click setup (run as administrator)
- `CHECK-PERMISSIONS.bat` - Check current permission status
- `setup-permissions.ps1` - Full automated setup script
- `check-screen-capture-permissions.ps1` - Diagnostic script
- `dual_screen_capture_client.py` - Main desktop client program
- `requirements.txt` - Python dependencies

---

## Support

If you continue to have issues:

1. Run `CHECK-PERMISSIONS.bat` and save the output
2. Check the desktop client logs for error messages
3. Verify all monitors are powered on and not sleeping
4. Ensure no DRM/protected content is displaying

---

## Uninstall

To remove auto-start:

1. Open Task Scheduler
2. Find "DesktopCaptureClient" task
3. Right-click → Delete

To revert permission changes:

1. Settings → Privacy & Security → Screenshots
2. Disable "Let apps take screenshots"
