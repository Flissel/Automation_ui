#!/usr/bin/env python3
"""
Erweiterte Monitor-Diagnose
Testet verschiedene Erfassungsmethoden und Windows-APIs
"""

import logging
import sys
import time
from PIL import ImageGrab, Image
from screeninfo import get_monitors
import win32gui
import win32con
import win32api

# Logging konfigurieren
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def debug_windows_displays():
    """Debug Windows Display-APIs"""
    logger.info("=== WINDOWS DISPLAY API DEBUG ===")
    
    try:
        # Enumerate alle Displays
        def enum_display_proc(hMonitor, hdcMonitor, lprcMonitor, dwData):
            monitor_info = win32api.GetMonitorInfo(hMonitor)
            logger.info(f"Windows Monitor gefunden:")
            logger.info(f"  Handle: {hMonitor}")
            logger.info(f"  Monitor: {monitor_info['Monitor']}")
            logger.info(f"  Work: {monitor_info['Work']}")
            logger.info(f"  Flags: {monitor_info['Flags']}")
            logger.info(f"  Device: {monitor_info.get('Device', 'Unknown')}")
            return True
        
        win32api.EnumDisplayMonitors(None, None, enum_display_proc, 0)
        
    except Exception as e:
        logger.error(f"Fehler bei Windows Display API: {e}")

def test_different_capture_methods():
    """Teste verschiedene Erfassungsmethoden"""
    logger.info("=== CAPTURE METHODS TEST ===")
    
    try:
        monitors = get_monitors()
        if len(monitors) < 2:
            logger.warning("Weniger als 2 Monitore für Test!")
            return
            
        # Monitor 1 (der problematische)
        monitor = monitors[1]
        logger.info(f"Teste Monitor 1: {monitor.width}x{monitor.height} @ ({monitor.x}, {monitor.y})")
        
        timestamp = int(time.time())
        
        # Methode 1: Direkte Koordinaten
        logger.info("Methode 1: Direkte Koordinaten")
        bbox1 = (monitor.x, monitor.y, monitor.x + monitor.width, monitor.y + monitor.height)
        logger.info(f"BBox: {bbox1}")
        
        try:
            img1 = ImageGrab.grab(bbox=bbox1)
            img1.save(f"method1_monitor1_{timestamp}.png")
            logger.info(f"Methode 1 erfolgreich: {img1.size}")
            
            # Analysiere Bild
            pixels = list(img1.getdata())
            unique_colors = len(set(pixels))
            black_pixels = sum(1 for p in pixels if p == (0, 0, 0) or (isinstance(p, int) and p == 0))
            logger.info(f"Methode 1 - Einzigartige Farben: {unique_colors}, Schwarze Pixel: {(black_pixels/len(pixels)*100):.1f}%")
            
        except Exception as e:
            logger.error(f"Methode 1 fehlgeschlagen: {e}")
        
        # Methode 2: Ohne BBox (Gesamtbildschirm)
        logger.info("Methode 2: Gesamtbildschirm ohne BBox")
        try:
            img2 = ImageGrab.grab()
            img2.save(f"method2_full_{timestamp}.png")
            logger.info(f"Methode 2 erfolgreich: {img2.size}")
            
            # Schneide Monitor-Bereich aus
            # Berechne relative Position
            min_x = min(m.x for m in monitors)
            min_y = min(m.y for m in monitors)
            rel_x = monitor.x - min_x
            rel_y = monitor.y - min_y
            
            crop_box = (rel_x, rel_y, rel_x + monitor.width, rel_y + monitor.height)
            logger.info(f"Crop Box: {crop_box}")
            
            img2_cropped = img2.crop(crop_box)
            img2_cropped.save(f"method2_monitor1_cropped_{timestamp}.png")
            logger.info(f"Methode 2 Crop erfolgreich: {img2_cropped.size}")
            
            # Analysiere Bild
            pixels = list(img2_cropped.getdata())
            unique_colors = len(set(pixels))
            black_pixels = sum(1 for p in pixels if p == (0, 0, 0) or (isinstance(p, int) and p == 0))
            logger.info(f"Methode 2 - Einzigartige Farben: {unique_colors}, Schwarze Pixel: {(black_pixels/len(pixels)*100):.1f}%")
            
        except Exception as e:
            logger.error(f"Methode 2 fehlgeschlagen: {e}")
        
        # Methode 3: Mit all=True Parameter
        logger.info("Methode 3: Mit all=True Parameter")
        try:
            img3 = ImageGrab.grab(bbox=bbox1, all_screens=True)
            img3.save(f"method3_monitor1_allscreens_{timestamp}.png")
            logger.info(f"Methode 3 erfolgreich: {img3.size}")
            
            # Analysiere Bild
            pixels = list(img3.getdata())
            unique_colors = len(set(pixels))
            black_pixels = sum(1 for p in pixels if p == (0, 0, 0) or (isinstance(p, int) and p == 0))
            logger.info(f"Methode 3 - Einzigartige Farben: {unique_colors}, Schwarze Pixel: {(black_pixels/len(pixels)*100):.1f}%")
            
        except Exception as e:
            logger.error(f"Methode 3 fehlgeschlagen: {e}")
            
    except Exception as e:
        logger.error(f"Fehler bei Capture-Methods-Test: {e}")

def check_monitor_power_state():
    """Prüfe Monitor-Power-Status"""
    logger.info("=== MONITOR POWER STATE ===")
    
    try:
        # Versuche Power-Status zu ermitteln
        import ctypes
        from ctypes import wintypes
        
        user32 = ctypes.windll.user32
        
        # Monitor Power State
        MONITOR_DEFAULTTOPRIMARY = 0x00000001
        MONITOR_DEFAULTTONEAREST = 0x00000002
        
        # Hole Primary Monitor
        hMonitor = user32.MonitorFromPoint(ctypes.wintypes.POINT(0, 0), MONITOR_DEFAULTTOPRIMARY)
        logger.info(f"Primary Monitor Handle: {hMonitor}")
        
        # Hole Secondary Monitor
        hMonitor2 = user32.MonitorFromPoint(ctypes.wintypes.POINT(1920, 0), MONITOR_DEFAULTTONEAREST)
        logger.info(f"Secondary Monitor Handle: {hMonitor2}")
        
        if hMonitor == hMonitor2:
            logger.warning("Beide Monitor-Handles sind identisch - möglicherweise ist der zweite Monitor nicht aktiv!")
        else:
            logger.info("Verschiedene Monitor-Handles erkannt - beide Monitore sollten aktiv sein")
            
    except Exception as e:
        logger.error(f"Fehler bei Monitor-Power-Check: {e}")

def main():
    """Hauptfunktion"""
    logger.info("Starte erweiterte Monitor-Diagnose...")
    
    debug_windows_displays()
    check_monitor_power_state()
    test_different_capture_methods()
    
    logger.info("Erweiterte Diagnose abgeschlossen!")

if __name__ == '__main__':
    main()