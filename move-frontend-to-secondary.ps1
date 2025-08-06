# PowerShell Script to move Frontend Browser Window to Secondary Monitor
# Follows TRAE Unity AI Platform naming conventions and coding standards

Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class WindowManager {
    [DllImport("user32.dll")]
    public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
    
    [DllImport("user32.dll")]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
    
    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
    
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    
    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    
    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);
    
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }
    
    public const uint SWP_NOSIZE = 0x0001;
    public const uint SWP_NOZORDER = 0x0004;
    public const int SW_RESTORE = 9;
    public const int SW_MAXIMIZE = 3;
}
"@

Write-Host "TRAE Unity AI Platform - Frontend Window Manager" -ForegroundColor Cyan
Write-Host "Moving browser window with frontend to secondary monitor..." -ForegroundColor Yellow

# Function to find browser windows with our frontend
function Find-FrontendWindow {
    $frontendWindows = @()
    
    # Common browser window titles that might contain our frontend
    $browserTitles = @(
        "*localhost:5174*",
        "*Multi Desktop*",
        "*TRAE*",
        "*Chrome*localhost*",
        "*Edge*localhost*",
        "*Firefox*localhost*"
    )
    
    foreach ($title in $browserTitles) {
        $windows = Get-Process | Where-Object { $_.MainWindowTitle -like $title } | Select-Object Id, ProcessName, MainWindowTitle, MainWindowHandle
        foreach ($window in $windows) {
            if ($window.MainWindowHandle -ne 0) {
                $frontendWindows += $window
                Write-Host "Found potential frontend window: $($window.MainWindowTitle)" -ForegroundColor Green
            }
        }
    }
    
    return $frontendWindows
}

# Function to move window to secondary monitor
function Move-WindowToSecondaryMonitor {
    param(
        [IntPtr]$windowHandle,
        [string]$windowTitle
    )
    
    try {
        # Secondary monitor coordinates (assuming 1920x1080 primary monitor)
        $secondaryX = 1920  # Start of secondary monitor
        $secondaryY = 0     # Top of secondary monitor
        $windowWidth = 1920 # Full width of secondary monitor
        $windowHeight = 1080 # Full height of secondary monitor
        
        Write-Host "Moving window '$windowTitle' to secondary monitor..." -ForegroundColor Yellow
        Write-Host "Target position: X=$secondaryX, Y=$secondaryY, Width=$windowWidth, Height=$windowHeight" -ForegroundColor Gray
        
        # First restore the window if it's minimized
        [WindowManager]::ShowWindow($windowHandle, [WindowManager]::SW_RESTORE)
        Start-Sleep -Milliseconds 500
        
        # Move and resize the window to secondary monitor
        $result = [WindowManager]::SetWindowPos(
            $windowHandle,
            [IntPtr]::Zero,
            $secondaryX,
            $secondaryY,
            $windowWidth,
            $windowHeight,
            0  # No special flags - move and resize
        )
        
        if ($result) {
            Write-Host "Successfully moved window to secondary monitor" -ForegroundColor Green
            
            # Optional: Maximize the window on secondary monitor
            Start-Sleep -Milliseconds 500
            [WindowManager]::ShowWindow($windowHandle, [WindowManager]::SW_MAXIMIZE)
            Write-Host "Window maximized on secondary monitor" -ForegroundColor Green
            
            return $true
        } else {
            Write-Host "Failed to move window" -ForegroundColor Red
            return $false
        }
        
    } catch {
        Write-Host "Error moving window: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Main execution
try {
    Write-Host "Searching for frontend browser windows..." -ForegroundColor Yellow
    
    $frontendWindows = Find-FrontendWindow
    
    if ($frontendWindows.Count -eq 0) {
        Write-Host "No frontend browser windows found" -ForegroundColor Red
        Write-Host "Please ensure the browser with localhost:5174 is open" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "Found $($frontendWindows.Count) potential frontend window(s)" -ForegroundColor Green
    
    $moved = $false
    foreach ($window in $frontendWindows) {
        Write-Host "`nProcessing window: $($window.MainWindowTitle)" -ForegroundColor Cyan
        
        if (Move-WindowToSecondaryMonitor -windowHandle $window.MainWindowHandle -windowTitle $window.MainWindowTitle) {
            $moved = $true
            break  # Successfully moved one window, that's enough
        }
    }
    
    if ($moved) {
        Write-Host "`nFrontend successfully moved to secondary monitor!" -ForegroundColor Green
        Write-Host "The secondary monitor should now show the frontend instead of being black" -ForegroundColor Yellow
    } else {
        Write-Host "`nFailed to move any frontend windows" -ForegroundColor Red
    }
    
} catch {
    Write-Host "Script error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`nFrontend window management completed" -ForegroundColor Cyan