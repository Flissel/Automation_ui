#!/usr/bin/env python3
"""
Verifizierung der Dual-Screen-Korrektur
Vergleicht die Erfassung mit und ohne all_screens=True
"""

import logging
from PIL import ImageGrab
from screeninfo import get_monitors
import time

# Logging konfigurieren
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def verify_dual_screen_fix():
    """Verifiziere die Dual-Screen-Korrektur"""
    logger.info("=== DUAL-SCREEN-KORREKTUR VERIFIKATION ===")
    
    try:
        monitors = get_monitors()
        if len(monitors) < 2:
            logger.error("Weniger als 2 Monitore erkannt!")
            return
            
        # Monitor-Konfiguration
        min_x = min(m.x for m in monitors)
        max_x = max(m.x + m.width for m in monitors)
        min_y = min(m.y for m in monitors)
        max_y = max(m.y + m.height for m in monitors)
        
        total_width = max_x - min_x
        total_height = max_y - min_y
        
        logger.info(f"Gesamtauflösung: {total_width}x{total_height}")
        
        bbox = (min_x, min_y, max_x, max_y)
        timestamp = int(time.time())
        
        # Test 1: OHNE all_screens=True (alte Methode)
        logger.info("Test 1: OHNE all_screens=True")
        img_without = ImageGrab.grab(bbox=bbox)
        img_without.save(f"verify_without_allscreens_{timestamp}.png")
        
        # Teile in Monitore
        sorted_monitors = sorted(monitors, key=lambda m: m.x)
        
        # Monitor 1 (Secondary)
        monitor1 = sorted_monitors[1]
        rel_x = monitor1.x - min_x
        rel_y = monitor1.y - min_y
        crop_box = (rel_x, rel_y, rel_x + monitor1.width, rel_y + monitor1.height)
        
        monitor1_without = img_without.crop(crop_box)
        monitor1_without.save(f"verify_monitor1_without_{timestamp}.png")
        
        # Analysiere
        pixels_without = list(monitor1_without.getdata())
        unique_colors_without = len(set(pixels_without))
        black_pixels_without = sum(1 for p in pixels_without if p == (0, 0, 0) or (isinstance(p, int) and p == 0))
        black_percentage_without = (black_pixels_without / len(pixels_without)) * 100
        
        logger.info(f"OHNE all_screens - Einzigartige Farben: {unique_colors_without}")
        logger.info(f"OHNE all_screens - Schwarze Pixel: {black_percentage_without:.1f}%")
        
        # Test 2: MIT all_screens=True (neue Methode)
        logger.info("Test 2: MIT all_screens=True")
        img_with = ImageGrab.grab(bbox=bbox, all_screens=True)
        img_with.save(f"verify_with_allscreens_{timestamp}.png")
        
        monitor1_with = img_with.crop(crop_box)
        monitor1_with.save(f"verify_monitor1_with_{timestamp}.png")
        
        # Analysiere
        pixels_with = list(monitor1_with.getdata())
        unique_colors_with = len(set(pixels_with))
        black_pixels_with = sum(1 for p in pixels_with if p == (0, 0, 0) or (isinstance(p, int) and p == 0))
        black_percentage_with = (black_pixels_with / len(pixels_with)) * 100
        
        logger.info(f"MIT all_screens - Einzigartige Farben: {unique_colors_with}")
        logger.info(f"MIT all_screens - Schwarze Pixel: {black_percentage_with:.1f}%")
        
        # Vergleich
        logger.info("=== VERGLEICH ===")
        improvement_colors = unique_colors_with - unique_colors_without
        improvement_black = black_percentage_without - black_percentage_with
        
        logger.info(f"Verbesserung Farben: +{improvement_colors}")
        logger.info(f"Verbesserung schwarze Pixel: -{improvement_black:.1f}%")
        
        if unique_colors_with > unique_colors_without * 10:
            logger.info("✅ KORREKTUR ERFOLGREICH - Deutliche Verbesserung der Bilderfassung!")
        else:
            logger.warning("⚠️ Korrektur zeigt wenig Verbesserung")
            
    except Exception as e:
        logger.error(f"Fehler bei Verifikation: {e}")

def main():
    """Hauptfunktion"""
    verify_dual_screen_fix()

if __name__ == '__main__':
    main()