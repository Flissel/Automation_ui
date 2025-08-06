#!/usr/bin/env python3
"""
Dual Screen Capture Client für TRAE Unity AI Platform
=====================================================

Erweiterte Multi-Monitor-Capture-Lösung mit automatischer Bildaufteilung
und asynchroner Übertragung an separate Desktop-Views.

Features:
- Simultane Capture beider Bildschirme
- Automatische Erkennung der Bildschirmübergänge
- Asynchrone Bildübertragung
- WebSocket-Integration
- Performance-Optimierung
- Fehlerbehandlung und Reconnection

Autor: TRAE Unity AI Platform
Version: 1.0.0
"""

import asyncio
import websockets
import json
import base64
import time
import logging
import threading
from typing import Dict, List, Tuple, Optional, Callable
from dataclasses import dataclass
from PIL import Image, ImageGrab
import io
import numpy as np
import cv2
import sys
import os

# Logging-Konfiguration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('dual_screen_capture.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class ScreenInfo:
    """Informationen über einen Bildschirm"""
    index: int
    x: int
    y: int
    width: int
    height: int
    is_primary: bool
    name: str

@dataclass
class CaptureFrame:
    """Einzelner Capture-Frame mit Metadaten"""
    screen_id: str
    image_data: bytes
    timestamp: float
    width: int
    height: int
    format: str = "JPEG"
    quality: int = 85

class DualScreenCaptureClient:
    """
    Erweiterte Dual-Screen-Capture-Client-Klasse
    
    Verwaltet die simultane Capture beider Bildschirme, automatische
    Bildaufteilung und asynchrone Übertragung an WebSocket-Server.
    """
    
    def __init__(self, 
                 server_url: str = "ws://localhost:8084",
                 client_id: str = None,
                 capture_fps: int = 30,
                 image_quality: int = 85,
                 auto_detect_screens: bool = True):
        """
        Initialisiert den Dual-Screen-Capture-Client
        
        Args:
            server_url: WebSocket-Server-URL
            client_id: Eindeutige Client-ID
            capture_fps: Capture-Framerate
            image_quality: JPEG-Qualität (1-100)
            auto_detect_screens: Automatische Bildschirmerkennung
        """
        self.server_url = server_url
        self.client_id = client_id or f"dual_screen_client_{int(time.time())}"
        self.capture_fps = capture_fps
        self.image_quality = image_quality
        self.auto_detect_screens = auto_detect_screens
        
        # WebSocket-Verbindung
        self.websocket = None
        self.is_connected = False
        self.is_capturing = False
        
        # Bildschirm-Informationen
        self.screens: List[ScreenInfo] = []
        self.total_width = 0
        self.total_height = 0
        self.transition_x = 0
        
        # Capture-Threading
        self.capture_thread = None
        self.stop_event = threading.Event()
        
        # Performance-Metriken
        self.frames_sent = 0
        self.last_fps_check = time.time()
        self.current_fps = 0
        
        # Callbacks
        self.on_connection_change: Optional[Callable[[bool], None]] = None
        self.on_frame_sent: Optional[Callable[[str, int], None]] = None
        self.on_error: Optional[Callable[[Exception], None]] = None
        
        logger.info(f"Dual Screen Capture Client initialisiert: {self.client_id}")
    
    def detect_screens(self) -> List[ScreenInfo]:
        """
        Erkennt verfügbare Bildschirme automatisch
        
        Returns:
            Liste der erkannten Bildschirme
        """
        try:
            import tkinter as tk
            root = tk.Tk()
            root.withdraw()  # Verstecke das Hauptfenster
            
            screens = []
            screen_count = root.winfo_screenwidth()
            
            # Primärer Bildschirm
            primary_width = root.winfo_screenwidth()
            primary_height = root.winfo_screenheight()
            
            screens.append(ScreenInfo(
                index=0,
                x=0,
                y=0,
                width=primary_width,
                height=primary_height,
                is_primary=True,
                name="Primary Display"
            ))
            
            # Versuche sekundären Bildschirm zu erkennen
            try:
                # Erweiterte Bildschirmerkennung mit PIL
                bbox = ImageGrab.grab().size
                total_width = bbox[0]
                
                if total_width > primary_width:
                    # Sekundärer Bildschirm erkannt
                    secondary_width = total_width - primary_width
                    screens.append(ScreenInfo(
                        index=1,
                        x=primary_width,
                        y=0,
                        width=secondary_width,
                        height=primary_height,
                        is_primary=False,
                        name="Secondary Display"
                    ))
                    
                    self.transition_x = primary_width
                    self.total_width = total_width
                    self.total_height = primary_height
                    
                    logger.info(f"Dual-Screen-Setup erkannt: {primary_width}x{primary_height} + {secondary_width}x{primary_height}")
                else:
                    self.total_width = primary_width
                    self.total_height = primary_height
                    logger.info(f"Single-Screen-Setup erkannt: {primary_width}x{primary_height}")
                    
            except Exception as e:
                logger.warning(f"Erweiterte Bildschirmerkennung fehlgeschlagen: {e}")
                self.total_width = primary_width
                self.total_height = primary_height
            
            root.destroy()
            self.screens = screens
            return screens
            
        except Exception as e:
            logger.error(f"Bildschirmerkennung fehlgeschlagen: {e}")
            # Fallback: Standard-Bildschirm
            self.screens = [ScreenInfo(0, 0, 0, 1920, 1080, True, "Default Display")]
            self.total_width = 1920
            self.total_height = 1080
            return self.screens
    
    def capture_full_desktop(self) -> Image.Image:
        """
        Captured den gesamten Desktop (alle Bildschirme)
        
        Returns:
            PIL Image des gesamten Desktops
        """
        try:
            # Capture des gesamten verfügbaren Bereichs
            screenshot = ImageGrab.grab(bbox=(0, 0, self.total_width, self.total_height))
            return screenshot
        except Exception as e:
            logger.error(f"Desktop-Capture fehlgeschlagen: {e}")
            raise
    
    def split_desktop_image(self, full_image: Image.Image) -> Dict[str, Image.Image]:
        """
        Teilt das Desktop-Bild in separate Bildschirme auf
        
        Args:
            full_image: Vollständiges Desktop-Bild
            
        Returns:
            Dictionary mit aufgeteilten Bildschirmen
        """
        screens = {}
        
        try:
            for screen in self.screens:
                # Extrahiere Bildschirmbereich
                left = screen.x
                top = screen.y
                right = screen.x + screen.width
                bottom = screen.y + screen.height
                
                # Stelle sicher, dass die Koordinaten im Bildbereich liegen
                left = max(0, min(left, full_image.width))
                right = max(left, min(right, full_image.width))
                top = max(0, min(top, full_image.height))
                bottom = max(top, min(bottom, full_image.height))
                
                if right > left and bottom > top:
                    screen_image = full_image.crop((left, top, right, bottom))
                    screen_id = f"screen_{screen.index}"
                    screens[screen_id] = screen_image
                    
                    logger.debug(f"Bildschirm {screen_id} aufgeteilt: {screen_image.size}")
                
        except Exception as e:
            logger.error(f"Bildaufteilung fehlgeschlagen: {e}")
            # Fallback: Gesamtbild als Screen 0
            screens["screen_0"] = full_image
        
        return screens
    
    def image_to_base64(self, image: Image.Image, format: str = "JPEG") -> str:
        """
        Konvertiert PIL Image zu Base64-String
        
        Args:
            image: PIL Image
            format: Bildformat (JPEG, PNG)
            
        Returns:
            Base64-kodiertes Bild
        """
        try:
            buffer = io.BytesIO()
            
            # Optimiere Bildqualität basierend auf Größe
            quality = self.image_quality
            if image.width * image.height > 2073600:  # > 1920x1080
                quality = max(60, quality - 15)
            
            image.save(buffer, format=format, quality=quality, optimize=True)
            image_bytes = buffer.getvalue()
            return base64.b64encode(image_bytes).decode('utf-8')
            
        except Exception as e:
            logger.error(f"Base64-Konvertierung fehlgeschlagen: {e}")
            raise
    
    async def send_frame(self, screen_id: str, image_data: str, metadata: dict = None):
        """
        Sendet einen Frame an den WebSocket-Server
        
        Args:
            screen_id: Bildschirm-ID
            image_data: Base64-kodierte Bilddaten
            metadata: Zusätzliche Metadaten
        """
        if not self.websocket or not self.is_connected:
            return
        
        try:
            message = {
                "type": "dual_screen_frame",
                "client_id": self.client_id,
                "screen_id": screen_id,
                "timestamp": time.time(),
                "image_data": image_data,
                "metadata": metadata or {}
            }
            
            await self.websocket.send(json.dumps(message))
            self.frames_sent += 1
            
            if self.on_frame_sent:
                self.on_frame_sent(screen_id, len(image_data))
                
        except Exception as e:
            logger.error(f"Frame-Übertragung fehlgeschlagen für {screen_id}: {e}")
            if self.on_error:
                self.on_error(e)
    
    async def capture_loop(self):
        """
        Hauptschleife für kontinuierliche Bildschirmaufnahme
        """
        logger.info("Capture-Schleife gestartet")
        frame_interval = 1.0 / self.capture_fps
        
        while not self.stop_event.is_set() and self.is_capturing:
            try:
                start_time = time.time()
                
                # Capture gesamten Desktop
                full_image = self.capture_full_desktop()
                
                # Teile Bild in separate Bildschirme auf
                screen_images = self.split_desktop_image(full_image)
                
                # Sende Frames asynchron für jeden Bildschirm
                tasks = []
                for screen_id, screen_image in screen_images.items():
                    try:
                        # Konvertiere zu Base64
                        image_data = self.image_to_base64(screen_image)
                        
                        # Erstelle Metadaten
                        metadata = {
                            "width": screen_image.width,
                            "height": screen_image.height,
                            "format": "JPEG",
                            "quality": self.image_quality,
                            "screen_count": len(self.screens)
                        }
                        
                        # Erstelle asynchrone Aufgabe
                        task = asyncio.create_task(
                            self.send_frame(screen_id, image_data, metadata)
                        )
                        tasks.append(task)
                        
                    except Exception as e:
                        logger.error(f"Frame-Verarbeitung fehlgeschlagen für {screen_id}: {e}")
                
                # Warte auf alle Übertragungen
                if tasks:
                    await asyncio.gather(*tasks, return_exceptions=True)
                
                # FPS-Berechnung
                current_time = time.time()
                if current_time - self.last_fps_check >= 1.0:
                    self.current_fps = self.frames_sent / (current_time - self.last_fps_check)
                    self.frames_sent = 0
                    self.last_fps_check = current_time
                    logger.debug(f"Aktuelle FPS: {self.current_fps:.1f}")
                
                # Frame-Rate-Kontrolle
                elapsed = time.time() - start_time
                sleep_time = max(0, frame_interval - elapsed)
                if sleep_time > 0:
                    await asyncio.sleep(sleep_time)
                
            except Exception as e:
                logger.error(f"Capture-Schleife Fehler: {e}")
                if self.on_error:
                    self.on_error(e)
                await asyncio.sleep(1)  # Kurze Pause bei Fehlern
        
        logger.info("Capture-Schleife beendet")
    
    async def connect(self):
        """
        Stellt Verbindung zum WebSocket-Server her
        """
        try:
            logger.info(f"Verbinde zu WebSocket-Server: {self.server_url}")
            
            self.websocket = await websockets.connect(
                self.server_url,
                ping_interval=20,
                ping_timeout=10,
                close_timeout=10
            )
            
            self.is_connected = True
            
            # Sende Handshake
            handshake = {
                "type": "handshake",
                "client_type": "dual_screen_desktop",
                "client_id": self.client_id,
                "capabilities": {
                    "dual_screen": True,
                    "screen_count": len(self.screens),
                    "total_resolution": f"{self.total_width}x{self.total_height}",
                    "screens": [
                        {
                            "id": f"screen_{screen.index}",
                            "name": screen.name,
                            "resolution": f"{screen.width}x{screen.height}",
                            "position": f"{screen.x},{screen.y}",
                            "is_primary": screen.is_primary
                        }
                        for screen in self.screens
                    ]
                }
            }
            
            await self.websocket.send(json.dumps(handshake))
            logger.info("Handshake gesendet")
            
            if self.on_connection_change:
                self.on_connection_change(True)
            
        except Exception as e:
            logger.error(f"WebSocket-Verbindung fehlgeschlagen: {e}")
            self.is_connected = False
            if self.on_error:
                self.on_error(e)
            raise
    
    async def disconnect(self):
        """
        Trennt die WebSocket-Verbindung
        """
        try:
            self.is_capturing = False
            self.stop_event.set()
            
            if self.websocket:
                await self.websocket.close()
                self.websocket = None
            
            self.is_connected = False
            
            if self.on_connection_change:
                self.on_connection_change(False)
            
            logger.info("WebSocket-Verbindung getrennt")
            
        except Exception as e:
            logger.error(f"Fehler beim Trennen der Verbindung: {e}")
    
    async def start_capture(self):
        """
        Startet die Bildschirmaufnahme
        """
        if self.is_capturing:
            logger.warning("Capture bereits aktiv")
            return
        
        if not self.is_connected:
            logger.error("Keine WebSocket-Verbindung")
            return
        
        try:
            # Erkenne Bildschirme
            if self.auto_detect_screens:
                self.detect_screens()
            
            self.is_capturing = True
            self.stop_event.clear()
            
            logger.info(f"Starte Dual-Screen-Capture mit {len(self.screens)} Bildschirmen")
            
            # Starte Capture-Schleife
            await self.capture_loop()
            
        except Exception as e:
            logger.error(f"Fehler beim Starten der Capture: {e}")
            self.is_capturing = False
            if self.on_error:
                self.on_error(e)
    
    async def stop_capture(self):
        """
        Stoppt die Bildschirmaufnahme
        """
        self.is_capturing = False
        self.stop_event.set()
        logger.info("Dual-Screen-Capture gestoppt")
    
    async def run(self):
        """
        Hauptausführungsschleife
        """
        try:
            # Erkenne Bildschirme
            self.detect_screens()
            
            # Verbinde zu WebSocket
            await self.connect()
            
            # Starte Capture
            await self.start_capture()
            
        except KeyboardInterrupt:
            logger.info("Benutzerabbruch erkannt")
        except Exception as e:
            logger.error(f"Unerwarteter Fehler: {e}")
            if self.on_error:
                self.on_error(e)
        finally:
            await self.disconnect()

def main():
    """
    Hauptfunktion für direkten Aufruf
    """
    import argparse
    
    parser = argparse.ArgumentParser(description="Dual Screen Capture Client")
    parser.add_argument("--server", default="ws://localhost:8084", help="WebSocket Server URL")
    parser.add_argument("--client-id", help="Client ID")
    parser.add_argument("--fps", type=int, default=30, help="Capture FPS")
    parser.add_argument("--quality", type=int, default=85, help="JPEG Quality (1-100)")
    parser.add_argument("--debug", action="store_true", help="Debug Logging")
    
    args = parser.parse_args()
    
    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Erstelle Client
    client = DualScreenCaptureClient(
        server_url=args.server,
        client_id=args.client_id,
        capture_fps=args.fps,
        image_quality=args.quality
    )
    
    # Event-Handler
    def on_connection_change(connected):
        status = "verbunden" if connected else "getrennt"
        print(f"Verbindungsstatus: {status}")
    
    def on_frame_sent(screen_id, data_size):
        print(f"Frame gesendet für {screen_id}: {data_size} bytes")
    
    def on_error(error):
        print(f"Fehler: {error}")
    
    client.on_connection_change = on_connection_change
    client.on_frame_sent = on_frame_sent
    client.on_error = on_error
    
    # Starte Client
    try:
        asyncio.run(client.run())
    except KeyboardInterrupt:
        print("\nDual Screen Capture Client beendet")

if __name__ == "__main__":
    main()