#!/usr/bin/env python3
"""
Debug script to detect actual Windows monitor configurations using Windows API
"""

import sys
import time
from PIL import Image, ImageGrab, ImageDraw, ImageFont
import win32api
import win32con
import win32gui

def get_monitor_info():
    """Get detailed monitor information using Windows API"""
    monitors = []
    
    def monitor_enum_proc(hmonitor, hdc, rect, data):
        try:
            monitor_info = win32api.GetMonitorInfo(hmonitor)
            device_name = monitor_info['Device']
            
            # Get monitor rect (work area and full area)
            monitor_rect = monitor_info['Monitor']  # Full monitor area
            work_rect = monitor_info['Work']        # Work area (excluding taskbar)
            
            # Check if this is the primary monitor
            is_primary = monitor_info['Flags'] & win32con.MONITORINFOF_PRIMARY
            
            monitor_data = {
                'device_name': device_name,
                'handle': hmonitor,
                'is_primary': bool(is_primary),
                'monitor_rect': monitor_rect,  # (left, top, right, bottom)
                'work_rect': work_rect,
                'x': monitor_rect[0],
                'y': monitor_rect[1],
                'width': monitor_rect[2] - monitor_rect[0],
                'height': monitor_rect[3] - monitor_rect[1]
            }
            
            monitors.append(monitor_data)
        except Exception as e:
            print(f"Error processing monitor: {e}")
        return True
    
    # Enumerate all monitors - correct syntax
    try:
        win32gui.EnumDisplayMonitors(None, None, monitor_enum_proc, None)
    except Exception as e:
        print(f"Error enumerating monitors: {e}")
        # Fallback method
        try:
            # Try alternative approach
            import win32api
            monitors = []
            for i in range(10):  # Check up to 10 monitors
                try:
                    device = win32api.EnumDisplayDevices(None, i)
                    if device.DeviceName:
                        # This is a simplified fallback
                        monitor_data = {
                            'device_name': device.DeviceName,
                            'handle': None,
                            'is_primary': i == 0,
                            'monitor_rect': (0, 0, 1920, 1080),
                            'work_rect': (0, 0, 1920, 1080),
                            'x': i * 1920,
                            'y': 0,
                            'width': 1920,
                            'height': 1080
                        }
                        monitors.append(monitor_data)
                except:
                    break
        except Exception as e2:
            print(f"Fallback method also failed: {e2}")
    
    # Sort monitors by x position (left to right)
    monitors.sort(key=lambda m: m['x'])
    
    return monitors

def capture_monitor_with_overlay(monitor_info, monitor_index):
    """Capture a specific monitor with overlay information"""
    bbox = (
        monitor_info['x'],
        monitor_info['y'],
        monitor_info['x'] + monitor_info['width'],
        monitor_info['y'] + monitor_info['height']
    )
    
    print(f"Capturing monitor {monitor_index} with bbox: {bbox}")
    
    try:
        # Capture the monitor
        screenshot = ImageGrab.grab(bbox=bbox)
        
        # Add overlay with monitor information
        draw = ImageDraw.Draw(screenshot)
        
        # Try to use a larger font
        try:
            font = ImageFont.truetype("arial.ttf", 48)
        except:
            font = ImageFont.load_default()
        
        # Add monitor info overlay
        overlay_text = [
            f"Monitor {monitor_index}",
            f"Device: {monitor_info['device_name']}",
            f"Position: ({monitor_info['x']}, {monitor_info['y']})",
            f"Size: {monitor_info['width']}x{monitor_info['height']}",
            f"Primary: {monitor_info['is_primary']}",
            f"Bbox: {bbox}"
        ]
        
        # Draw background rectangle for text
        text_height = len(overlay_text) * 60
        draw.rectangle([10, 10, 800, text_height + 20], fill=(0, 0, 0, 128))
        
        # Draw text
        y_offset = 20
        for line in overlay_text:
            draw.text((20, y_offset), line, fill=(255, 255, 255), font=font)
            y_offset += 60
        
        return screenshot
        
    except Exception as e:
        print(f"Error capturing monitor {monitor_index}: {e}")
        return None

def main():
    print("=== Windows Monitor Detection Debug ===")
    
    # Get monitor information using Windows API
    monitors = get_monitor_info()
    
    print(f"\nDetected {len(monitors)} monitor(s):")
    for i, monitor in enumerate(monitors):
        print(f"\nMonitor {i}:")
        print(f"  Device: {monitor['device_name']}")
        print(f"  Primary: {monitor['is_primary']}")
        print(f"  Position: ({monitor['x']}, {monitor['y']})")
        print(f"  Size: {monitor['width']}x{monitor['height']}")
        print(f"  Monitor Rect: {monitor['monitor_rect']}")
        print(f"  Work Rect: {monitor['work_rect']}")
    
    # Capture each monitor
    timestamp = int(time.time())
    
    for i, monitor in enumerate(monitors):
        print(f"\nCapturing monitor {i}...")
        screenshot = capture_monitor_with_overlay(monitor, i)
        
        if screenshot:
            filename = f"debug_windows_monitor_{i}_{timestamp}.png"
            screenshot.save(filename)
            print(f"Saved: {filename}")
    
    # Also capture the full virtual desktop
    print("\nCapturing full virtual desktop...")
    try:
        full_screenshot = ImageGrab.grab()
        full_filename = f"debug_windows_full_desktop_{timestamp}.png"
        full_screenshot.save(full_filename)
        print(f"Saved: {full_filename}")
        print(f"Full desktop size: {full_screenshot.size}")
    except Exception as e:
        print(f"Error capturing full desktop: {e}")
    
    # Compare with simple detection method
    print("\n=== Comparison with Simple Detection ===")
    try:
        import tkinter as tk
        root = tk.Tk()
        root.withdraw()
        
        screen_width = root.winfo_screenwidth()
        screen_height = root.winfo_screenheight()
        virtual_width = root.winfo_vrootwidth()
        virtual_height = root.winfo_vrootheight()
        
        root.destroy()
        
        print(f"Tkinter screen dimensions: {screen_width}x{screen_height}")
        print(f"Tkinter virtual dimensions: {virtual_width}x{virtual_height}")
        
        # Simple detection logic (like in the current client)
        if virtual_width > screen_width * 1.5:
            print("\nSimple detection would assume:")
            print(f"  Monitor 0: {screen_width}x{screen_height} at (0, 0)")
            print(f"  Monitor 1: {virtual_width - screen_width}x{screen_height} at ({screen_width}, 0)")
        else:
            print("\nSimple detection would assume single monitor")
            
    except Exception as e:
        print(f"Error with simple detection: {e}")

if __name__ == "__main__":
    main()