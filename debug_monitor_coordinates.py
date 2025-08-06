#!/usr/bin/env python3
"""
Debug script to verify monitor coordinates and capture areas.
This script will show exactly what each monitor captures.
"""

import tkinter as tk
from PIL import Image, ImageGrab, ImageDraw, ImageFont
import time
import os

def detect_monitors():
    """Detect monitor configuration using tkinter."""
    root = tk.Tk()
    root.withdraw()  # Hide the window
    
    try:
        # Get screen dimensions
        screen_width = root.winfo_screenwidth()
        screen_height = root.winfo_screenheight()
        
        # Get virtual screen dimensions (all monitors combined)
        virtual_width = root.winfo_vrootwidth()
        virtual_height = root.winfo_vrootheight()
        
        print(f"Screen dimensions: {screen_width}x{screen_height}")
        print(f"Virtual screen dimensions: {virtual_width}x{virtual_height}")
        
        monitor_info = {}
        
        if virtual_width > screen_width:
            # Dual monitor setup detected
            print("Detected dual monitor setup:")
            
            # Primary monitor (left)
            monitor_info['monitor_0'] = {
                'index': 0,
                'name': 'Primary Monitor',
                'x': 0,
                'y': 0,
                'width': screen_width,
                'height': screen_height,
                'is_primary': True
            }
            
            # Secondary monitor (right)
            monitor_info['monitor_1'] = {
                'index': 1,
                'name': 'Secondary Monitor',
                'x': screen_width,
                'y': 0,
                'width': virtual_width - screen_width,
                'height': screen_height,
                'is_primary': False
            }
            
            print(f"  Primary: {screen_width}x{screen_height} at (0, 0)")
            print(f"  Secondary: {virtual_width - screen_width}x{screen_height} at ({screen_width}, 0)")
        else:
            # Single monitor
            monitor_info['monitor_0'] = {
                'index': 0,
                'name': 'Primary Monitor',
                'x': 0,
                'y': 0,
                'width': screen_width,
                'height': screen_height,
                'is_primary': True
            }
            print("Single monitor detected")
        
        root.destroy()
        return monitor_info
        
    except Exception as e:
        print(f"Error detecting monitors: {e}")
        root.destroy()
        return {}

def capture_monitor_with_overlay(monitor_info, monitor_id):
    """Capture a specific monitor and add overlay information."""
    try:
        info = monitor_info[monitor_id]
        
        # Define the bounding box for this monitor
        bbox = (
            info['x'],
            info['y'],
            info['x'] + info['width'],
            info['y'] + info['height']
        )
        
        print(f"\nCapturing {monitor_id}:")
        print(f"  Name: {info['name']}")
        print(f"  Coordinates: ({info['x']}, {info['y']})")
        print(f"  Size: {info['width']}x{info['height']}")
        print(f"  Bounding box: {bbox}")
        
        # Capture the specific monitor area
        screenshot = ImageGrab.grab(bbox=bbox)
        
        # Add overlay with monitor information
        draw = ImageDraw.Draw(screenshot)
        
        # Try to use a font, fallback to default if not available
        try:
            font = ImageFont.truetype("arial.ttf", 48)
            small_font = ImageFont.truetype("arial.ttf", 24)
        except:
            font = ImageFont.load_default()
            small_font = ImageFont.load_default()
        
        # Add monitor info overlay
        overlay_text = f"{info['name']}\n{monitor_id}\nCoords: ({info['x']}, {info['y']})\nSize: {info['width']}x{info['height']}"
        
        # Draw background rectangle for text
        text_bbox = draw.textbbox((0, 0), overlay_text, font=small_font)
        text_width = text_bbox[2] - text_bbox[0]
        text_height = text_bbox[3] - text_bbox[1]
        
        # Position in top-left corner
        rect_x, rect_y = 20, 20
        draw.rectangle([rect_x-10, rect_y-10, rect_x+text_width+10, rect_y+text_height+10], 
                      fill=(0, 0, 0, 180), outline=(255, 255, 255))
        
        # Draw text
        draw.text((rect_x, rect_y), overlay_text, fill=(255, 255, 255), font=small_font)
        
        # Add timestamp
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        draw.text((rect_x, rect_y + text_height + 20), f"Captured: {timestamp}", 
                 fill=(255, 255, 0), font=small_font)
        
        # Add border around the entire image
        draw.rectangle([0, 0, screenshot.width-1, screenshot.height-1], 
                      outline=(255, 0, 0), width=5)
        
        return screenshot
        
    except Exception as e:
        print(f"Error capturing {monitor_id}: {e}")
        return None

def main():
    """Main function to debug monitor coordinates."""
    print("=== Monitor Coordinate Debug Tool ===")
    print("This tool will capture each monitor separately and show coordinates.")
    
    # Detect monitors
    monitor_info = detect_monitors()
    
    if not monitor_info:
        print("No monitors detected!")
        return
    
    print(f"\nDetected {len(monitor_info)} monitor(s)")
    
    # Capture each monitor
    timestamp = int(time.time())
    
    for monitor_id, info in monitor_info.items():
        screenshot = capture_monitor_with_overlay(monitor_info, monitor_id)
        
        if screenshot:
            filename = f"debug_coordinates_{monitor_id}_{timestamp}.png"
            screenshot.save(filename)
            print(f"  Saved: {filename}")
        else:
            print(f"  Failed to capture {monitor_id}")
    
    # Also capture the full desktop for comparison
    print(f"\nCapturing full desktop for comparison...")
    full_screenshot = ImageGrab.grab()
    full_filename = f"debug_full_desktop_{timestamp}.png"
    full_screenshot.save(full_filename)
    print(f"Full desktop saved: {full_filename}")
    print(f"Full desktop size: {full_screenshot.size}")
    
    print("\n=== Debug Complete ===")
    print("Check the generated PNG files to verify monitor coordinates.")

if __name__ == '__main__':
    main()