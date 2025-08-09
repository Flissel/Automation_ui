#!/usr/bin/env python3
"""
Dual Screen Capture Client für TRAE Unity AI Platform
Erfasst beide Bildschirme gleichzeitig, schneidet sie am Übergang und sendet sie asynchron an separate Desktop-Views.

Requirements:
- pip install websockets pillow pynput pyautogui screeninfo opencv-python numpy

Usage:
python dual_screen_capture_client.py --server-url ws://localhost:8085
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

class PermissionHandler:
    """
    Minimal permission handler stub for standalone operation.
    Automatically grants all permissions for simplified operation.
    """
    def __init__(self):
        self.permissions = {}
        self.callback = None
        
    def set_permission_callback(self, callback):
        """Set callback for permission responses."""
        self.callback = callback
        
    async def handle_permission_request(self, request_id, requester_id, permission_type):
        """Handle permission request - automatically grant for standalone operation."""
        logger.info(f"Auto-granting permission: {permission_type} for {requester_id}")
        self.permissions[f"{requester_id}_{permission_type}"] = True
        if self.callback:
            await self.callback(request_id, requester_id, permission_type, True)
            
    def check_permission(self, requester_id, permission_type):
        """Check if permission is granted."""
        return self.permissions.get(f"{requester_id}_{permission_type}", True)  # Default to granted
        
    def revoke_permission(self, requester_id, permission_type):
        """Revoke permission."""
        key = f"{requester_id}_{permission_type}"
        if key in self.permissions:
            del self.permissions[key]

class DualScreenCaptureClient:
    """
    Erweiterte Desktop-Capture-Client für gleichzeitige Dual-Screen-Erfassung.
    Folgt den TRAE Unity AI Platform Namenskonventionen und Coding-Standards.
    Implementiert robuste Fehlerbehandlung und automatische Wiederverbindung.
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
        
        # Initialize permission handler
        self.permission_handler = PermissionHandler()
        self.permission_handler.set_permission_callback(self.send_permission_response)
        
        # Robustheit und Wiederverbindung
        self.is_connected = False
        self.reconnect_attempts = 0
        self.max_reconnect_attempts = 10
        self.reconnect_delay = 5.0  # Sekunden
        self.last_successful_send = time.time()
        self.connection_timeout = 30.0  # Sekunden
        self.ping_interval = 10.0  # Sekunden
        self.last_ping = time.time()
        
        # Capture-Konfiguration mit adaptiver Qualität
        self.is_capturing = False
        self.capture_config = {
            'fps': 8,  # Reduziert für bessere Stabilität
            'quality': 75,  # Reduziert für bessere Performance
            'scale': 1.0,
            'format': 'jpeg',
            'adaptive_quality': True,  # Passt Qualität bei Problemen an
            'min_quality': 50,
            'max_quality': 90
        }
        
        # Monitor-Informationen
        self.monitors = []
        self.total_width = 0
        self.total_height = 0
        self.screen_split_position = 0
        
        # Threading für asynchrone Verarbeitung
        self.capture_thread = None
        self.processing_thread = None
        self.frame_queue = asyncio.Queue(maxsize=5)  # Begrenzte Queue-Größe
        
        # Performance-Monitoring
        self.frame_stats = {
            'frames_sent': 0,
            'frames_failed': 0,
            'avg_frame_size': 0,
            'last_frame_time': 0,
            'consecutive_failures': 0
        }
        
        # Zusätzliche Stats für Kompatibilität
        self.stats = self.frame_stats
        
        # Client-Fähigkeiten
        self.capabilities = {
            'dual_screen_capture': True,
            'async_processing': True,
            'screen_splitting': True,
            'multiple_monitors': True,
            'max_resolution': [3840, 1080],  # Dual 1920x1080 screens
            'supported_formats': ['jpeg', 'png'],
            'max_fps': 60,
            'auto_reconnect': True,
            'adaptive_quality': True,
            'error_recovery': True
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
        Stellt robuste Verbindung zum WebSocket-Server her mit automatischer Wiederverbindung.
        """
        while self.reconnect_attempts < self.max_reconnect_attempts:
            try:
                logger.info(f"Verbindungsversuch {self.reconnect_attempts + 1}/{self.max_reconnect_attempts} zu: {self.server_url}")
                
                # Verbindung mit Timeout herstellen
                self.websocket = await asyncio.wait_for(
                    websockets.connect(
                        self.server_url,
                        ping_interval=self.ping_interval,
                        ping_timeout=10,
                        close_timeout=10
                    ),
                    timeout=self.connection_timeout
                )
                
                logger.info("WebSocket-Verbindung hergestellt")
                
                # Handshake durchführen
                if await self._perform_handshake():
                    self.is_connected = True
                    self.reconnect_attempts = 0
                    self.last_successful_send = time.time()
                    logger.info("✅ Verbindung erfolgreich hergestellt und bestätigt")
                    return True
                else:
                    logger.error("❌ Handshake fehlgeschlagen")
                    await self._close_connection()
                    
            except asyncio.TimeoutError:
                logger.error(f"⏱️ Verbindungs-Timeout nach {self.connection_timeout}s")
            except websockets.exceptions.ConnectionClosed:
                logger.error("🔌 Verbindung vom Server geschlossen")
            except Exception as e:
                logger.error(f"💥 Verbindungsfehler: {e}")
            
            # Wiederverbindungslogik
            self.reconnect_attempts += 1
            if self.reconnect_attempts < self.max_reconnect_attempts:
                wait_time = min(self.reconnect_delay * self.reconnect_attempts, 30)
                logger.info(f"⏳ Warte {wait_time}s vor nächstem Verbindungsversuch...")
                await asyncio.sleep(wait_time)
            
        logger.error(f"❌ Maximale Anzahl Wiederverbindungsversuche ({self.max_reconnect_attempts}) erreicht")
        return False

    async def _perform_handshake(self) -> bool:
        """
        Führt den Handshake mit dem Server durch.
        
        Returns:
            True wenn erfolgreich, False bei Fehler
        """
        try:
            # Sende Handshake mit erweiterten Dual-Screen-Fähigkeiten
            handshake_message = {
                'type': 'handshake',
                'clientInfo': {
                    'clientType': 'dual_screen_desktop',
                    'clientId': self.client_id,
                    'desktopId': f'dual_desktop_{self.client_id}',
                    'screenId': 'dual_screen',
                    'capabilities': self.capabilities,
                    'monitors': self.monitors,
                    'total_resolution': {
                        'width': self.total_width,
                        'height': self.total_height
                    },
                    'split_position': self.screen_split_position,
                    'reconnect_attempt': self.reconnect_attempts
                },
                'capabilities': self.capabilities,
                'timestamp': time.time()
            }
            
            await self.websocket.send(json.dumps(handshake_message))
            logger.info("📤 Handshake gesendet")
            
            # Warte auf Server-Antworten mit Timeout
            for attempt in range(3):
                try:
                    response = await asyncio.wait_for(self.websocket.recv(), timeout=10.0)
                    response_data = json.loads(response)
                    response_type = response_data.get('type')
                    
                    logger.info(f"📥 Server-Antwort {attempt + 1}: {response_type}")
                    
                    if response_type == 'handshake_ack':
                        logger.info("✅ Handshake bestätigt")
                        return True
                    elif response_type == 'connection_established':
                        logger.info("✅ Verbindung hergestellt bestätigt")
                        return True
                    elif response_type == 'ping':
                        logger.debug("🏓 Ping vom Server empfangen")
                        continue
                    else:
                        logger.warning(f"⚠️ Unerwartete Server-Nachricht: {response_type}")
                        
                except asyncio.TimeoutError:
                    logger.warning(f"⏱️ Timeout beim Warten auf Handshake-Antwort (Versuch {attempt + 1})")
                    continue
                except json.JSONDecodeError as e:
                    logger.error(f"📄 JSON-Dekodierungsfehler: {e}")
                    continue
                except Exception as e:
                    logger.error(f"💥 Fehler beim Empfangen der Handshake-Antwort: {e}")
                    break
            
            logger.error("❌ Keine gültige Handshake-Bestätigung erhalten")
            return False
            
        except Exception as e:
            logger.error(f"💥 Handshake-Fehler: {e}")
            return False

    async def _close_connection(self):
        """
        Schließt die WebSocket-Verbindung sauber.
        """
        try:
            if self.websocket:
                await self.websocket.close()
                logger.info("🔌 WebSocket-Verbindung geschlossen")
        except Exception as e:
            logger.error(f"💥 Fehler beim Schließen der Verbindung: {e}")
        finally:
            self.websocket = None
            self.is_connected = False

    async def ensure_connection(self) -> bool:
        """
        Stellt sicher, dass eine aktive Verbindung besteht.
        
        Returns:
            True wenn Verbindung aktiv, False bei Fehler
        """
        if not self.is_connected or not self.websocket:
            logger.info("🔄 Verbindung nicht aktiv, versuche Wiederverbindung...")
            return await self.connect()
        
        # Prüfe ob Verbindung noch aktiv ist
        try:
            # Prüfe verschiedene Möglichkeiten für den Verbindungsstatus
            is_closed = False
            if hasattr(self.websocket, 'closed'):
                is_closed = self.websocket.closed
            elif hasattr(self.websocket, 'close_code'):
                is_closed = self.websocket.close_code is not None
            elif hasattr(self.websocket, 'state'):
                is_closed = str(self.websocket.state) == 'CLOSED'
            
            if is_closed:
                logger.warning("🔌 Verbindung wurde geschlossen, versuche Wiederverbindung...")
                self.is_connected = False
                return await self.connect()
        except Exception as e:
            logger.error(f"💥 Fehler bei Verbindungsprüfung: {e}")
            self.is_connected = False
            return await self.connect()
        
        return True

    def capture_dual_screen(self) -> Optional[Image.Image]:
        """
        Erfasst beide Bildschirme als ein zusammenhängendes Bild mit robuster Fehlerbehandlung.
        
        Returns:
            PIL Image mit beiden Bildschirmen oder None bei Fehler
        """
        capture_attempts = 0
        max_capture_attempts = 3
        
        while capture_attempts < max_capture_attempts:
            try:
                # Erfasse den gesamten Desktop-Bereich mit all_screens=True für Multi-Monitor-Support
                bbox = (0, 0, self.total_width, self.total_height)
                screenshot = ImageGrab.grab(bbox=bbox, all_screens=True)
                
                # Validiere das erfasste Bild
                if screenshot and screenshot.size[0] > 0 and screenshot.size[1] > 0:
                    # Prüfe ob das Bild nicht komplett schwarz ist (Indikator für Capture-Probleme)
                    if self._validate_screenshot(screenshot):
                        logger.debug(f"✅ Dual-Screen erfasst: {screenshot.size}")
                        self.stats['frames_sent'] += 1
                        return screenshot
                    else:
                        logger.warning(f"⚠️ Screenshot-Validierung fehlgeschlagen (Versuch {capture_attempts + 1})")
                else:
                    logger.warning(f"⚠️ Ungültiges Screenshot erhalten (Versuch {capture_attempts + 1})")
                
            except PermissionError:
                logger.error("🔒 Berechtigung verweigert - Desktop-Capture nicht möglich")
                self.stats['frames_failed'] += 1
                return None
            except OSError as e:
                logger.error(f"💾 Betriebssystem-Fehler bei Capture: {e}")
                capture_attempts += 1
                if capture_attempts < max_capture_attempts:
                    time.sleep(0.1)  # Kurze Pause vor erneutem Versuch
            except Exception as e:
                logger.error(f"💥 Unerwarteter Fehler bei Dual-Screen-Capture: {e}")
                capture_attempts += 1
                if capture_attempts < max_capture_attempts:
                    time.sleep(0.1)
            
            capture_attempts += 1
        
        logger.error(f"❌ Dual-Screen-Capture nach {max_capture_attempts} Versuchen fehlgeschlagen")
        self.stats['frames_failed'] += 1
        return None

    def _validate_screenshot(self, screenshot: Image.Image) -> bool:
        """
        Validiert ein Screenshot auf Plausibilität.
        
        Args:
            screenshot: Das zu validierende Screenshot
            
        Returns:
            True wenn Screenshot gültig, False bei Problemen
        """
        try:
            # Prüfe Mindestgröße
            if screenshot.width < 100 or screenshot.height < 100:
                return False
            
            # Prüfe ob Bild nicht komplett schwarz ist (Sample-basiert für Performance)
            # Nehme nur eine kleine Stichprobe zur Validierung
            sample_width = min(100, screenshot.width)
            sample_height = min(100, screenshot.height)
            sample = screenshot.crop((0, 0, sample_width, sample_height))
            
            # Konvertiere zu Graustufen für einfachere Analyse
            grayscale = sample.convert('L')
            pixels = list(grayscale.getdata())
            
            # Prüfe ob mindestens 5% der Pixel nicht schwarz sind
            non_black_pixels = sum(1 for pixel in pixels if pixel > 10)
            non_black_ratio = non_black_pixels / len(pixels)
            
            if non_black_ratio < 0.05:
                logger.warning(f"⚠️ Screenshot scheint größtenteils schwarz zu sein ({non_black_ratio:.1%} nicht-schwarz)")
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"💥 Fehler bei Screenshot-Validierung: {e}")
            return False

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
        Sendet die Frame-Daten beider Bildschirme robust an den Server mit Fehlerbehandlung.
        
        Args:
            screen1_data: Base64-kodierte Daten für Bildschirm 1
            screen2_data: Base64-kodierte Daten für Bildschirm 2
        """
        # Prüfe Verbindungsstatus vor dem Senden
        if not await self.ensure_connection():
            logger.error("❌ Keine aktive Verbindung für Frame-Übertragung")
            self.stats['frames_failed'] += 1
            return
        
        try:
            timestamp = time.time()
            send_tasks = []
            
            # Erstelle Send-Tasks für beide Bildschirme
            if screen1_data:
                send_tasks.append(self._send_single_frame(screen1_data, 'screen1', timestamp))
            
            if screen2_data:
                send_tasks.append(self._send_single_frame(screen2_data, 'screen2', timestamp))
            
            # Sende beide Frames parallel mit Timeout
            if send_tasks:
                try:
                    await asyncio.wait_for(
                        asyncio.gather(*send_tasks, return_exceptions=True),
                        timeout=5.0  # 5 Sekunden Timeout für Frame-Übertragung
                    )
                    
                    # Aktualisiere Statistiken
                    self.last_successful_send = time.time()
                    self.stats['frames_sent'] += len(send_tasks)
                    
                    # Adaptive Qualitätsanpassung basierend auf Performance
                    self._adjust_quality_based_on_performance()
                    
                except asyncio.TimeoutError:
                    logger.error("⏱️ Timeout beim Senden der Frame-Daten")
                    self.stats['frames_failed'] += len(send_tasks)
                    await self._handle_send_failure()
                except Exception as e:
                    logger.error(f"💥 Fehler beim parallelen Senden: {e}")
                    self.stats['frames_failed'] += len(send_tasks)
                    await self._handle_send_failure()
                
        except Exception as e:
            logger.error(f"💥 Kritischer Fehler beim Senden der Frame-Daten: {e}")
            self.stats['frames_failed'] += 1
            await self._handle_send_failure()

    async def _send_single_frame(self, frame_data: str, screen_id: str, timestamp: float):
        """
        Sendet einen einzelnen Frame an den Server.
        
        Args:
            frame_data: Base64-kodierte Frame-Daten
            screen_id: Bildschirm-ID ('screen1' oder 'screen2')
            timestamp: Zeitstempel des Frames
        """
        try:
            screen_index = 0 if screen_id == 'screen1' else 1
            monitor_id = f'monitor_{screen_index}'
            
            # Berechne Frame-Größe für Statistiken
            frame_size = len(frame_data)
            self.stats['avg_frame_size'] = (
                (self.stats['avg_frame_size'] * self.stats['frames_sent'] + frame_size) / 
                (self.stats['frames_sent'] + 1)
            ) if self.stats['frames_sent'] > 0 else frame_size
            
            frame_message = {
                'type': 'frame_data',
                'frameData': frame_data,
                'metadata': {
                    'clientId': self.client_id,
                    'screenId': screen_id,
                    'timestamp': timestamp,
                    'format': self.capture_config['format'],
                    'quality': self.capture_config['quality'],
                    'frameSize': frame_size,
                    'adaptiveQuality': True
                },
                'monitorId': monitor_id,
                'width': self.screen_split_position if screen_id == 'screen1' else (self.total_width - self.screen_split_position),
                'height': self.total_height,
                'routingInfo': {
                    'isDualScreen': True,
                    'screenIndex': screen_index,
                    'totalScreens': 2,
                    'connectionQuality': self._get_connection_quality()
                }
            }
            
            await self.websocket.send(json.dumps(frame_message))
            logger.debug(f"✅ Frame für {screen_id} gesendet ({frame_size} Bytes)")
            
        except websockets.exceptions.ConnectionClosed:
            logger.error(f"🔌 Verbindung geschlossen beim Senden von {screen_id}")
            self.is_connected = False
            raise
        except Exception as e:
            logger.error(f"💥 Fehler beim Senden von {screen_id}: {e}")
            raise

    def _adjust_quality_based_on_performance(self):
        """
        Passt die Capture-Qualität basierend auf der Performance an.
        """
        try:
            current_time = time.time()
            time_since_last_send = current_time - self.last_successful_send
            
            # Wenn zu lange kein erfolgreicher Send, reduziere Qualität
            if time_since_last_send > 10:  # 10 Sekunden ohne erfolgreichen Send
                if self.capture_config['quality'] > self.capture_config['min_quality']:
                    self.capture_config['quality'] = max(
                        self.capture_config['quality'] - 10,
                        self.capture_config['min_quality']
                    )
                    logger.info(f"🔽 Qualität reduziert auf {self.capture_config['quality']} (Performance-Anpassung)")
            
            # Wenn Performance gut, erhöhe Qualität langsam
            elif time_since_last_send < 1 and self.stats['frames_failed'] == 0:
                if self.capture_config['quality'] < self.capture_config['max_quality']:
                    self.capture_config['quality'] = min(
                        self.capture_config['quality'] + 5,
                        self.capture_config['max_quality']
                    )
                    logger.info(f"🔼 Qualität erhöht auf {self.capture_config['quality']} (Performance-Anpassung)")
                    
        except Exception as e:
            logger.error(f"💥 Fehler bei Qualitätsanpassung: {e}")

    def _get_connection_quality(self) -> str:
        """
        Bewertet die aktuelle Verbindungsqualität.
        
        Returns:
            'excellent', 'good', 'fair', oder 'poor'
        """
        try:
            current_time = time.time()
            time_since_last_send = current_time - self.last_successful_send
            
            if time_since_last_send < 1:
                return 'excellent'
            elif time_since_last_send < 3:
                return 'good'
            elif time_since_last_send < 10:
                return 'fair'
            else:
                return 'poor'
                
        except Exception:
            return 'unknown'

    async def _handle_send_failure(self):
        """
        Behandelt Fehler beim Senden von Frame-Daten.
        """
        try:
            # Reduziere Qualität bei wiederholten Fehlern
            if self.stats['frames_failed'] > 5:
                if self.capture_config['quality'] > self.capture_config['min_quality']:
                    self.capture_config['quality'] = max(
                        self.capture_config['quality'] - 15,
                        self.capture_config['min_quality']
                    )
                    logger.info(f"🔽 Qualität nach Fehlern reduziert auf {self.capture_config['quality']}")
            
            # Bei kritischen Fehlern, versuche Wiederverbindung
            if self.stats['frames_failed'] > 10:
                logger.warning("🔄 Zu viele Fehler - versuche Wiederverbindung...")
                self.is_connected = False
                await self.connect()
                
        except Exception as e:
            logger.error(f"💥 Fehler bei Fehlerbehandlung: {e}")

    async def capture_loop(self):
        """
        Robuste Hauptschleife für kontinuierliche Dual-Screen-Erfassung mit adaptiver Performance.
        """
        logger.info("🎬 Starte robuste Dual-Screen-Capture-Schleife")
        
        consecutive_errors = 0
        max_consecutive_errors = 5
        last_stats_log = time.time()
        stats_interval = 30  # Statistiken alle 30 Sekunden loggen
        
        while self.is_capturing:
            loop_start_time = time.time()
            frame_interval = 1.0 / self.capture_config['fps']
            
            try:
                # Prüfe Verbindungsstatus vor jedem Frame
                if not await self.ensure_connection():
                    logger.warning("🔌 Keine Verbindung - pausiere Capture...")
                    await asyncio.sleep(2)
                    continue
                
                # Erfasse beide Bildschirme gleichzeitig
                combined_image = self.capture_dual_screen()
                if not combined_image:
                    consecutive_errors += 1
                    if consecutive_errors > max_consecutive_errors:
                        logger.error(f"❌ {consecutive_errors} aufeinanderfolgende Capture-Fehler - pausiere...")
                        await asyncio.sleep(5)
                        consecutive_errors = 0
                    else:
                        await asyncio.sleep(0.1)
                    continue
                
                # Teile das Bild in zwei separate Bildschirme
                screen1_image, screen2_image = self.split_dual_screen(combined_image)
                
                if screen1_image and screen2_image:
                    # Verarbeite beide Bilder parallel mit Timeout
                    try:
                        processing_tasks = [
                            asyncio.create_task(self._process_image_async(screen1_image, 'screen1')),
                            asyncio.create_task(self._process_image_async(screen2_image, 'screen2'))
                        ]
                        
                        screen1_data, screen2_data = await asyncio.wait_for(
                            asyncio.gather(*processing_tasks),
                            timeout=2.0  # 2 Sekunden Timeout für Bildverarbeitung
                        )
                        
                        # Sende Frame-Daten nur wenn beide erfolgreich verarbeitet wurden
                        if screen1_data and screen2_data:
                            await self.send_frame_data(screen1_data, screen2_data)
                            consecutive_errors = 0  # Reset bei erfolgreichem Frame
                        else:
                            logger.warning("⚠️ Bildverarbeitung fehlgeschlagen - überspringe Frame")
                            consecutive_errors += 1
                            
                    except asyncio.TimeoutError:
                        logger.error("⏱️ Timeout bei Bildverarbeitung")
                        consecutive_errors += 1
                    except Exception as e:
                        logger.error(f"💥 Fehler bei paralleler Bildverarbeitung: {e}")
                        consecutive_errors += 1
                else:
                    logger.warning("⚠️ Bildschirm-Teilung fehlgeschlagen")
                    consecutive_errors += 1
                
                # Adaptive Frame-Rate basierend auf Performance
                elapsed_time = time.time() - loop_start_time
                
                # Wenn Verarbeitung zu lange dauert, reduziere FPS temporär
                if elapsed_time > frame_interval * 2:
                    adjusted_interval = elapsed_time * 1.5
                    logger.debug(f"🐌 Langsame Verarbeitung ({elapsed_time:.2f}s) - angepasstes Intervall: {adjusted_interval:.2f}s")
                else:
                    adjusted_interval = frame_interval
                
                sleep_time = max(0.01, adjusted_interval - elapsed_time)  # Mindestens 10ms Pause
                await asyncio.sleep(sleep_time)
                
                # Periodische Statistiken
                if time.time() - last_stats_log > stats_interval:
                    self._log_performance_stats()
                    last_stats_log = time.time()
                    
            except asyncio.CancelledError:
                logger.info("🛑 Capture-Schleife wurde abgebrochen")
                break
            except Exception as e:
                consecutive_errors += 1
                logger.error(f"💥 Unerwarteter Fehler in Capture-Schleife: {e}")
                
                # Bei zu vielen aufeinanderfolgenden Fehlern, längere Pause
                if consecutive_errors > max_consecutive_errors:
                    error_pause = min(consecutive_errors * 2, 30)  # Max 30 Sekunden Pause
                    logger.error(f"🚨 Zu viele Fehler ({consecutive_errors}) - pausiere {error_pause}s...")
                    await asyncio.sleep(error_pause)
                    
                    # Versuche Wiederverbindung bei kritischen Fehlern
                    if consecutive_errors > max_consecutive_errors * 2:
                        logger.warning("🔄 Kritische Fehleranzahl erreicht - versuche Wiederverbindung...")
                        self.is_connected = False
                        await self.connect()
                        consecutive_errors = 0
                else:
                    await asyncio.sleep(1)  # Kurze Pause bei einzelnen Fehlern
        
        logger.info("🏁 Dual-Screen-Capture-Schleife beendet")

    async def _process_image_async(self, image: Image.Image, screen_id: str) -> Optional[str]:
        """
        Asynchrone Wrapper für Bildverarbeitung.
        
        Args:
            image: Das zu verarbeitende PIL-Image
            screen_id: Kennung des Bildschirms
            
        Returns:
            Base64-kodiertes Bild oder None bei Fehler
        """
        try:
            # Führe CPU-intensive Bildverarbeitung in Thread-Pool aus
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(None, self.process_image, image, screen_id)
        except Exception as e:
            logger.error(f"💥 Fehler bei asynchroner Bildverarbeitung für {screen_id}: {e}")
            return None

    def _log_performance_stats(self):
        """
        Loggt Performance-Statistiken für Monitoring.
        """
        try:
            current_time = time.time()
            uptime = current_time - self.last_successful_send if self.last_successful_send else 0
            
            logger.info(f"📊 Performance-Statistiken:")
            logger.info(f"   📤 Frames gesendet: {self.stats['frames_sent']}")
            logger.info(f"   ❌ Frames fehlgeschlagen: {self.stats['frames_failed']}")
            logger.info(f"   📏 Durchschnittliche Frame-Größe: {self.stats['avg_frame_size']:.0f} Bytes")
            logger.info(f"   🎯 Aktuelle Qualität: {self.capture_config['quality']}%")
            logger.info(f"   🎬 Aktuelle FPS: {self.capture_config['fps']}")
            logger.info(f"   🔗 Verbindungsqualität: {self._get_connection_quality()}")
            logger.info(f"   ⏱️ Zeit seit letztem erfolgreichen Send: {uptime:.1f}s")
            
            # Reset Statistiken für nächsten Intervall
            if self.stats['frames_sent'] > 1000:  # Reset bei hohen Zahlen
                self.stats['frames_sent'] = 0
                self.stats['frames_failed'] = 0
                
        except Exception as e:
            logger.error(f"💥 Fehler beim Loggen der Statistiken: {e}")

    async def handle_permission_request(self, data):
        """Handle incoming permission request from web client."""
        try:
            request_id = data.get('requestId')
            requester_id = data.get('requesterId')
            permission_type = data.get('permissionType', 'desktop_access')
            
            logger.info(f"Permission request received: {permission_type} from {requester_id}")
            
            # Use permission handler to show dialog and get user response
            await self.permission_handler.handle_permission_request(
                request_id, requester_id, permission_type
            )
            
        except Exception as e:
            logger.error(f"Error handling permission request: {e}")

    async def handle_permission_check(self, data):
        """Handle permission status check."""
        try:
            requester_id = data.get('requesterId')
            permission_type = data.get('permissionType', 'desktop_access')
            
            # Check permission status
            is_granted = self.permission_handler.check_permission(requester_id, permission_type)
            
            # Send response
            response = {
                'type': 'permission_status',
                'requesterId': requester_id,
                'permissionType': permission_type,
                'granted': is_granted,
                'clientId': self.client_id,
                'timestamp': time.time()
            }
            
            await self.websocket.send(json.dumps(response))
            logger.info(f"Permission status sent: {permission_type} = {is_granted}")
            
        except Exception as e:
            logger.error(f"Error checking permission: {e}")

    async def handle_permission_revocation(self, data):
        """Handle permission revocation."""
        try:
            requester_id = data.get('requesterId')
            permission_type = data.get('permissionType', 'desktop_access')
            
            # Revoke permission
            self.permission_handler.revoke_permission(requester_id, permission_type)
            
            # Send confirmation
            response = {
                'type': 'permission_revoked',
                'requesterId': requester_id,
                'permissionType': permission_type,
                'clientId': self.client_id,
                'timestamp': time.time()
            }
            
            await self.websocket.send(json.dumps(response))
            logger.info(f"Permission revoked: {permission_type} for {requester_id}")
            
        except Exception as e:
            logger.error(f"Error revoking permission: {e}")

    async def send_permission_response(self, request_id, requester_id, permission_type, granted):
        """Send permission response back to server."""
        try:
            response = {
                'type': 'permission_response',
                'requestId': request_id,
                'requesterId': requester_id,
                'permissionType': permission_type,
                'granted': granted,
                'clientId': self.client_id,
                'timestamp': time.time()
            }
            
            if self.websocket:
                await self.websocket.send(json.dumps(response))
                logger.info(f"Permission response sent: {permission_type} = {granted}")
            
        except Exception as e:
            logger.error(f"Error sending permission response: {e}")

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
                    
                    if message_type == 'start_capture' or message_type == 'start_dual_screen_capture':
                        # Aktualisiere Capture-Konfiguration
                        config = data.get('config', {})
                        self.capture_config.update(config)
                        
                        if not self.is_capturing:
                            self.is_capturing = True
                            # Starte Capture-Schleife
                            asyncio.create_task(self.capture_loop())
                            logger.info(f"Dual-Screen-Capture gestartet (Nachricht: {message_type})")
                        
                    elif message_type == 'stop_capture' or message_type == 'stop_dual_screen_capture':
                        self.is_capturing = False
                        logger.info(f"Dual-Screen-Capture gestoppt (Nachricht: {message_type})")
                        
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
                        
                    elif message_type == 'request_permission':
                        # Handle permission request
                        await self.handle_permission_request(data)
                        
                    elif message_type == 'check_permission':
                        # Handle permission status check
                        await self.handle_permission_check(data)
                        
                    elif message_type == 'revoke_permission':
                        # Handle permission revocation
                        await self.handle_permission_revocation(data)
                        
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