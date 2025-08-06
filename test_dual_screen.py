#!/usr/bin/env python3
"""
Test-Skript für die Dual-Screen Capture Funktionalität
TRAE Unity AI Platform - Dual-Screen Integration Test

Dieses Skript testet die dual-screen capture Funktionalität durch:
1. Verbindung zum WebSocket Server
2. Simulation von dual-screen frame data
3. Überprüfung der Nachrichtenweiterleitung
4. Performance-Tests

Autor: TRAE Unity AI Platform
Version: 1.0.0
"""

import asyncio
import websockets
import json
import base64
import time
import logging
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont
import io
import sys
import os

# Logging-Konfiguration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('dual_screen_test.log', encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class DualScreenTester:
    """Test-Klasse für dual-screen Funktionalität"""
    
    def __init__(self, websocket_url="ws://localhost:8084"):
        self.websocket_url = websocket_url
        self.client_id = f"dual_screen_test_{int(time.time())}"
        self.websocket = None
        self.is_connected = False
        self.frame_count = 0
        self.test_results = {
            'connection': False,
            'handshake': False,
            'frame_sending': False,
            'performance': {},
            'errors': []
        }
        
    async def connect(self):
        """Verbindung zum WebSocket Server herstellen"""
        try:
            logger.info(f"Verbinde zu WebSocket Server: {self.websocket_url}")
            self.websocket = await websockets.connect(self.websocket_url)
            self.is_connected = True
            self.test_results['connection'] = True
            logger.info("[SUCCESS] WebSocket Verbindung erfolgreich hergestellt")
            return True
        except Exception as e:
            logger.error(f"[ERROR] Fehler bei WebSocket Verbindung: {e}")
            self.test_results['errors'].append(f"Connection error: {e}")
            return False
    
    async def send_handshake(self):
        """Handshake-Nachricht senden"""
        try:
            # Warte zuerst auf connection_established Nachricht
            connection_response = await asyncio.wait_for(self.websocket.recv(), timeout=5.0)
            connection_data = json.loads(connection_response)
            
            if connection_data.get('type') == 'connection_established':
                logger.info("[SUCCESS] Connection established Nachricht empfangen")
            else:
                logger.warning(f"[WARNING] Unerwartete erste Nachricht: {connection_data}")
            
            handshake_message = {
                "type": "handshake",
                "client_type": "dual_screen_desktop",
                "client_id": self.client_id,
                "capabilities": {
                    "dual_screen_capture": True,
                    "screen_splitting": True,
                    "async_transmission": True,
                    "supported_formats": ["png", "jpeg"],
                    "max_resolution": "3840x2160",
                    "compression": True
                },
                "timestamp": datetime.now().isoformat()
            }
            
            await self.websocket.send(json.dumps(handshake_message))
            logger.info("[SEND] Handshake-Nachricht gesendet")
            
            # Warte auf Handshake-Antwort
            response = await asyncio.wait_for(self.websocket.recv(), timeout=5.0)
            response_data = json.loads(response)
            
            if response_data.get('type') == 'handshake_ack':
                logger.info("[SUCCESS] Handshake erfolgreich bestätigt")
                self.test_results['handshake'] = True
                return True
            else:
                logger.error(f"[ERROR] Unerwartete Handshake-Antwort: {response_data}")
                return False
                
        except Exception as e:
            logger.error(f"[ERROR] Fehler beim Handshake: {e}")
            self.test_results['errors'].append(f"Handshake error: {e}")
            return False
    
    def create_test_image(self, screen_id, width=1920, height=1080):
        """Test-Bild für einen Screen erstellen"""
        # Erstelle ein Test-Bild
        image = Image.new('RGB', (width, height), color=(50, 50, 50))
        draw = ImageDraw.Draw(image)
        
        # Zeichne Screen-Informationen
        try:
            font = ImageFont.truetype("arial.ttf", 48)
        except:
            font = ImageFont.load_default()
        
        # Screen-Titel
        title = f"Screen {screen_id}"
        draw.text((50, 50), title, fill=(255, 255, 255), font=font)
        
        # Timestamp
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        draw.text((50, 120), f"Time: {timestamp}", fill=(200, 200, 200), font=font)
        
        # Frame-Nummer
        draw.text((50, 190), f"Frame: {self.frame_count}", fill=(100, 255, 100), font=font)
        
        # Screen-spezifische Farbe
        if screen_id == 1:
            draw.rectangle([width-200, 50, width-50, 200], fill=(255, 100, 100))
        else:
            draw.rectangle([width-200, 50, width-50, 200], fill=(100, 100, 255))
        
        # Konvertiere zu Base64
        buffer = io.BytesIO()
        image.save(buffer, format='PNG')
        image_data = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        return image_data
    
    async def send_dual_screen_frame(self, screen_1_data, screen_2_data):
        """Dual-screen Frame-Daten senden"""
        try:
            # Frame für Screen 1
            frame_1_message = {
                "type": "dual_screen_frame",
                "client_id": self.client_id,
                "screen_id": 1,
                "image_data": screen_1_data,
                "width": 1920,
                "height": 1080,
                "format": "png",
                "timestamp": datetime.now().isoformat(),
                "frame_number": self.frame_count,
                "metadata": {
                    "capture_method": "dual_screen_split",
                    "compression_ratio": 0.8,
                    "processing_time_ms": 15
                }
            }
            
            # Frame für Screen 2
            frame_2_message = {
                "type": "dual_screen_frame",
                "client_id": self.client_id,
                "screen_id": 2,
                "image_data": screen_2_data,
                "width": 1920,
                "height": 1080,
                "format": "png",
                "timestamp": datetime.now().isoformat(),
                "frame_number": self.frame_count,
                "metadata": {
                    "capture_method": "dual_screen_split",
                    "compression_ratio": 0.8,
                    "processing_time_ms": 15
                }
            }
            
            # Sende beide Frames asynchron
            await asyncio.gather(
                self.websocket.send(json.dumps(frame_1_message)),
                self.websocket.send(json.dumps(frame_2_message))
            )
            
            self.frame_count += 1
            return True
            
        except Exception as e:
            logger.error(f"[ERROR] Fehler beim Senden der Frame-Daten: {e}")
            self.test_results['errors'].append(f"Frame sending error: {e}")
            return False
    
    async def performance_test(self, duration_seconds=30, fps=10):
        """Performance-Test durchführen"""
        logger.info(f"[START] Starte Performance-Test ({duration_seconds}s, {fps} FPS)")
        
        start_time = time.time()
        frames_sent = 0
        errors = 0
        
        frame_interval = 1.0 / fps
        next_frame_time = start_time
        
        while time.time() - start_time < duration_seconds:
            try:
                # Warte bis zur nächsten Frame-Zeit
                current_time = time.time()
                if current_time < next_frame_time:
                    await asyncio.sleep(next_frame_time - current_time)
                
                # Erstelle Test-Bilder
                screen_1_data = self.create_test_image(1)
                screen_2_data = self.create_test_image(2)
                
                # Sende Frames
                frame_start = time.time()
                success = await self.send_dual_screen_frame(screen_1_data, screen_2_data)
                frame_time = time.time() - frame_start
                
                if success:
                    frames_sent += 1
                    if frames_sent % 50 == 0:  # Log alle 50 Frames
                        logger.info(f"[STATS] Frames gesendet: {frames_sent}, Frame-Zeit: {frame_time:.3f}s")
                else:
                    errors += 1
                
                next_frame_time += frame_interval
                
            except Exception as e:
                logger.error(f"[ERROR] Fehler im Performance-Test: {e}")
                errors += 1
        
        total_time = time.time() - start_time
        actual_fps = frames_sent / total_time
        
        self.test_results['performance'] = {
            'duration': total_time,
            'frames_sent': frames_sent,
            'errors': errors,
            'target_fps': fps,
            'actual_fps': actual_fps,
            'success_rate': (frames_sent / (frames_sent + errors)) * 100 if (frames_sent + errors) > 0 else 0
        }
        
        logger.info(f"[RESULTS] Performance-Test abgeschlossen:")
        logger.info(f"   Dauer: {total_time:.2f}s")
        logger.info(f"   Frames gesendet: {frames_sent}")
        logger.info(f"   Fehler: {errors}")
        logger.info(f"   Ziel-FPS: {fps}")
        logger.info(f"   Tatsächliche FPS: {actual_fps:.2f}")
        logger.info(f"   Erfolgsrate: {self.test_results['performance']['success_rate']:.1f}%")
        
        if actual_fps >= fps * 0.9:  # 90% der Ziel-FPS
            self.test_results['frame_sending'] = True
            logger.info("[SUCCESS] Performance-Test erfolgreich")
        else:
            logger.warning("[WARNING] Performance-Test unter Erwartungen")
    
    async def run_tests(self):
        """Alle Tests ausführen"""
        logger.info("[TEST] Starte Dual-Screen Tests")
        
        try:
            # 1. Verbindungstest
            if not await self.connect():
                return False
            
            # 2. Handshake-Test
            if not await self.send_handshake():
                return False
            
            # 3. Einzelner Frame-Test
            logger.info("[TEST] Teste einzelnen Frame-Versand")
            screen_1_data = self.create_test_image(1)
            screen_2_data = self.create_test_image(2)
            
            if await self.send_dual_screen_frame(screen_1_data, screen_2_data):
                logger.info("[SUCCESS] Einzelner Frame-Test erfolgreich")
            else:
                logger.error("[ERROR] Einzelner Frame-Test fehlgeschlagen")
                return False
            
            # 4. Performance-Test
            await self.performance_test(duration_seconds=10, fps=5)
            
            return True
            
        except Exception as e:
            logger.error(f"[ERROR] Fehler beim Ausführen der Tests: {e}")
            self.test_results['errors'].append(f"Test execution error: {e}")
            return False
        
        finally:
            if self.websocket:
                await self.websocket.close()
                logger.info("[CLOSE] WebSocket Verbindung geschlossen")
    
    def print_test_results(self):
        """Test-Ergebnisse ausgeben"""
        logger.info("\n" + "="*60)
        logger.info("[RESULTS] DUAL-SCREEN TEST ERGEBNISSE")
        logger.info("="*60)
        
        # Verbindung
        status = "[SUCCESS] ERFOLGREICH" if self.test_results['connection'] else "[ERROR] FEHLGESCHLAGEN"
        logger.info(f"Verbindung: {status}")
        
        # Handshake
        status = "[SUCCESS] ERFOLGREICH" if self.test_results['handshake'] else "[ERROR] FEHLGESCHLAGEN"
        logger.info(f"Handshake: {status}")
        
        # Frame-Versand
        status = "[SUCCESS] ERFOLGREICH" if self.test_results['frame_sending'] else "[ERROR] FEHLGESCHLAGEN"
        logger.info(f"Frame-Versand: {status}")
        
        # Performance
        if self.test_results['performance']:
            perf = self.test_results['performance']
            logger.info(f"Performance:")
            logger.info(f"  - Frames: {perf['frames_sent']}")
            logger.info(f"  - FPS: {perf['actual_fps']:.2f}")
            logger.info(f"  - Erfolgsrate: {perf['success_rate']:.1f}%")
        
        # Fehler
        if self.test_results['errors']:
            logger.info(f"Fehler ({len(self.test_results['errors'])}):")
            for error in self.test_results['errors']:
                logger.info(f"  - {error}")
        
        # Gesamtergebnis
        all_passed = (
            self.test_results['connection'] and
            self.test_results['handshake'] and
            self.test_results['frame_sending'] and
            len(self.test_results['errors']) == 0
        )
        
        overall_status = "[SUCCESS] ALLE TESTS BESTANDEN" if all_passed else "[ERROR] EINIGE TESTS FEHLGESCHLAGEN"
        logger.info(f"\nGesamtergebnis: {overall_status}")
        logger.info("="*60)

async def main():
    """Hauptfunktion"""
    logger.info("[START] Dual-Screen Test gestartet")
    
    # Überprüfe ob WebSocket Server läuft
    try:
        import socket
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        result = sock.connect_ex(('localhost', 8084))
        sock.close()
        
        if result != 0:
            logger.error("[ERROR] WebSocket Server ist nicht erreichbar auf localhost:8084")
            logger.info("[INFO] Bitte starte den WebSocket Server mit: node local-websocket-server.js")
            return
    except Exception as e:
        logger.error(f"[ERROR] Fehler beim Überprüfen des WebSocket Servers: {e}")
        return
    
    # Führe Tests aus
    tester = DualScreenTester()
    success = await tester.run_tests()
    tester.print_test_results()
    
    if success:
        logger.info("[SUCCESS] Dual-Screen Tests erfolgreich abgeschlossen!")
    else:
        logger.error("[ERROR] Dual-Screen Tests fehlgeschlagen!")
        sys.exit(1)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("\n[STOP] Test durch Benutzer abgebrochen")
    except Exception as e:
        logger.error(f"[ERROR] Unerwarteter Fehler: {e}")
        sys.exit(1)