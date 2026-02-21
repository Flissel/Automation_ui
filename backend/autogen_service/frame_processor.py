"""
Frame Processor für die Integration von Desktop-Streams mit AutoGen Agents.

Dieses Modul verbindet sich mit dem WebSocket-Stream und leitet
ausgewählte Frames an das Multi-Agent-Team zur Analyse weiter.
"""

import asyncio
import json
import logging
import time
from collections import deque
from dataclasses import dataclass, field
from typing import Any, Callable, Optional

try:
    import websockets
    from websockets.exceptions import ConnectionClosed

    WEBSOCKETS_AVAILABLE = True
except ImportError:
    WEBSOCKETS_AVAILABLE = False
    websockets = None
    ConnectionClosed = Exception

from .agent_service import create_analysis_service, DesktopAnalysisService
from .config import AutoGenConfig, get_config


logger = logging.getLogger(__name__)


@dataclass
class FrameData:
    """Datenstruktur für einen empfangenen Frame."""
    
    data: str  # Base64-kodierte Bilddaten
    monitor_id: str
    timestamp: float
    width: int = 0
    height: int = 0
    frame_number: int = 0


@dataclass
class ProcessorStats:
    """Statistiken für den Frame Processor."""
    
    frames_received: int = 0
    frames_analyzed: int = 0
    frames_dropped: int = 0
    connection_attempts: int = 0
    successful_connections: int = 0
    analysis_errors: int = 0
    last_frame_time: float = 0.0
    last_analysis_time: float = 0.0


class FrameProcessor:
    """
    Verarbeitet eingehende Frames und leitet sie an das Agent-Team weiter.
    Implementiert Rate-Limiting und Frame-Sampling.
    """
    
    def __init__(
        self,
        config: Optional[AutoGenConfig] = None,
        on_analysis_complete: Optional[Callable[[dict[str, Any]], None]] = None,
        use_mock_service: bool = False
    ):
        """
        Initialisiert den Frame Processor.
        
        Args:
            config: Konfiguration für den Processor
            on_analysis_complete: Callback für abgeschlossene Analysen
            use_mock_service: Wenn True, wird der Mock-Service verwendet
        """
        if not WEBSOCKETS_AVAILABLE:
            raise ImportError(
                "websockets ist nicht installiert. "
                "Installiere mit: pip install websockets"
            )
        
        self.config = config or get_config()
        self.on_analysis_complete = on_analysis_complete
        
        # Analysis Service erstellen
        self.analysis_service = create_analysis_service(
            config=self.config,
            use_mock=use_mock_service
        )
        
        # Frame-Queues für jeden Monitor
        self.frame_queues: dict[str, deque[FrameData]] = {
            "monitor_0": deque(maxlen=self.config.max_queue_size),
            "monitor_1": deque(maxlen=self.config.max_queue_size)
        }
        
        # Analyse-Timing
        self.last_analysis_time: dict[str, float] = {}
        
        # Statistiken
        self.stats = ProcessorStats()
        
        # State
        self.is_running = False
        self.websocket: Optional[Any] = None
        self._analysis_tasks: set[asyncio.Task[Any]] = set()
        
        logger.info("FrameProcessor initialisiert")
    
    async def connect_and_process(self) -> None:
        """
        Verbindet zum WebSocket und verarbeitet Frames.
        Implementiert automatische Wiederverbindung.
        """
        self.is_running = True
        reconnect_delay = 5.0
        max_reconnect_delay = 60.0
        
        while self.is_running:
            try:
                self.stats.connection_attempts += 1
                logger.info(
                    f"Verbindungsversuch #{self.stats.connection_attempts} zu "
                    f"{self.config.websocket_url}"
                )
                
                # WebSocket-Verbindung herstellen
                async with websockets.connect(
                    f"{self.config.websocket_url}?client_type=autogen_agent",
                    ping_interval=10,
                    ping_timeout=10
                ) as websocket:
                    self.websocket = websocket
                    self.stats.successful_connections += 1
                    reconnect_delay = 5.0  # Reset bei erfolgreicher Verbindung
                    
                    # Handshake senden
                    await self._perform_handshake()
                    
                    logger.info("✅ WebSocket-Verbindung hergestellt")
                    
                    # Message Loop
                    await self._message_loop()
                    
            except ConnectionClosed as e:
                logger.warning(f"🔌 WebSocket-Verbindung geschlossen: {e}")
            except Exception as e:
                logger.error(f"💥 WebSocket-Fehler: {e}")
            finally:
                self.websocket = None
            
            # Wiederverbindung
            if self.is_running:
                logger.info(f"⏳ Warte {reconnect_delay}s vor Wiederverbindung...")
                await asyncio.sleep(reconnect_delay)
                reconnect_delay = min(reconnect_delay * 1.5, max_reconnect_delay)
    
    async def _perform_handshake(self) -> None:
        """Führt den Handshake mit dem Server durch."""
        handshake = {
            "type": "handshake",
            "clientInfo": {
                "clientType": "autogen_agent",
                "clientId": f"autogen_processor_{int(time.time())}",
                "capabilities": {
                    "vision_analysis": True,
                    "ocr": True,
                    "dual_screen": True,
                    "real_time": False
                }
            },
            "timestamp": time.time()
        }
        
        if self.websocket:
            await self.websocket.send(json.dumps(handshake))
            logger.info("📤 Handshake gesendet")
    
    async def _message_loop(self) -> None:
        """Hauptschleife für die Nachrichtenverarbeitung."""
        if not self.websocket:
            return
        
        async for message in self.websocket:
            if not self.is_running:
                break
            
            try:
                await self._handle_message(message)
            except Exception as e:
                logger.error(f"💥 Fehler bei Nachrichtenverarbeitung: {e}")
    
    async def _handle_message(self, message: str) -> None:
        """
        Verarbeitet eingehende WebSocket-Nachrichten.
        
        Args:
            message: JSON-kodierte Nachricht vom Server
        """
        try:
            data = json.loads(message)
            msg_type = data.get("type")
            
            if msg_type == "frame_data":
                await self._handle_frame_data(data)
            elif msg_type == "handshake_ack":
                logger.info("✅ Handshake bestätigt")
            elif msg_type == "ping":
                await self._send_pong()
            else:
                logger.debug(f"Unbekannter Nachrichtentyp: {msg_type}")
                
        except json.JSONDecodeError as e:
            logger.error(f"📄 JSON-Dekodierungsfehler: {e}")
    
    async def _handle_frame_data(self, data: dict[str, Any]) -> None:
        """
        Verarbeitet empfangene Frame-Daten.
        
        Args:
            data: Frame-Daten vom WebSocket
        """
        monitor_id = data.get("monitorId", "monitor_0")
        frame_data = data.get("frameData")
        
        if not frame_data:
            return
        
        # Frame-Objekt erstellen
        frame = FrameData(
            data=frame_data,
            monitor_id=monitor_id,
            timestamp=data.get("timestamp", time.time()),
            width=data.get("width", 0),
            height=data.get("height", 0),
            frame_number=data.get("frameNumber", 0)
        )
        
        # Statistiken aktualisieren
        self.stats.frames_received += 1
        self.stats.last_frame_time = frame.timestamp
        
        # Frame zur Queue hinzufügen
        if monitor_id in self.frame_queues:
            self.frame_queues[monitor_id].append(frame)
        
        # Prüfe ob Analyse fällig ist
        await self._maybe_analyze(monitor_id)
    
    async def _maybe_analyze(self, monitor_id: str) -> None:
        """
        Führt Analyse durch falls genug Zeit vergangen ist.
        
        Args:
            monitor_id: ID des Monitors
        """
        current_time = time.time()
        last_time = self.last_analysis_time.get(monitor_id, 0)
        
        # Rate-Limiting prüfen
        if current_time - last_time < self.config.analysis_interval:
            return
        
        # Max concurrent analyses prüfen
        active_tasks = len([t for t in self._analysis_tasks if not t.done()])
        if active_tasks >= self.config.max_concurrent_analyses:
            self.stats.frames_dropped += 1
            return
        
        # Neuesten Frame aus Queue nehmen
        if not self.frame_queues.get(monitor_id):
            return
        
        frame = self.frame_queues[monitor_id][-1]
        self.last_analysis_time[monitor_id] = current_time
        
        # Analyse im Hintergrund starten
        task = asyncio.create_task(
            self._analyze_and_report(frame)
        )
        self._analysis_tasks.add(task)
        task.add_done_callback(self._analysis_tasks.discard)
    
    async def _analyze_and_report(self, frame: FrameData) -> None:
        """
        Führt Analyse durch und sendet Report.
        
        Args:
            frame: Frame-Daten für die Analyse
        """
        try:
            logger.info(
                f"🔍 Starte Analyse für {frame.monitor_id} "
                f"(Frame #{frame.frame_number})"
            )
            
            # Analyse durchführen
            result = await self.analysis_service.analyze_frame(
                frame.data,
                frame.monitor_id,
                context={
                    "frame_number": frame.frame_number,
                    "width": frame.width,
                    "height": frame.height,
                    "timestamp": frame.timestamp
                }
            )
            
            # Statistiken aktualisieren
            self.stats.frames_analyzed += 1
            self.stats.last_analysis_time = time.time()
            
            logger.info(
                f"✅ Analyse abgeschlossen für {frame.monitor_id} "
                f"(Status: {result.get('status')})"
            )
            
            # Callback aufrufen
            if self.on_analysis_complete:
                self.on_analysis_complete(result)
            
            # Ergebnis an Server senden (optional)
            await self._send_analysis_result(result)
            
        except Exception as e:
            self.stats.analysis_errors += 1
            logger.error(f"💥 Analyse-Fehler: {e}")
    
    async def _send_analysis_result(self, result: dict[str, Any]) -> None:
        """
        Sendet Analyseergebnis an den Server.
        
        Args:
            result: Analyseergebnis
        """
        if not self.websocket:
            return
        
        try:
            message = {
                "type": "analysis_result",
                "result": result,
                "timestamp": time.time()
            }
            await self.websocket.send(json.dumps(message))
            logger.debug("📤 Analyseergebnis gesendet")
        except Exception as e:
            logger.error(f"💥 Fehler beim Senden des Ergebnisses: {e}")
    
    async def _send_pong(self) -> None:
        """Sendet Pong-Antwort auf Ping."""
        if self.websocket:
            await self.websocket.send(json.dumps({
                "type": "pong",
                "timestamp": time.time()
            }))
    
    def get_stats(self) -> dict[str, Any]:
        """Gibt die aktuellen Statistiken zurück."""
        return {
            "processor": {
                "frames_received": self.stats.frames_received,
                "frames_analyzed": self.stats.frames_analyzed,
                "frames_dropped": self.stats.frames_dropped,
                "connection_attempts": self.stats.connection_attempts,
                "successful_connections": self.stats.successful_connections,
                "analysis_errors": self.stats.analysis_errors,
                "last_frame_time": self.stats.last_frame_time,
                "last_analysis_time": self.stats.last_analysis_time
            },
            "analysis_service": self.analysis_service.get_stats(),
            "is_running": self.is_running,
            "is_connected": self.websocket is not None
        }
    
    async def stop(self) -> None:
        """Stoppt die Verarbeitung."""
        logger.info("🛑 Stoppe FrameProcessor...")
        self.is_running = False
        
        # Warte auf laufende Analyse-Tasks
        if self._analysis_tasks:
            await asyncio.gather(*self._analysis_tasks, return_exceptions=True)
        
        # WebSocket schließen
        if self.websocket:
            await self.websocket.close()
        
        # Analysis Service schließen
        await self.analysis_service.close()
        
        logger.info("👋 FrameProcessor gestoppt")


async def main() -> None:
    """Hauptfunktion für den Frame Processor."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="AutoGen Frame Processor für Desktop-Analyse"
    )
    parser.add_argument(
        "--websocket-url",
        default=None,
        help="WebSocket-URL des Desktop-Streams"
    )
    parser.add_argument(
        "--interval",
        type=float,
        default=5.0,
        help="Analyse-Intervall in Sekunden"
    )
    parser.add_argument(
        "--mock",
        action="store_true",
        help="Mock-Service für Tests verwenden"
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Debug-Logging aktivieren"
    )
    
    args = parser.parse_args()
    
    # Logging konfigurieren
    log_level = logging.DEBUG if args.debug else logging.INFO
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    
    # Konfiguration erstellen
    config = get_config()
    if args.websocket_url:
        config.websocket_url = args.websocket_url
    config.analysis_interval = args.interval
    
    # Callback für Analyseergebnisse
    def on_analysis(result: dict[str, Any]) -> None:
        print(f"\n{'='*60}")
        print(f"📊 Analyse-Ergebnis für {result.get('monitor_id')}:")
        print(json.dumps(result, indent=2, default=str))
        print(f"{'='*60}\n")
    
    # Processor erstellen und starten
    processor = FrameProcessor(
        config=config,
        on_analysis_complete=on_analysis,
        use_mock_service=args.mock
    )
    
    try:
        await processor.connect_and_process()
    except KeyboardInterrupt:
        logger.info("⛔ Unterbrochen durch Benutzer")
    finally:
        await processor.stop()


if __name__ == "__main__":
    asyncio.run(main())