# Desktop Client Auto-Start Setup

This guide explains how to automatically start the desktop client when Windows boots.

## Files Created

1. **start-desktop-client.bat** - Batch script that starts the client with your configuration
2. **start-desktop-client-hidden.vbs** - VBScript that runs the batch file without showing a window

## Configuration

Edit `start-desktop-client.bat` to configure your settings:

```batch
set USER_ID=user_123
set FRIENDLY_NAME=Main Workstation
```

## Setup Methods

### Method 1: Windows Startup Folder (Recommended for testing)

1. Press `Win + R` to open Run dialog
2. Type `shell:startup` and press Enter
3. Create a shortcut to `start-desktop-client-hidden.vbs` in this folder
4. The client will start automatically on next login

**PowerShell command to create shortcut:**
```powershell
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\Desktop Client.lnk")
$Shortcut.TargetPath = "C:\Users\User\Desktop\Automation_ui\desktop-client\start-desktop-client-hidden.vbs"
$Shortcut.WorkingDirectory = "C:\Users\User\Desktop\Automation_ui\desktop-client"
$Shortcut.Save()
```

### Method 2: Task Scheduler (Recommended for production)

1. Open Task Scheduler (`taskschd.msc`)
2. Create Basic Task
3. Name: "Desktop Client Auto-Start"
4. Trigger: "When I log on"
5. Action: "Start a program"
6. Program: `wscript.exe`
7. Arguments: `"C:\Users\User\Desktop\Automation_ui\desktop-client\start-desktop-client-hidden.vbs"`
8. Check "Run with highest privileges" if needed

**PowerShell command to create task:**
```powershell
$Action = New-ScheduledTaskAction -Execute "wscript.exe" -Argument '"C:\Users\User\Desktop\Automation_ui\desktop-client\start-desktop-client-hidden.vbs"'
$Trigger = New-ScheduledTaskTrigger -AtLogOn
$Principal = New-ScheduledTaskPrincipal -UserId "$env:USERNAME" -LogonType Interactive -RunLevel Highest
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
Register-ScheduledTask -TaskName "Desktop Client Auto-Start" -Action $Action -Trigger $Trigger -Principal $Principal -Settings $Settings
```

### Method 3: Windows Service (Most robust, requires admin)

For production deployment, consider creating a Windows service using NSSM (Non-Sucking Service Manager):

```powershell
# Download NSSM from https://nssm.cc/download
# Then run:
nssm install DesktopClient "C:\Python311\python.exe" "C:\Users\User\Desktop\Automation_ui\desktop-client\dual_screen_capture_client.py --user-id user_123 --friendly-name 'Main Workstation'"
nssm set DesktopClient AppDirectory "C:\Users\User\Desktop\Automation_ui\desktop-client"
nssm start DesktopClient
```

## Testing Auto-Start

1. **Test the batch file first:**
   ```bash
   cd desktop-client
   start-desktop-client.bat
   ```

2. **Test the hidden VBS:**
   ```bash
   cd desktop-client
   wscript start-desktop-client-hidden.vbs
   ```

3. **Check if it's running:**
   ```bash
   tasklist | findstr python
   ```

## Stopping the Client

- If started via startup folder: Kill python.exe process in Task Manager
- If started via Task Scheduler: Disable or delete the task
- If started as service: `nssm stop DesktopClient`

## Logs

The batch file doesn't create logs by default. To enable logging, modify the batch file:

```batch
python dual_screen_capture_client.py --user-id "%USER_ID%" --friendly-name "%FRIENDLY_NAME%" > logs\client.log 2>&1
```

## Troubleshooting

**Client not starting?**
- Check if Python is in PATH: `python --version`
- Check if dependencies are installed: `pip list | findstr websockets`
- Run batch file manually to see errors

**Client starts but disconnects?**
- Check network connectivity
- Verify Supabase URL is accessible
- Check client logs for errors

**Multiple instances running?**
- Stop all Python processes: Kill them in Task Manager
- Remove duplicate startup entries
- Restart computer
