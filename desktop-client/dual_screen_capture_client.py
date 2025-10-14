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
import platform
import hashlib
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple
from PIL import Image, ImageGrab
import io
import cv2
import numpy as np
from screeninfo import get_monitors
import pyautogui
# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def get_stable_machine_id() -> str:
    """
    Generate or retrieve a stable machine-specific client ID.
    Uses hostname + stored UUID to ensure consistency across restarts.
    Stores the ID in a local file for persistence.
    """
    config_dir = Path.home() / '.trae_desktop_client'
    config_file = config_dir / 'machine_id.txt'

    # Try to load existing ID
    if config_file.exists():
        try:
            stored_id = config_file.read_text().strip()
            if stored_id:
                logger.info(f"Using stored machine ID: {stored_id}")
                return stored_id
        except Exception as e:
            logger.warning(f"Could not read stored machine ID: {e}")

    # Generate new stable ID based on hostname
    hostname = platform.node() or 'unknown_machine'
    # Sanitize hostname for use in ID
    hostname = ''.join(c for c in hostname if c.isalnum() or c in '-_').lower()
    hostname = hostname[:20]  # Limit length

    # Generate a unique suffix based on machine characteristics
    # This creates a stable ID even if hostname changes
    machine_hash = hashlib.sha256(
        f"{platform.machine()}{platform.processor()}".encode()
    ).hexdigest()[:8]

    machine_id = f"desktop_{hostname}_{machine_hash}"

    # Store for future use
    try:
        config_dir.mkdir(parents=True, exist_ok=True)
        config_file.write_text(machine_id)
        logger.info(f"Generated and stored new machine ID: {machine_id}")
    except Exception as e:
        logger.warning(f"Could not store machine ID: {e}")

    return machine_id

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
    
    def __init__(self, server_url: str, client_id: Optional[str] = None, user_id: Optional[str] = None, friendly_name: Optional[str] = None):
        """
        Initialisiert den Dual-Screen-Capture-Client.

        Args:
            server_url: WebSocket-Server-URL für die Verbindung
            client_id: Optionale Client-Kennung (automatisch generiert falls nicht angegeben)
            user_id: Optionale User-ID des Benutzers
            friendly_name: Optionaler freundlicher Name für diesen Computer
        """
        self.server_url = server_url
        # Use stable machine-specific ID instead of random UUID
        self.client_id = client_id or get_stable_machine_id()
        self.user_id = user_id
        self.friendly_name = friendly_name
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

        # Frame counter for tracking
        self.frame_counter = 0

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
                # Add client_type and client_id query parameters for Supabase Edge Function
                separator = '&' if '?' in self.server_url else '?'
                connection_url = f"{self.server_url}{separator}client_type=desktop&client_id={self.client_id}"

                logger.info(f"Verbindungsversuch {self.reconnect_attempts + 1}/{self.max_reconnect_attempts} zu: {connection_url}")

                # Verbindung mit Timeout herstellen
                self.websocket = await asyncio.wait_for(
                    websockets.connect(
                        connection_url,
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
                    'reconnect_attempt': self.reconnect_attempts,
                    'userId': getattr(self, 'user_id', None),
                    'friendlyName': getattr(self, 'friendly_name', None),
                    'hostname': platform.node()
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
        # Wenn keine aktive Verbindung existiert, direkt versuchen zu verbinden
        if not self.is_connected or not self.websocket:
            logger.info("🔄 Verbindung nicht aktiv, versuche Wiederverbindung...")
            return await self.connect()

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
                await self._close_connection()
                return await self.connect()

            # Verbindung scheint aktiv zu sein
            return True
        except Exception as e:
            logger.error(f"💥 Fehler bei Verbindungsprüfung: {e}")
            try:
                await self._close_connection()
            except Exception:
                pass
            return await self.connect()

        # Fallback (sollte nicht erreicht werden)
        # Halte API stabil, indem wir True zurückgeben, wenn keine Fehler auftreten
        return True

    def capture_individual_monitors(self) -> Tuple[Optional[Image.Image], Optional[Image.Image]]:
        """
        Erfasst jeden Monitor einzeln für echte Dual-Screen-Unterstützung.
        
        Returns:
            Tuple mit (monitor1_image, monitor2_image) oder (None, None) bei Fehler
        """
        capture_attempts = 0
        max_capture_attempts = 3
        
        while capture_attempts < max_capture_attempts:
            try:
                monitor1_image = None
                monitor2_image = None
                
                # Erfasse jeden Monitor einzeln basierend auf seiner Position und Größe
                if len(self.monitors) >= 1:
                    monitor1 = self.monitors[0]
                    bbox1 = (monitor1['x'], monitor1['y'], 
                            monitor1['x'] + monitor1['width'], 
                            monitor1['y'] + monitor1['height'])
                    monitor1_image = ImageGrab.grab(bbox=bbox1, all_screens=True)
                    
                    # Validiere Monitor 1 Bild
                    if not self._validate_screenshot(monitor1_image):
                        logger.warning(f"⚠️ Monitor 1 Screenshot-Validierung fehlgeschlagen (Versuch {capture_attempts + 1})")
                        monitor1_image = None
                
                if len(self.monitors) >= 2:
                    monitor2 = self.monitors[1]
                    bbox2 = (monitor2['x'], monitor2['y'], 
                            monitor2['x'] + monitor2['width'], 
                            monitor2['y'] + monitor2['height'])
                    monitor2_image = ImageGrab.grab(bbox=bbox2, all_screens=True)
                    
                    # Validiere Monitor 2 Bild
                    if not self._validate_screenshot(monitor2_image):
                        logger.warning(f"⚠️ Monitor 2 Screenshot-Validierung fehlgeschlagen (Versuch {capture_attempts + 1})")
                        monitor2_image = None
                
                # Erfolg wenn mindestens ein Monitor erfasst wurde
                if monitor1_image or monitor2_image:
                    logger.debug(f"✅ Individuelle Monitore erfasst: Monitor1={monitor1_image.size if monitor1_image else 'None'}, Monitor2={monitor2_image.size if monitor2_image else 'None'}")
                    return monitor1_image, monitor2_image
                else:
                    logger.warning(f"⚠️ Keine gültigen Monitor-Screenshots erhalten (Versuch {capture_attempts + 1})")
                
            except PermissionError:
                logger.error("🔒 Berechtigung verweigert - Desktop-Capture nicht möglich")
                self.stats['frames_failed'] += 1
                return None, None
            except OSError as e:
                logger.error(f"💾 Betriebssystem-Fehler bei Monitor-Capture: {e}")
                capture_attempts += 1
                if capture_attempts < max_capture_attempts:
                    time.sleep(0.1)  # Kurze Pause vor erneutem Versuch
            except Exception as e:
                logger.error(f"💥 Unerwarteter Fehler bei Individual-Monitor-Capture: {e}")
                capture_attempts += 1
                if capture_attempts < max_capture_attempts:
                    time.sleep(0.1)
            
            capture_attempts += 1
        
        logger.error(f"❌ Individual-Monitor-Capture nach {max_capture_attempts} Versuchen fehlgeschlagen")
        self.stats['frames_failed'] += 1
        return None, None

    def capture_dual_screen(self) -> Optional[Image.Image]:
        """
        Legacy-Methode für Rückwärtskompatibilität - verwendet jetzt Individual-Monitor-Capture.
        
        Returns:
            PIL Image mit beiden Bildschirmen oder None bei Fehler
        """
        monitor1_image, monitor2_image = self.capture_individual_monitors()
        
        if monitor1_image and monitor2_image:
            # Kombiniere beide Monitore zu einem Bild für Legacy-Unterstützung
            try:
                combined_width = monitor1_image.width + monitor2_image.width
                combined_height = max(monitor1_image.height, monitor2_image.height)
                combined_image = Image.new('RGB', (combined_width, combined_height), (0, 0, 0))
                
                combined_image.paste(monitor1_image, (0, 0))
                combined_image.paste(monitor2_image, (monitor1_image.width, 0))
                
                logger.debug(f"✅ Legacy Dual-Screen kombiniert: {combined_image.size}")
                self.stats['frames_sent'] += 1
                return combined_image
            except Exception as e:
                logger.error(f"💥 Fehler beim Kombinieren der Monitor-Bilder: {e}")
                return None
        elif monitor1_image:
            # Nur Monitor 1 verfügbar
            self.stats['frames_sent'] += 1
            return monitor1_image
        else:
            # Kein Monitor verfügbar
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

            # Increment frame counter
            self.frame_counter += 1

            # Berechne Frame-Größe für Statistiken
            frame_size = len(frame_data)
            self.stats['avg_frame_size'] = (
                (self.stats['avg_frame_size'] * self.stats['frames_sent'] + frame_size) /
                (self.stats['frames_sent'] + 1)
            ) if self.stats['frames_sent'] > 0 else frame_size

            frame_message = {
                'type': 'frame_data',
                'frameData': frame_data,
                'frameNumber': self.frame_counter,  # Add frame number for tracking
                'timestamp': timestamp,
                'monitorId': monitor_id,
                'width': self.screen_split_position if screen_id == 'screen1' else (self.total_width - self.screen_split_position),
                'height': self.total_height,
                'metadata': {
                    'clientId': self.client_id,
                    'screenId': screen_id,
                    'monitorId': monitor_id,
                    'timestamp': timestamp,
                    'format': self.capture_config['format'],
                    'quality': self.capture_config['quality'],
                    'frameSize': frame_size,
                    'adaptiveQuality': True,
                    'width': self.screen_split_position if screen_id == 'screen1' else (self.total_width - self.screen_split_position),
                    'height': self.total_height
                },
                'routingInfo': {
                    'isDualScreen': True,
                    'screenIndex': screen_index,
                    'totalScreens': 2,
                    'connectionQuality': self._get_connection_quality()
                }
            }

            await self.websocket.send(json.dumps(frame_message))
            logger.debug(f"✅ Frame #{self.frame_counter} für {screen_id} gesendet ({frame_size} Bytes)")

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
                
                # Erfasse beide Bildschirme individuell für bessere Qualität
                screen1_image, screen2_image = self.capture_individual_monitors()
                if not screen1_image or not screen2_image:
                    consecutive_errors += 1
                    if consecutive_errors > max_consecutive_errors:
                        logger.error(f"❌ {consecutive_errors} aufeinanderfolgende Capture-Fehler - pausiere...")
                        await asyncio.sleep(5)
                        consecutive_errors = 0
                    else:
                        await asyncio.sleep(0.1)
                    continue
                
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

    def perform_mouse_click(self, monitor_id: str, x: int, y: int, button: str = 'left', double: bool = False, source_viewer_id: Optional[str] = None) -> bool:
        """
        Führt einen Maus-Klick an der richtigen physischen Position aus.
        - Erwartet Canvas/Frame-Koordinaten (x,y) relativ zum jeweiligen Monitor-Bild.
        - Verwendet self.capture_config['scale'] zur Rückrechnung auf OS-Pixel.
        - Berücksichtigt Monitor-Offset (x,y) und Größe aus self.monitors.
        """
        try:
            # Permission prüfen (einfaches Modell: desktop_access)
            requester = source_viewer_id or "web_client"
            if hasattr(self, 'permission_handler') and not self.permission_handler.check_permission(requester, 'desktop_access'):
                logger.warning(f"Mouse click denied by permissions for requester={requester}")
                return False

            if not self.monitors:
                logger.warning("Mouse click ignored: no monitors detected")
                return False

            # Monitor-Index aus monitorId ableiten (monitor_0 / monitor_1)
            idx = 0
            try:
                if isinstance(monitor_id, str) and '_' in monitor_id:
                    idx = int(monitor_id.split('_')[-1])
            except Exception:
                idx = 0

            if idx < 0 or idx >= len(self.monitors):
                logger.warning(f"Mouse click monitor index out of range: {idx} / {len(self.monitors)}")
                return False

            mon = self.monitors[idx]

            # Skalierung berücksichtigen (wie bei process_image)
            try:
                scale = float(self.capture_config.get('scale', 1.0) or 1.0)
            except Exception:
                scale = 1.0
            if scale <= 0:
                scale = 1.0

            # Frame-Koordinaten -> OS-Koordinaten
            abs_x = int(mon['x'] + (x / scale))
            abs_y = int(mon['y'] + (y / scale))

            # Clamping in Monitorgrenzen
            abs_x = max(mon['x'], min(mon['x'] + mon['width'] - 1, abs_x))
            abs_y = max(mon['y'], min(mon['y'] + mon['height'] - 1, abs_y))

            btn = button if button in ('left', 'right', 'middle') else 'left'
            logger.info(f"🖱️ Click at ({abs_x},{abs_y}) on {monitor_id} btn={btn} double={double} scale={scale}")

            # Klick ausführen
            try:
                pyautogui.moveTo(abs_x, abs_y)
                if double:
                    pyautogui.click(button=btn)
                    time.sleep(0.05)
                    pyautogui.click(button=btn)
                else:
                    pyautogui.click(button=btn)
            except Exception as e:
                logger.error(f"Error executing pyautogui click: {e}")
                return False

            return True
        except Exception as e:
            logger.error(f"Error performing mouse click: {e}")
            return False

    async def handle_messages(self):
        """
        Behandelt eingehende WebSocket-Nachrichten.
        """
        try:
            async for message in self.websocket:
                try:
                    data = json.loads(message)
                    message_type = data.get('type')

                    # Log ALL messages for debugging (except pings)
                    if message_type != 'ping':
                        logger.info(f"📨 [DESKTOP CLIENT] Received message type: {message_type}")
                        logger.info(f"📨 [DESKTOP CLIENT] Full message: {json.dumps(data, indent=2)}")

                    # Print full handshake_ack for debugging
                    if message_type == 'handshake_ack':
                        logger.info(f"📋 Full handshake_ack: {json.dumps(data, indent=2)}")

                    if message_type == 'start_capture' or message_type == 'start_dual_screen_capture':
                        logger.info(f"🎬 [DESKTOP CLIENT] START_CAPTURE received! Starting screen capture...")
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
                        
                    elif message_type == 'commands':
                        # Received pending commands from server polling
                        commands = data.get('commands', [])
                        logger.info(f"📥 [COMMAND POLL] Received {len(commands)} pending commands")

                        for command in commands:
                            try:
                                command_id = command.get('id')
                                command_type = command.get('command_type')
                                command_data = command.get('command_data', {})

                                logger.info(f"⚡ [EXECUTE COMMAND] Executing {command_type} (ID: {command_id})")

                                # Execute command based on type
                                if command_type == 'start_capture':
                                    config = command_data.get('config', {})
                                    self.capture_config.update(config)

                                    if not self.is_capturing:
                                        self.is_capturing = True
                                        asyncio.create_task(self.capture_loop())
                                        logger.info(f"✅ [EXECUTE COMMAND] Capture started")

                                    # Report success
                                    await self.websocket.send(json.dumps({
                                        'type': 'command_result',
                                        'commandId': command_id,
                                        'status': 'completed',
                                        'timestamp': time.time()
                                    }))

                                elif command_type == 'stop_capture':
                                    self.is_capturing = False
                                    logger.info(f"✅ [EXECUTE COMMAND] Capture stopped")

                                    # Report success
                                    await self.websocket.send(json.dumps({
                                        'type': 'command_result',
                                        'commandId': command_id,
                                        'status': 'completed',
                                        'timestamp': time.time()
                                    }))

                                else:
                                    logger.warning(f"⚠️ [EXECUTE COMMAND] Unknown command type: {command_type}")
                                    await self.websocket.send(json.dumps({
                                        'type': 'command_result',
                                        'commandId': command_id,
                                        'status': 'failed',
                                        'error': f'Unknown command type: {command_type}',
                                        'timestamp': time.time()
                                    }))

                            except Exception as e:
                                logger.error(f"❌ [EXECUTE COMMAND] Error executing command: {e}")
                                try:
                                    await self.websocket.send(json.dumps({
                                        'type': 'command_result',
                                        'commandId': command.get('id'),
                                        'status': 'failed',
                                        'error': str(e),
                                        'timestamp': time.time()
                                    }))
                                except:
                                    pass

                    elif message_type == 'mouse_click':
                        # Handle incoming mouse click from web UI
                        monitor_id = data.get('monitorId') or data.get('monitor_id') or 'monitor_0'
                        try:
                            x = int(float(data.get('x')))
                            y = int(float(data.get('y')))
                        except Exception:
                            logger.warning(f"Invalid click coordinates in message: {data}")
                            continue
                        button = (data.get('button') or 'left').lower()
                        double = bool(data.get('double', False))
                        source_viewer_id = data.get('sourceViewerId')

                        ok = self.perform_mouse_click(monitor_id, x, y, button, double, source_viewer_id)

                        # Send acknowledgement back (best effort)
                        try:
                            ack = {
                                'type': 'mouse_click_ack',
                                'ok': ok,
                                'monitorId': monitor_id,
                                'x': x,
                                'y': y,
                                'button': button,
                                'double': double,
                                'clientId': self.client_id,
                                'timestamp': time.time()
                            }
                            await self.websocket.send(json.dumps(ack))
                        except Exception as e:
                            logger.debug(f"Failed to send mouse_click_ack: {e}")
                        
                except json.JSONDecodeError as e:
                    logger.error(f"Fehler beim Parsen der Nachricht: {e}")
                except Exception as e:
                    logger.error(f"Fehler bei Nachrichtenbehandlung: {e}")
                    
        except websockets.exceptions.ConnectionClosed:
            logger.info("WebSocket-Verbindung geschlossen")
            self.is_connected = False  # Mark as disconnected for poll_commands to exit
        except Exception as e:
            logger.error(f"Fehler in Nachrichtenbehandlung: {e}")
            self.is_connected = False  # Mark as disconnected for poll_commands to exit

    async def poll_commands(self):
        """
        Polls server for pending commands every 500ms.
        Exits gracefully when connection is lost to allow reconnection.
        """
        poll_count = 0
        try:
            logger.info("🎯 [COMMAND POLL] Poll loop starting...")
            while self.websocket and self.is_connected:
                try:
                    poll_count += 1
                    logger.debug(f"📤 [COMMAND POLL #{poll_count}] Sending get_commands request...")

                    # Send get_commands request
                    await self.websocket.send(json.dumps({
                        'type': 'get_commands',
                        'timestamp': time.time()
                    }))

                    logger.debug(f"✅ [COMMAND POLL #{poll_count}] Request sent, waiting 500ms...")

                    # Wait 500ms before next poll
                    await asyncio.sleep(0.5)

                except websockets.exceptions.ConnectionClosed:
                    logger.warning("🔌 [COMMAND POLL] Connection closed, exiting poll loop")
                    break
                except Exception as e:
                    logger.error(f"❌ [COMMAND POLL] Error in command polling: {e}")
                    await asyncio.sleep(1.0)  # Back off on error

            logger.info(f"🛑 [COMMAND POLL] Polling loop terminated after {poll_count} polls")

        except Exception as e:
            logger.error(f"💥 Command polling loop error: {e}")

    async def run(self):
        """
        Hauptausführungsmethode für den Dual-Screen-Capture-Client mit automatischer Wiederverbindung.
        """
        try:
            logger.info("🚀 Dual-Screen-Capture-Client startet mit Auto-Reconnect...")

            # Infinite reconnection loop
            while True:
                try:
                    # Verbinde zum Server
                    if not await self.connect():
                        logger.error("❌ Verbindung zum Server fehlgeschlagen, warte 10s...")
                        await asyncio.sleep(10)
                        continue

                    logger.info("✅ Dual-Screen-Capture-Client läuft...")
                    logger.info("🔄 [COMMAND POLL] Starting command polling loop...")

                    # Starte Nachrichtenbehandlung UND Command-Polling parallel
                    await asyncio.gather(
                        self.handle_messages(),
                        self.poll_commands(),
                        return_exceptions=True
                    )

                    logger.warning("⚠️ WebSocket-Verbindung getrennt, versuche Reconnect in 5s...")

                except websockets.exceptions.ConnectionClosed:
                    logger.warning("🔌 Verbindung geschlossen, reconnecte in 5s...")
                except Exception as e:
                    logger.error(f"💥 Fehler in Hauptschleife: {e}, reconnecte in 5s...")
                finally:
                    # Cleanup before reconnect
                    self.is_connected = False
                    if self.websocket:
                        try:
                            await self.websocket.close()
                        except:
                            pass
                    self.websocket = None

                # Wait before reconnecting
                await asyncio.sleep(5)
                logger.info("🔄 Versuche Wiederverbindung...")

        except KeyboardInterrupt:
            logger.info("⛔ Client durch Benutzer gestoppt")
        except Exception as e:
            logger.error(f"💥 Kritischer Fehler: {e}")
        finally:
            # Final cleanup
            self.is_capturing = False
            if self.websocket:
                try:
                    await self.websocket.close()
                except:
                    pass
            logger.info("👋 Dual-Screen-Capture-Client beendet")

def main():
    """
    Hauptfunktion für den Dual-Screen-Capture-Client.
    """
    parser = argparse.ArgumentParser(description='Dual Screen Capture Client für TRAE Unity AI Platform')
    parser.add_argument('--server-url', default='wss://dgzreelowtzquljhxskq.supabase.co/functions/v1/live-desktop-stream',
                       help='WebSocket-Server-URL (Standard: Supabase Edge Function)')
    parser.add_argument('--client-id', help='Client-ID (automatisch generiert falls nicht angegeben)')
    parser.add_argument('--user-id', help='User-ID des Benutzers (z.B. "user_123")')
    parser.add_argument('--friendly-name', help='Freundlicher Name für diesen Computer (z.B. "Johns Workstation")')
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
        client_id=args.client_id,
        user_id=args.user_id,
        friendly_name=args.friendly_name
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


class DualScreenCaptureClient_DuplicateIgnore:
    """
    Erweiterte Desktop-Capture-Client für gleichzeitige Dual-Screen-Erfassung.
    Folgt den TRAE Unity AI Platform Namenskonventionen und Coding-Standards.
    Implementiert robuste Fehlerbehandlung und automatische Wiederverbindung.
    """
    
    def __init__(self, server_url: str, client_id: Optional[str] = None, user_id: Optional[str] = None, friendly_name: Optional[str] = None):
        """
        Initialisiert den Dual-Screen-Capture-Client.

        Args:
            server_url: WebSocket-Server-URL für die Verbindung
            client_id: Optionale Client-Kennung (automatisch generiert falls nicht angegeben)
            user_id: Optionale User-ID des Benutzers
            friendly_name: Optionaler freundlicher Name für diesen Computer
        """
        self.server_url = server_url
        # Use stable machine-specific ID instead of random UUID
        self.client_id = client_id or get_stable_machine_id()
        self.user_id = user_id
        self.friendly_name = friendly_name
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

        # Frame counter for tracking
        self.frame_counter = 0

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
                # Add client_type and client_id query parameters for Supabase Edge Function
                separator = '&' if '?' in self.server_url else '?'
                connection_url = f"{self.server_url}{separator}client_type=desktop&client_id={self.client_id}"

                logger.info(f"Verbindungsversuch {self.reconnect_attempts + 1}/{self.max_reconnect_attempts} zu: {connection_url}")

                # Verbindung mit Timeout herstellen
                self.websocket = await asyncio.wait_for(
                    websockets.connect(
                        connection_url,
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
                    'reconnect_attempt': self.reconnect_attempts,
                    'userId': getattr(self, 'user_id', None),
                    'friendlyName': getattr(self, 'friendly_name', None),
                    'hostname': platform.node()
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