# PowerShell Script to start Claude Desktop on Secondary Monitor
# This script moves Claude Desktop to the secondary monitor for streaming

Write-Host "Starting Claude Desktop on Secondary Monitor..." -ForegroundColor Green

# Function to move window to secondary monitor
function Move-WindowToSecondaryMonitor {
    param(
        [string]$ProcessName,
        [int]$DelaySeconds = 3
    )
    
    # Wait for the process to start
    Start-Sleep -Seconds $DelaySeconds
    
    # Get the process
    $process = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue
    
    if ($process) {
        Write-Host "Found $ProcessName process. Moving to secondary monitor..." -ForegroundColor Yellow
        
        # Use Windows API to move window
        Add-Type @"
            using System;
            using System.Runtime.InteropServices;
            public class Win32 {
                [DllImport("user32.dll")]
                public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
                [DllImport("user32.dll")]
                public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
                [DllImport("user32.dll")]
                public static extern IntPtr GetForegroundWindow();
            }
"@
        
        # Get the main window handle - handle multiple processes
        foreach ($proc in $process) {
            $hwnd = $proc.MainWindowHandle
            
            if ($hwnd -ne [IntPtr]::Zero) {
                Write-Host "Moving window with handle: $hwnd" -ForegroundColor Yellow
                
                # Move window to secondary monitor (assuming 1920px wide primary monitor)
                # Position: X=1920 (start of secondary monitor), Y=0, Width=1920, Height=1080
                $result = [Win32]::SetWindowPos($hwnd, [IntPtr]::Zero, 1920, 0, 1920, 1080, 0x0040)
            
                if ($result) {
                    Write-Host "Successfully moved $ProcessName to secondary monitor!" -ForegroundColor Green
                    
                    # Maximize the window on secondary monitor
                    [Win32]::ShowWindow($hwnd, 3) # SW_MAXIMIZE = 3
                } else {
                    Write-Host "Failed to move $ProcessName window." -ForegroundColor Red
                }
            } else {
                Write-Host "Could not get window handle for $ProcessName." -ForegroundColor Red
            }
        }
    } else {
        Write-Host "$ProcessName process not found." -ForegroundColor Red
    }
}

# Try to find Claude Desktop executable
$claudePaths = @(
    "$env:LOCALAPPDATA\Programs\Claude\Claude.exe",
    "$env:PROGRAMFILES\Claude\Claude.exe",
    "$env:PROGRAMFILES(X86)\Claude\Claude.exe",
    "$env:APPDATA\Claude\Claude.exe"
)

$claudeExe = $null
foreach ($path in $claudePaths) {
    if (Test-Path $path) {
        $claudeExe = $path
        break
    }
}

if ($claudeExe) {
    Write-Host "Found Claude Desktop at: $claudeExe" -ForegroundColor Green
    
    # Start Claude Desktop
    Write-Host "Starting Claude Desktop..." -ForegroundColor Yellow
    Start-Process -FilePath $claudeExe
    
    # Wait and move to secondary monitor
    Move-WindowToSecondaryMonitor -ProcessName "Claude" -DelaySeconds 5
    
} else {
    Write-Host "Claude Desktop not found. Please install Claude Desktop or update the paths in this script." -ForegroundColor Red
    Write-Host "Trying alternative approach - looking for running Claude process..." -ForegroundColor Yellow
    
    # Try to move existing Claude window
    Move-WindowToSecondaryMonitor -ProcessName "Claude" -DelaySeconds 1
}

Write-Host "Script completed. Check if Claude Desktop is now visible on the secondary monitor." -ForegroundColor Cyan
Write-Host "If successful, the desktop capture should now show Claude Desktop content." -ForegroundColor Cyan