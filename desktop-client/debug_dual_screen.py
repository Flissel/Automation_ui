#!/usr/bin/env python3
"""
Debug-Script für Dual-Screen-Erfassung
Testet die Monitor-Erkennung und Bildschirmerfassung
"""

import logging
from screeninfo import get_monitors
from PIL import ImageGrab, Image
import time

# Logging konfigurieren
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def debug_monitors():
    """Debug Monitor-Erkennung"""
    logger.info("=== MONITOR DEBUG ===")
    
    try:
        monitors = get_monitors()
        logger.info(f"Anzahl erkannte Monitore: {len(monitors)}")
        
        for i, monitor in enumerate(monitors):
            logger.info(f"Monitor {i}:")
            logger.info(f"  Position: ({monitor.x}, {monitor.y})")
            logger.info(f"  Größe: {monitor.width}x{monitor.height}")
            logger.info(f"  Primary: {getattr(monitor, 'is_primary', 'Unknown')}")
            
        # Berechne Gesamtbounding-Box
        if monitors:
            min_x = min(m.x for m in monitors)
            max_x = max(m.x + m.width for m in monitors)
            min_y = min(m.y for m in monitors)
            max_y = max(m.y + m.height for m in monitors)
            
            total_width = max_x - min_x
            total_height = max_y - min_y
            
            logger.info(f"Gesamtauflösung: {total_width}x{total_height}")
            logger.info(f"Bounding Box: ({min_x}, {min_y}) bis ({max_x}, {max_y})")
            
            # Berechne Split-Position
            if len(monitors) >= 2:
                sorted_monitors = sorted(monitors, key=lambda m: m.x)
                split_pos = sorted_monitors[0].width
                logger.info(f"Berechnete Split-Position: {split_pos}")
            
    except Exception as e:
        logger.error(f"Fehler bei Monitor-Debug: {e}")

def debug_screen_capture():
    """Debug Bildschirmerfassung"""
    logger.info("=== SCREEN CAPTURE DEBUG ===")
    
    try:
        monitors = get_monitors()
        if len(monitors) < 2:
            logger.warning("Weniger als 2 Monitore erkannt!")
            return
            
        # Gesamtbildschirm erfassen
        min_x = min(m.x for m in monitors)
        max_x = max(m.x + m.width for m in monitors)
        min_y = min(m.y for m in monitors)
        max_y = max(m.y + m.height for m in monitors)
        
        total_width = max_x - min_x
        total_height = max_y - min_y
        
        logger.info(f"Erfasse Gesamtbereich: {total_width}x{total_height}")
        
        # Erfasse Gesamtbild
        bbox = (min_x, min_y, max_x, max_y)
        logger.info(f"Capture BBox: {bbox}")
        
        full_screenshot = ImageGrab.grab(bbox=bbox)
        logger.info(f"Erfasstes Bild: {full_screenshot.size}")
        
        # Speichere Debug-Bild
        timestamp = int(time.time())
        full_screenshot.save(f"debug_dual_screen_full_{timestamp}.png")
        logger.info(f"Gesamtbild gespeichert: debug_dual_screen_full_{timestamp}.png")
        
        # Teile in einzelne Monitore
        sorted_monitors = sorted(monitors, key=lambda m: m.x)
        
        for i, monitor in enumerate(sorted_monitors):
            # Berechne relative Position im Gesamtbild
            rel_x = monitor.x - min_x
            rel_y = monitor.y - min_y
            
            logger.info(f"Monitor {i} - Relative Position: ({rel_x}, {rel_y})")
            logger.info(f"Monitor {i} - Größe: {monitor.width}x{monitor.height}")
            
            # Schneide Monitor-Bereich aus
            monitor_crop = (
                rel_x,
                rel_y, 
                rel_x + monitor.width,
                rel_y + monitor.height
            )
            
            logger.info(f"Monitor {i} - Crop Box: {monitor_crop}")
            
            monitor_image = full_screenshot.crop(monitor_crop)
            logger.info(f"Monitor {i} - Bild: {monitor_image.size}")
            
            # Speichere Monitor-Bild
            monitor_image.save(f"debug_monitor_{i}_{timestamp}.png")
            logger.info(f"Monitor {i} Bild gespeichert: debug_monitor_{i}_{timestamp}.png")
            
            # Analysiere Bildinhalt
            pixels = list(monitor_image.getdata())
            unique_colors = len(set(pixels))
            logger.info(f"Monitor {i} - Einzigartige Farben: {unique_colors}")
            
            # Prüfe auf schwarzes Bild
            black_pixels = sum(1 for p in pixels if p == (0, 0, 0) or (isinstance(p, int) and p == 0))
            total_pixels = len(pixels)
            black_percentage = (black_pixels / total_pixels) * 100
            logger.info(f"Monitor {i} - Schwarze Pixel: {black_percentage:.1f}%")
            
    except Exception as e:
        logger.error(f"Fehler bei Screen-Capture-Debug: {e}")

def main():
    """Hauptfunktion"""
    logger.info("Starte Dual-Screen Debug...")
    
    debug_monitors()
    debug_screen_capture()
    
    logger.info("Debug abgeschlossen!")

if __name__ == '__main__':
    main()