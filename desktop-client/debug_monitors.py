#!/usr/bin/env python3
"""
Debug script to check monitor configurations and capture test images.
"""

import os
from screeninfo import get_monitors
from PIL import Image, ImageGrab, ImageDraw, ImageFont
import time

def debug_monitors():
    """Debug monitor detection and capture."""
    print("=== Monitor Debug Information ===")
    
    try:
        monitors = get_monitors()
        print(f"Detected {len(monitors)} monitor(s):")
        
        for i, monitor in enumerate(monitors):
            monitor_id = f"monitor_{i}"
            print(f"\n{monitor_id}:")
            print(f"  Name: {getattr(monitor, 'name', f'Monitor {i}')}")
            print(f"  Position: ({monitor.x}, {monitor.y})")
            print(f"  Size: {monitor.width}x{monitor.height}")
            print(f"  Primary: {getattr(monitor, 'is_primary', i == 0)}")
            
            # Calculate bounding box
            bbox = (
                monitor.x,
                monitor.y,
                monitor.x + monitor.width,
                monitor.y + monitor.height
            )
            print(f"  Bounding box: {bbox}")
            
            # Try to capture this monitor
            try:
                print(f"  Capturing {monitor_id}...")
                screenshot = ImageGrab.grab(bbox=bbox)
                
                # Add debug info to image
                draw = ImageDraw.Draw(screenshot)
                try:
                    # Try to use default font
                    font = ImageFont.load_default()
                except:
                    font = None
                
                text = f"{monitor_id}\n{monitor.width}x{monitor.height}\nPos: ({monitor.x}, {monitor.y})"
                draw.text((10, 10), text, fill=(255, 0, 0), font=font)
                
                # Save debug image
                filename = f"debug_{monitor_id}_{int(time.time())}.png"
                screenshot.save(filename)
                print(f"  Saved debug image: {filename}")
                print(f"  Image size: {screenshot.size}")
                print(f"  Image mode: {screenshot.mode}")
                
                # Check if image is mostly black
                pixels = list(screenshot.getdata())
                black_pixels = sum(1 for pixel in pixels if sum(pixel[:3]) < 30)  # Very dark pixels
                total_pixels = len(pixels)
                black_percentage = (black_pixels / total_pixels) * 100
                print(f"  Black pixels: {black_percentage:.1f}%")
                
                if black_percentage > 90:
                    print(f"  WARNING: {monitor_id} appears to be mostly black!")
                
            except Exception as e:
                print(f"  ERROR capturing {monitor_id}: {e}")
        
        # Also capture full desktop
        print(f"\nCapturing full desktop...")
        try:
            full_screenshot = ImageGrab.grab()
            filename = f"debug_full_desktop_{int(time.time())}.png"
            full_screenshot.save(filename)
            print(f"Full desktop saved: {filename}")
            print(f"Full desktop size: {full_screenshot.size}")
        except Exception as e:
            print(f"ERROR capturing full desktop: {e}")
            
    except Exception as e:
        print(f"ERROR in monitor detection: {e}")

if __name__ == "__main__":
    debug_monitors()