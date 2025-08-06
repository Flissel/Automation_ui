#!/usr/bin/env python3
"""
Test script to capture and analyze monitor content without inactive detection.
Part of TRAE Unity AI Platform - Multi-Monitor Capture System
"""

import logging
import sys
from PIL import Image, ImageGrab
import screeninfo
import time

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def analyze_image_content(image: Image.Image, monitor_id: str):
    """Analyze image content to understand what's being captured."""
    try:
        # Get basic image info
        width, height = image.size
        pixels = list(image.getdata())
        
        # Sample every 100th pixel for analysis
        sample_pixels = pixels[::100]
        total_sampled = len(sample_pixels)
        
        # Analyze pixel distribution
        black_pixels = sum(1 for pixel in sample_pixels if sum(pixel[:3]) < 30)
        dark_pixels = sum(1 for pixel in sample_pixels if sum(pixel[:3]) < 100)
        bright_pixels = sum(1 for pixel in sample_pixels if sum(pixel[:3]) > 200)
        
        # Calculate percentages
        black_percentage = (black_pixels / total_sampled) * 100
        dark_percentage = (dark_pixels / total_sampled) * 100
        bright_percentage = (bright_pixels / total_sampled) * 100
        
        # Calculate average brightness
        avg_brightness = sum(sum(pixel[:3]) for pixel in sample_pixels) / (total_sampled * 3)
        
        logger.info(f"=== {monitor_id} Analysis ===")
        logger.info(f"Resolution: {width}x{height}")
        logger.info(f"Black pixels (RGB < 30): {black_percentage:.1f}%")
        logger.info(f"Dark pixels (RGB < 100): {dark_percentage:.1f}%")
        logger.info(f"Bright pixels (RGB > 200): {bright_percentage:.1f}%")
        logger.info(f"Average brightness: {avg_brightness:.1f}")
        
        # Determine monitor status
        if black_percentage > 95:
            status = "LIKELY INACTIVE (>95% black)"
        elif black_percentage > 80:
            status = "MOSTLY DARK (>80% black)"
        elif dark_percentage > 70:
            status = "DARK CONTENT"
        else:
            status = "ACTIVE WITH CONTENT"
            
        logger.info(f"Status: {status}")
        logger.info("")
        
        return {
            'black_percentage': black_percentage,
            'dark_percentage': dark_percentage,
            'bright_percentage': bright_percentage,
            'avg_brightness': avg_brightness,
            'status': status
        }
        
    except Exception as e:
        logger.error(f"Error analyzing image: {e}")
        return None

def test_monitor_capture():
    """Test capturing each monitor individually."""
    try:
        # Detect monitors
        monitors = screeninfo.get_monitors()
        logger.info(f"Detected {len(monitors)} monitor(s)")
        
        for i, monitor in enumerate(monitors):
            monitor_id = f"monitor_{i}"
            logger.info(f"\n=== Testing {monitor_id} ===")
            logger.info(f"Position: ({monitor.x}, {monitor.y})")
            logger.info(f"Size: {monitor.width}x{monitor.height}")
            logger.info(f"Primary: {monitor.is_primary}")
            
            # Define capture area
            left = monitor.x
            top = monitor.y
            right = monitor.x + monitor.width
            bottom = monitor.y + monitor.height
            
            logger.info(f"Capture area: ({left}, {top}, {right}, {bottom})")
            
            # Capture screenshot
            try:
                screenshot = ImageGrab.grab(bbox=(left, top, right, bottom))
                
                # Save debug image
                debug_filename = f"test_capture_{monitor_id}_{int(time.time())}.png"
                screenshot.save(debug_filename)
                logger.info(f"Saved debug image: {debug_filename}")
                
                # Analyze content
                analysis = analyze_image_content(screenshot, monitor_id)
                
                # Recommendation
                if analysis and analysis['black_percentage'] > 95:
                    logger.warning(f"⚠️  {monitor_id} appears to be inactive or showing black content")
                    logger.info("💡 Recommendations:")
                    logger.info("   • Check if the monitor is turned on")
                    logger.info("   • Check if there's content displayed on this monitor")
                    logger.info("   • Try moving a window to this monitor")
                else:
                    logger.info(f"✅ {monitor_id} appears to have active content")
                
            except Exception as e:
                logger.error(f"Failed to capture {monitor_id}: {e}")
        
        # Test full desktop capture
        logger.info("\n=== Testing Full Desktop Capture ===")
        try:
            full_screenshot = ImageGrab.grab()
            full_filename = f"test_capture_full_desktop_{int(time.time())}.png"
            full_screenshot.save(full_filename)
            logger.info(f"Saved full desktop capture: {full_filename}")
            
            analysis = analyze_image_content(full_screenshot, "full_desktop")
            
        except Exception as e:
            logger.error(f"Failed to capture full desktop: {e}")
            
    except Exception as e:
        logger.error(f"Monitor detection failed: {e}")

if __name__ == "__main__":
    logger.info("🔍 TRAE Unity AI Platform - Monitor Capture Test")
    logger.info("=" * 50)
    
    test_monitor_capture()
    
    logger.info("\n" + "=" * 50)
    logger.info("✅ Test completed! Check the generated images and analysis above.")
    logger.info("💡 If monitor_1 shows >95% black pixels, it's likely inactive.")
    logger.info("🔧 You can disable inactive detection by setting 'disable_inactive_detection': True in the client config.")