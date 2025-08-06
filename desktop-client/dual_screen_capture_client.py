#!/usr/bin/env python3
"""
Dual Screen Capture Client für TRAE Unity AI Platform
Erfasst beide Bildschirme gleichzeitig, schneidet sie am Übergang und sendet sie asynchron an separate Desktop-Views.

Requirements:
- pip install websockets pillow pynput pyautogui screeninfo opencv-python numpy

Usage:
python dual_screen_capture_client.py --server-url ws://localhost:8084
"""

import asyncio
import websockets
import json
import base64
import time
import logging
import argparse
import uuid
import threading
from typing import Optional, Dict, Any, List, Tuple
from PIL import Image, ImageGrab
import io
import cv2
import numpy as np
from screeninfo import get_monitors

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class DualScreenCaptureClient:
    """
    Erweiterte Desktop-Capture-Client für gleichzeitige Dual-Screen-Erfassung.
    Folgt den TRAE Unity AI Platform Namenskonventionen und Coding-Standards.
    """
    
    def __init__(self, server_url: str, client_id: Optional[str] = None):
        """
        Initialisiert den Dual-Screen-Capture-Client.
        
        Args:
            server_url: WebSocket-Server-URL für die Verbindung
            client_id: Optionale Client-Kennung (automatisch generiert falls nicht angegeben)
        """
        self.server_url = server_url
        self.client_id = client_id or f"dual_screen_client_{str(uuid.uuid4())[:8]}"
        self.websocket: Optional[websockets.WebSocketServerProtocol] = None
        
        # Capture-Konfiguration
        self.is_capturing = False
        self.capture_config = {
            'fps': 10,
            'quality': 80,
            'scale': 1.0,
            'format': 'jpeg'
        }
        
        # Monitor-Informationen
        self.monitors = []
        self.total_width = 0
        self.total_height = 0
        self.screen_split_position = 0
        
        # Threading für asynchrone Verarbeitung
        self.capture_thread = None
        self.processing_thread = None
        self.frame_queue = asyncio.Queue()
        
        # Client-Fähigkeiten
        self.capabilities = {
            'dual_screen_capture': True,
            'async_processing': True,
            'screen_splitting': True,
            'multiple_monitors': True,
            'max_resolution': [3840, 1080],  # Dual 1920x1080 screens
            'supported_formats': ['jpeg', 'png'],
            'max_fps': 60
        }
        
        # Initialisiere Monitor-Erkennung
        self._detect_dual_monitors()
        
        logger.info(f"DualScreenCaptureClient initialisiert: {self.client_id}")
        logger.info(f"Erkannte Monitore: {len(self.monitors)}")
        logger.info(f"Gesamtauflösung: {self.total_width}x{self.total_height}")
        logger.info(f"Split-Position: {self.screen_split_position}")

    def _detect_dual_monitors(self):
        """
        Erkennt verfügbare Monitore und berechnet die Gesamtauflösung.
        Optimiert für Dual-Monitor-Setups.
        """
        try:
            # Verwende screeninfo für präzise Monitor-Erkennung
            monitors = get_monitors()
            self.monitors = []
            
            min_x = float('inf')
            max_x = float('-inf')
            min_y = float('inf')
            max_y = float('-inf')
            
            for i, monitor in enumerate(monitors):
                monitor_info = {
                    'index': i,
                    'name': f'Monitor {i + 1}',
                    'x': monitor.x,
                    'y': monitor.y,
                    'width': monitor.width,
                    'height': monitor.height,
                    'is_primary': monitor.is_primary if hasattr(monitor, 'is_primary') else (i == 0)
                }
                self.monitors.append(monitor_info)
                
                # Berechne Gesamtbounding-Box
                min_x = min(min_x, monitor.x)
                max_x = max(max_x, monitor.x + monitor.width)
                min_y = min(min_y, monitor.y)
                max_y = max(max_y, monitor.y + monitor.height)
                
                logger.info(f"Monitor {i}: {monitor.width}x{monitor.height} @ ({monitor.x}, {monitor.y})")
            
            # Berechne Gesamtauflösung
            self.total_width = max_x - min_x
            self.total_height = max_y - min_y
            
            # Berechne Split-Position (normalerweise bei der Hälfte der Breite)
            if len(self.monitors) >= 2:
                # Sortiere Monitore nach X-Position
                sorted_monitors = sorted(self.monitors, key=lambda m: m['x'])
                # Split-Position ist am Ende des ersten Monitors
                self.screen_split_position = sorted_monitors[0]['width']
            else:
                # Fallback für Single-Monitor
                self.screen_split_position = self.total_width // 2
                
            logger.info(f"Dual-Monitor-Setup erkannt: {self.total_width}x{self.total_height}")
            logger.info(f"Split-Position berechnet: {self.screen_split_position}")
            
        except Exception as e:
            logger.error(f"Fehler bei Monitor-Erkennung: {e}")
            # Fallback-Konfiguration
            self.monitors = [
                {
                    'index': 0,
                    'name': 'Primary Monitor',
                    'x': 0,
                    'y': 0,
                    'width': 1920,
                    'height': 1080,
                    'is_primary': True
                },
                {
                    'index': 1,
                    'name': 'Secondary Monitor',
                    'x': 1920,
                    'y': 0,
                    'width': 1920,
                    'height': 1080,
                    'is_primary': False
                }
            ]
            self.total_width = 3840
            self.total_height = 1080
            self.screen_split_position = 1920

    async def connect(self):
        """
        Stellt Verbindung zum WebSocket-Server her.
        """
        try:
            logger.info(f"Verbinde zu WebSocket-Server: {self.server_url}")
            self.websocket = await websockets.connect(self.server_url)
            logger.info("WebSocket-Verbindung hergestellt")
            
            # Sende Handshake mit erweiterten Dual-Screen-Fähigkeiten
            handshake_message = {
                'type': 'handshake',
                'clientInfo': {
                    'clientType': 'desktop_capture',
                    'clientId': self.client_id,
                    'desktopId': f'dual_desktop_{self.client_id}',
                    'screenId': 'dual_screen',
                    'capabilities': self.capabilities,
                    'monitors': self.monitors,
                    'total_resolution': {
                        'width': self.total_width,
                        'height': self.total_height
                    },
                    'split_position': self.screen_split_position
                },
                'timestamp': time.time()
            }
            
            await self.websocket.send(json.dumps(handshake_message))
            logger.info("Handshake gesendet")
            
            # Warte auf Handshake-Bestätigung
            response = await self.websocket.recv()
            response_data = json.loads(response)
            
            if response_data.get('type') == 'handshake_ack':
                logger.info("Handshake bestätigt")
                return True
            else:
                logger.error(f"Unerwartete Handshake-Antwort: {response_data}")
                return False
                
        except Exception as e:
            logger.error(f"Verbindungsfehler: {e}")
            return False

    def capture_dual_screen(self) -> Optional[Image.Image]:
        """
        Erfasst beide Bildschirme als ein zusammenhängendes Bild.
        
        Returns:
            PIL Image mit beiden Bildschirmen oder None bei Fehler
        """
        try:
            # Erfasse den gesamten Desktop-Bereich
            bbox = (0, 0, self.total_width, self.total_height)
            screenshot = ImageGrab.grab(bbox=bbox)
            
            logger.debug(f"Dual-Screen erfasst: {screenshot.size}")
            return screenshot
            
        except Exception as e:
            logger.error(f"Fehler bei Dual-Screen-Capture: {e}")
            return None

    def split_dual_screen(self, combined_image: Image.Image) -> Tuple[Optional[Image.Image], Optional[Image.Image]]:
        """
        Teilt das kombinierte Dual-Screen-Bild in zwei separate Bildschirme.
        
        Args:
            combined_image: Das kombinierte Bild beider Bildschirme
            
        Returns:
            Tuple mit (screen1_image, screen2_image)
        """
        try:
            # Teile das Bild an der berechneten Split-Position
            screen1 = combined_image.crop((0, 0, self.screen_split_position, self.total_height))
            screen2 = combined_image.crop((self.screen_split_position, 0, self.total_width, self.total_height))
            
            logger.debug(f"Bildschirme geteilt: Screen1={screen1.size}, Screen2={screen2.size}")
            return screen1, screen2
            
        except Exception as e:
            logger.error(f"Fehler beim Teilen der Bildschirme: {e}")
            return None, None

    def process_image(self, image: Image.Image, screen_id: str) -> Optional[str]:
        """
        Verarbeitet ein Bild für die Übertragung.
        
        Args:
            image: Das zu verarbeitende PIL-Image
            screen_id: Kennung des Bildschirms ('screen1' oder 'screen2')
            
        Returns:
            Base64-kodiertes Bild oder None bei Fehler
        """
        try:
            # Skalierung anwenden falls konfiguriert
            if self.capture_config['scale'] != 1.0:
                new_width = int(image.width * self.capture_config['scale'])
                new_height = int(image.height * self.capture_config['scale'])
                image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # Konvertiere zu JPEG mit konfigurierter Qualität
            buffer = io.BytesIO()
            image.save(buffer, format='JPEG', quality=self.capture_config['quality'], optimize=True)
            
            # Kodiere als Base64
            image_data = base64.b64encode(buffer.getvalue()).decode('utf-8')
            
            logger.debug(f"Bild verarbeitet für {screen_id}: {len(image_data)} Zeichen")
            return image_data
            
        except Exception as e:
            logger.error(f"Fehler bei Bildverarbeitung für {screen_id}: {e}")
            return None

    async def send_frame_data(self, screen1_data: str, screen2_data: str):
        """
        Sendet die Frame-Daten beider Bildschirme asynchron an den Server.
        
        Args:
            screen1_data: Base64-kodierte Daten für Bildschirm 1
            screen2_data: Base64-kodierte Daten für Bildschirm 2
        """
        try:
            if not self.websocket:
                logger.warning("Keine WebSocket-Verbindung verfügbar")
                return
            
            timestamp = time.time()
            
            # Sende Bildschirm 1 Daten
            if screen1_data:
                frame_message_1 = {
                    'type': 'frame_data',
                    'frameData': screen1_data,
                    'metadata': {
                        'clientId': self.client_id,
                        'screenId': 'screen1',
                        'timestamp': timestamp,
                        'format': self.capture_config['format'],
                        'quality': self.capture_config['quality']
                    },
                    'monitorId': 'monitor_0',
                    'width': self.screen_split_position,
                    'height': self.total_height,
                    'routingInfo': {
                        'isDualScreen': True,
                        'screenIndex': 0,
                        'totalScreens': 2
                    }
                }
                
                await self.websocket.send(json.dumps(frame_message_1))
                logger.debug("Frame-Daten für Bildschirm 1 gesendet")
            
            # Sende Bildschirm 2 Daten (asynchron)
            if screen2_data:
                frame_message_2 = {
                    'type': 'frame_data',
                    'frameData': screen2_data,
                    'metadata': {
                        'clientId': self.client_id,
                        'screenId': 'screen2',
                        'timestamp': timestamp,
                        'format': self.capture_config['format'],
                        'quality': self.capture_config['quality']
                    },
                    'monitorId': 'monitor_1',
                    'width': self.total_width - self.screen_split_position,
                    'height': self.total_height,
                    'routingInfo': {
                        'isDualScreen': True,
                        'screenIndex': 1,
                        'totalScreens': 2
                    }
                }
                
                await self.websocket.send(json.dumps(frame_message_2))
                logger.debug("Frame-Daten für Bildschirm 2 gesendet")
                
        except Exception as e:
            logger.error(f"Fehler beim Senden der Frame-Daten: {e}")

    async def capture_loop(self):
        """
        Hauptschleife für kontinuierliche Dual-Screen-Erfassung.
        """
        logger.info("Starte Dual-Screen-Capture-Schleife")
        
        frame_interval = 1.0 / self.capture_config['fps']
        
        while self.is_capturing:
            try:
                start_time = time.time()
                
                # Erfasse beide Bildschirme gleichzeitig
                combined_image = self.capture_dual_screen()
                if not combined_image:
                    await asyncio.sleep(0.1)
                    continue
                
                # Teile das Bild in zwei separate Bildschirme
                screen1_image, screen2_image = self.split_dual_screen(combined_image)
                
                if screen1_image and screen2_image:
                    # Verarbeite beide Bilder parallel
                    screen1_data = self.process_image(screen1_image, 'screen1')
                    screen2_data = self.process_image(screen2_image, 'screen2')
                    
                    # Sende Frame-Daten asynchron
                    await self.send_frame_data(screen1_data, screen2_data)
                
                # Frame-Rate-Kontrolle
                elapsed_time = time.time() - start_time
                sleep_time = max(0, frame_interval - elapsed_time)
                
                if sleep_time > 0:
                    await asyncio.sleep(sleep_time)
                    
            except Exception as e:
                logger.error(f"Fehler in Capture-Schleife: {e}")
                await asyncio.sleep(1)  # Kurze Pause bei Fehlern

    async def handle_messages(self):
        """
        Behandelt eingehende WebSocket-Nachrichten.
        """
        try:
            async for message in self.websocket:
                try:
                    data = json.loads(message)
                    message_type = data.get('type')
                    
                    logger.info(f"Nachricht empfangen: {message_type}")
                    
                    if message_type == 'start_capture':
                        # Aktualisiere Capture-Konfiguration
                        config = data.get('config', {})
                        self.capture_config.update(config)
                        
                        if not self.is_capturing:
                            self.is_capturing = True
                            # Starte Capture-Schleife
                            asyncio.create_task(self.capture_loop())
                            logger.info("Dual-Screen-Capture gestartet")
                        
                    elif message_type == 'stop_capture':
                        self.is_capturing = False
                        logger.info("Dual-Screen-Capture gestoppt")
                        
                    elif message_type == 'ping':
                        # Antworte auf Ping
                        pong_message = {
                            'type': 'pong',
                            'timestamp': time.time()
                        }
                        await self.websocket.send(json.dumps(pong_message))
                        
                    elif message_type == 'update_config':
                        # Aktualisiere Konfiguration
                        new_config = data.get('config', {})
                        self.capture_config.update(new_config)
                        logger.info(f"Konfiguration aktualisiert: {new_config}")
                        
                except json.JSONDecodeError as e:
                    logger.error(f"Fehler beim Parsen der Nachricht: {e}")
                except Exception as e:
                    logger.error(f"Fehler bei Nachrichtenbehandlung: {e}")
                    
        except websockets.exceptions.ConnectionClosed:
            logger.info("WebSocket-Verbindung geschlossen")
        except Exception as e:
            logger.error(f"Fehler in Nachrichtenbehandlung: {e}")

    async def run(self):
        """
        Hauptausführungsmethode für den Dual-Screen-Capture-Client.
        """
        try:
            # Verbinde zum Server
            if not await self.connect():
                logger.error("Verbindung zum Server fehlgeschlagen")
                return
            
            logger.info("Dual-Screen-Capture-Client läuft...")
            
            # Starte Nachrichtenbehandlung
            await self.handle_messages()
            
        except KeyboardInterrupt:
            logger.info("Client durch Benutzer gestoppt")
        except Exception as e:
            logger.error(f"Unerwarteter Fehler: {e}")
        finally:
            # Cleanup
            self.is_capturing = False
            if self.websocket:
                await self.websocket.close()
            logger.info("Dual-Screen-Capture-Client beendet")

def main():
    """
    Hauptfunktion für den Dual-Screen-Capture-Client.
    """
    parser = argparse.ArgumentParser(description='Dual Screen Capture Client für TRAE Unity AI Platform')
    parser.add_argument('--server-url', default='ws://localhost:8084', 
                       help='WebSocket-Server-URL (Standard: ws://localhost:8084)')
    parser.add_argument('--client-id', help='Client-ID (automatisch generiert falls nicht angegeben)')
    parser.add_argument('--fps', type=int, default=10, help='Frames pro Sekunde (Standard: 10)')
    parser.add_argument('--quality', type=int, default=80, help='JPEG-Qualität 1-100 (Standard: 80)')
    parser.add_argument('--scale', type=float, default=1.0, help='Skalierungsfaktor (Standard: 1.0)')
    parser.add_argument('--debug', action='store_true', help='Debug-Modus aktivieren')
    
    args = parser.parse_args()
    
    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Erstelle Client-Instanz
    client = DualScreenCaptureClient(
        server_url=args.server_url,
        client_id=args.client_id
    )
    
    # Setze initiale Konfiguration
    client.capture_config.update({
        'fps': args.fps,
        'quality': args.quality,
        'scale': args.scale
    })
    
    # Starte Client
    try:
        asyncio.run(client.run())
    except KeyboardInterrupt:
        logger.info("Client durch Benutzer gestoppt")
    except Exception as e:
        logger.error(f"Fehler beim Starten des Clients: {e}")

if __name__ == '__main__':
    main()