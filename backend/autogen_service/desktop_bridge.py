"""
Desktop-Client Bridge für AutoGen Automation.

Diese Brücke verbindet das AutoGen Agent-Team mit dem Desktop-Client
über lokale HTTP-Aufrufe zum TRAE Backend oder Supabase WebSocket Edge Function.
"""

import asyncio
import json
import logging
import os
import time
import uuid
from typing import Any, Callable, Optional

try:
    import aiohttp
    AIOHTTP_AVAILABLE = True
except ImportError:
    AIOHTTP_AVAILABLE = False

try:
    import websockets
    WEBSOCKETS_AVAILABLE = True
except ImportError:
    WEBSOCKETS_AVAILABLE = False

try:
    from supabase import create_client, Client
    SUPABASE_PY_AVAILABLE = True
except ImportError:
    SUPABASE_PY_AVAILABLE = False
    Client = None

logger = logging.getLogger(__name__)


class LocalDesktopBridge:
    """
    Lokale Bridge für direkten HTTP-Zugriff auf das TRAE Backend.
    
    Sendet Automation-Commands direkt an http://localhost:8007/api/automation
    """
    
    def __init__(
        self,
        backend_url: str = "http://localhost:8007",
        timeout: float = 10.0
    ):
        """
        Initialisiert die lokale Desktop-Bridge.
        
        Args:
            backend_url: URL des lokalen TRAE Backends
            timeout: Timeout für HTTP-Aufrufe in Sekunden
        """
        self.backend_url = backend_url.rstrip("/")
        self.timeout = timeout
        self.session: Optional[aiohttp.ClientSession] = None
        
        # Command-Historie
        self.command_history: list[dict] = []
        
        logger.info(f"LocalDesktopBridge initialisiert (backend={self.backend_url})")
    
    async def _ensure_session(self) -> aiohttp.ClientSession:
        """Stellt sicher, dass eine aiohttp-Session existiert."""
        if self.session is None or self.session.closed:
            timeout = aiohttp.ClientTimeout(total=self.timeout)
            self.session = aiohttp.ClientSession(timeout=timeout)
        return self.session
    
    async def send_command(self, command: dict[str, Any]) -> dict[str, Any]:
        """
        Sendet einen Automation-Command an das lokale Backend.
        
        Args:
            command: Command-Dict mit type und Parametern
            
        Returns:
            Ergebnis der Ausführung
        """
        if not AIOHTTP_AVAILABLE:
            return {"success": False, "error": "aiohttp nicht installiert"}
        
        command_type = command.get("type", "unknown")
        
        try:
            session = await self._ensure_session()
            
            # Route basierend auf Command-Typ
            if command_type == "mouse_click":
                return await self._send_click(session, command)
            elif command_type == "type_text":
                return await self._send_type_text(session, command)
            elif command_type == "key_press":
                return await self._send_key_press(session, command)
            elif command_type == "hotkey":
                return await self._send_hotkey(session, command)
            elif command_type == "scroll":
                return await self._send_scroll(session, command)
            elif command_type == "mouse_move":
                return await self._send_mouse_move(session, command)
            elif command_type == "mouse_drag":
                return await self._send_mouse_drag(session, command)
            else:
                logger.warning(f"Unbekannter Command-Typ: {command_type}")
                return {"success": False, "error": f"Unbekannter Command-Typ: {command_type}"}
                
        except asyncio.TimeoutError:
            return {"success": False, "error": "Timeout bei der Backend-Kommunikation"}
        except aiohttp.ClientError as e:
            return {"success": False, "error": f"HTTP-Fehler: {str(e)}"}
        except Exception as e:
            logger.error(f"Command-Fehler: {e}")
            return {"success": False, "error": str(e)}
    
    async def _send_click(self, session: aiohttp.ClientSession, command: dict) -> dict:
        """Sendet einen Click-Command."""
        url = f"{self.backend_url}/api/automation/click"
        
        payload = {
            "x": command.get("x", 0),
            "y": command.get("y", 0),
            "button": command.get("button", "left"),
            "click_type": "double" if command.get("double", False) else "single",
            "delay": command.get("delay", 0.1)
        }
        
        logger.info(f"[LocalBridge] Click: ({payload['x']}, {payload['y']}) button={payload['button']}")
        
        async with session.post(url, json=payload) as response:
            result = await response.json()
            
            self.command_history.append({
                "type": "mouse_click",
                "command": command,
                "result": result,
                "timestamp": time.time()
            })
            
            return result
    
    async def _send_type_text(self, session: aiohttp.ClientSession, command: dict) -> dict:
        """Sendet einen Type-Text-Command."""
        url = f"{self.backend_url}/api/automation/type"
        
        payload = {
            "text": command.get("text", ""),
            "interval": command.get("interval", 0.02)
        }
        
        logger.info(f"[LocalBridge] Type: '{payload['text'][:30]}...'")
        
        async with session.post(url, json=payload) as response:
            result = await response.json()
            
            self.command_history.append({
                "type": "type_text",
                "command": command,
                "result": result,
                "timestamp": time.time()
            })
            
            return result
    
    async def _send_key_press(self, session: aiohttp.ClientSession, command: dict) -> dict:
        """Sendet einen Key-Press-Command."""
        url = f"{self.backend_url}/api/automation/key"
        
        payload = {
            "key": command.get("key", ""),
            "modifiers": command.get("modifiers", [])
        }
        
        logger.info(f"[LocalBridge] Key: {payload['key']}")
        
        async with session.post(url, json=payload) as response:
            result = await response.json()
            
            self.command_history.append({
                "type": "key_press",
                "command": command,
                "result": result,
                "timestamp": time.time()
            })
            
            return result
    
    async def _send_hotkey(self, session: aiohttp.ClientSession, command: dict) -> dict:
        """Sendet einen Hotkey-Command."""
        url = f"{self.backend_url}/api/automation/hotkey"
        
        payload = {
            "keys": command.get("keys", [])
        }
        
        logger.info(f"[LocalBridge] Hotkey: {payload['keys']}")
        
        async with session.post(url, json=payload) as response:
            result = await response.json()
            
            self.command_history.append({
                "type": "hotkey",
                "command": command,
                "result": result,
                "timestamp": time.time()
            })
            
            return result
    
    async def _send_scroll(self, session: aiohttp.ClientSession, command: dict) -> dict:
        """Sendet einen Scroll-Command."""
        url = f"{self.backend_url}/api/automation/scroll"
        
        payload = {
            "x": command.get("x", None),
            "y": command.get("y", None),
            "amount": command.get("scrollAmount", 3),
            "direction": command.get("direction", "vertical")
        }
        
        logger.info(f"[LocalBridge] Scroll: amount={payload['amount']} direction={payload['direction']}")
        
        async with session.post(url, json=payload) as response:
            result = await response.json()
            
            self.command_history.append({
                "type": "scroll",
                "command": command,
                "result": result,
                "timestamp": time.time()
            })
            
            return result
    
    async def _send_mouse_move(self, session: aiohttp.ClientSession, command: dict) -> dict:
        """Sendet einen Mouse-Move-Command."""
        url = f"{self.backend_url}/api/automation/move"
        
        payload = {
            "x": command.get("x", 0),
            "y": command.get("y", 0),
            "duration": command.get("duration", 0.2)
        }
        
        logger.info(f"[LocalBridge] Move: ({payload['x']}, {payload['y']})")
        
        async with session.post(url, json=payload) as response:
            result = await response.json()
            
            self.command_history.append({
                "type": "mouse_move",
                "command": command,
                "result": result,
                "timestamp": time.time()
            })
            
            return result
    
    async def _send_mouse_drag(self, session: aiohttp.ClientSession, command: dict) -> dict:
        """Sendet einen Mouse-Drag-Command."""
        url = f"{self.backend_url}/api/automation/drag"
        
        payload = {
            "startX": command.get("startX", 0),
            "startY": command.get("startY", 0),
            "endX": command.get("endX", 0),
            "endY": command.get("endY", 0),
            "button": command.get("button", "left"),
            "duration": command.get("duration", 0.5)
        }
        
        logger.info(f"[LocalBridge] Drag: ({payload['startX']}, {payload['startY']}) -> ({payload['endX']}, {payload['endY']})")
        
        async with session.post(url, json=payload) as response:
            result = await response.json()
            
            self.command_history.append({
                "type": "mouse_drag",
                "command": command,
                "result": result,
                "timestamp": time.time()
            })
            
            return result
    
    async def check_status(self) -> dict[str, Any]:
        """Prüft den Status des Automation-Services im Backend."""
        if not AIOHTTP_AVAILABLE:
            return {"available": False, "error": "aiohttp nicht installiert"}
        
        try:
            session = await self._ensure_session()
            url = f"{self.backend_url}/api/automation/status"
            
            async with session.get(url) as response:
                return await response.json()
                
        except Exception as e:
            return {"available": False, "error": str(e)}
    
    def get_command_history(self) -> list[dict]:
        """Gibt die Command-Historie zurück."""
        return self.command_history.copy()
    
    def clear_history(self) -> None:
        """Löscht die Command-Historie."""
        self.command_history.clear()
    
    async def close(self) -> None:
        """Schließt die HTTP-Session."""
        if self.session and not self.session.closed:
            await self.session.close()
        self.session = None


class DesktopClientBridge:
    """
    Brücke zwischen AutoGen und dem Desktop-Client über Supabase.
    
    Sendet Commands über WebSocket oder HTTP an den Desktop-Client
    und empfängt Ergebnisse.
    
    HINWEIS: Für lokale Automation wird LocalDesktopBridge empfohlen.
    """
    
    def __init__(
        self,
        supabase_url: Optional[str] = None,
        supabase_key: Optional[str] = None,
        ws_url: Optional[str] = None,
        desktop_client_id: Optional[str] = None
    ):
        """
        Initialisiert die Desktop-Bridge.
        
        Args:
            supabase_url: Supabase URL (default: from env)
            supabase_key: Supabase Service Role Key (default: from env)
            ws_url: WebSocket URL zur Edge Function (optional)
            desktop_client_id: ID des Ziel-Desktop-Clients
        """
        self.supabase_url = supabase_url or os.getenv("VITE_SUPABASE_URL", "")
        self.supabase_key = supabase_key or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        
        # WebSocket URL konstruieren
        if ws_url:
            self.ws_url = ws_url
        elif self.supabase_url:
            # Konvertiere https:// zu wss://
            base_url = self.supabase_url.replace("https://", "wss://").replace("http://", "ws://")
            self.ws_url = f"{base_url}/functions/v1/live-desktop-stream"
        else:
            self.ws_url = None
        
        self.desktop_client_id = desktop_client_id
        
        # Supabase Client für DB-Zugriff
        self.supabase: Optional[Client] = None
        if SUPABASE_PY_AVAILABLE and self.supabase_url and self.supabase_key:
            try:
                self.supabase = create_client(self.supabase_url, self.supabase_key)
                logger.info("Supabase Client initialisiert")
            except Exception as e:
                logger.warning(f"Supabase Client konnte nicht initialisiert werden: {e}")
        
        # WebSocket-Verbindung
        self.websocket = None
        self.is_connected = False
        self.agent_id = f"autogen_agent_{uuid.uuid4().hex[:8]}"
        
        # Pending Commands
        self.pending_commands: dict[str, asyncio.Future] = {}
        
        logger.info(f"DesktopClientBridge initialisiert (agent_id={self.agent_id})")
    
    async def connect_websocket(self) -> bool:
        """
        Stellt WebSocket-Verbindung zur Edge Function her.
        
        Returns:
            True bei Erfolg
        """
        if not WEBSOCKETS_AVAILABLE:
            logger.error("websockets Bibliothek nicht installiert")
            return False
        
        if not self.ws_url:
            logger.error("Keine WebSocket-URL konfiguriert")
            return False
        
        try:
            connection_url = f"{self.ws_url}?client_type=agent&client_id={self.agent_id}"
            self.websocket = await websockets.connect(
                connection_url,
                ping_interval=20,
                ping_timeout=30
            )
            self.is_connected = True
            
            # Handshake senden
            handshake = {
                "type": "handshake",
                "clientInfo": {
                    "clientType": "autogen_agent",
                    "clientId": self.agent_id,
                    "capabilities": ["automation", "analysis"]
                },
                "timestamp": time.time()
            }
            await self.websocket.send(json.dumps(handshake))
            
            # Warte auf Bestätigung
            response = await asyncio.wait_for(self.websocket.recv(), timeout=10)
            data = json.loads(response)
            
            if data.get("type") in ("handshake_ack", "connection_established"):
                logger.info("WebSocket-Verbindung hergestellt")
                return True
            else:
                logger.warning(f"Unerwartete Handshake-Antwort: {data.get('type')}")
                return True  # Trotzdem weitermachen
                
        except Exception as e:
            logger.error(f"WebSocket-Verbindung fehlgeschlagen: {e}")
            self.is_connected = False
            return False
    
    async def disconnect_websocket(self) -> None:
        """Schließt die WebSocket-Verbindung."""
        if self.websocket:
            try:
                await self.websocket.close()
            except:
                pass
        self.websocket = None
        self.is_connected = False
    
    async def send_command_http(self, command: dict[str, Any]) -> dict[str, Any]:
        """
        Sendet einen Command per HTTP/Supabase an den Desktop-Client.
        
        Verwendet die desktop_commands Tabelle in Supabase.
        
        Args:
            command: Command-Dict mit type und Parametern
            
        Returns:
            Ergebnis der Ausführung
        """
        if not self.supabase:
            return {"success": False, "error": "Supabase nicht konfiguriert"}
        
        if not self.desktop_client_id:
            return {"success": False, "error": "Desktop Client ID nicht gesetzt"}
        
        try:
            command_id = str(uuid.uuid4())
            
            # Command in DB einfügen
            command_data = {
                "id": command_id,
                "desktop_client_id": self.desktop_client_id,
                "command_type": command.get("type", "unknown"),
                "command_data": command,
                "status": "pending",
                "created_at": "now()"
            }
            
            result = self.supabase.table("desktop_commands").insert(command_data).execute()
            
            if not result.data:
                return {"success": False, "error": "Command konnte nicht erstellt werden"}
            
            # Warte auf Ergebnis (polling)
            for _ in range(30):  # Max 15 Sekunden warten
                await asyncio.sleep(0.5)
                
                check = self.supabase.table("desktop_commands")\
                    .select("*")\
                    .eq("id", command_id)\
                    .single()\
                    .execute()
                
                if check.data:
                    status = check.data.get("status")
                    if status == "completed":
                        return {"success": True, "result": check.data}
                    elif status == "failed":
                        return {"success": False, "error": check.data.get("error_message", "Unknown error")}
            
            return {"success": False, "error": "Timeout - keine Antwort vom Desktop-Client"}
            
        except Exception as e:
            logger.error(f"HTTP Command fehlgeschlagen: {e}")
            return {"success": False, "error": str(e)}
    
    async def send_command_websocket(self, command: dict[str, Any]) -> dict[str, Any]:
        """
        Sendet einen Command per WebSocket an den Desktop-Client.
        
        Args:
            command: Command-Dict mit type und Parametern
            
        Returns:
            Ergebnis der Ausführung
        """
        if not self.is_connected or not self.websocket:
            # Versuche Verbindung herzustellen
            if not await self.connect_websocket():
                return {"success": False, "error": "WebSocket nicht verbunden"}
        
        try:
            command_id = str(uuid.uuid4())
            
            # Sende Command über WebSocket
            message = {
                "type": "send_command_to_desktop",
                "targetClientId": self.desktop_client_id,
                "command": {
                    "id": command_id,
                    "command_type": command.get("type"),
                    "command_data": command
                },
                "idempotencyKey": command_id,
                "timestamp": time.time()
            }
            
            await self.websocket.send(json.dumps(message))
            
            # Warte auf Bestätigung
            async def wait_for_result():
                while True:
                    try:
                        response = await asyncio.wait_for(self.websocket.recv(), timeout=15)
                        data = json.loads(response)
                        
                        if data.get("type") == "command_result" and data.get("commandId") == command_id:
                            return data
                        elif data.get("type") == "command_ack" and data.get("commandId") == command_id:
                            # Command wurde angenommen, warte auf Ergebnis
                            continue
                        elif data.get("type") == "ping":
                            # Pong senden
                            await self.websocket.send(json.dumps({"type": "pong"}))
                            continue
                    except asyncio.TimeoutError:
                        return None
            
            result = await wait_for_result()
            
            if result:
                return {
                    "success": result.get("status") == "completed",
                    "result": result.get("result"),
                    "error": result.get("error")
                }
            else:
                return {"success": False, "error": "Timeout - keine Antwort"}
                
        except Exception as e:
            logger.error(f"WebSocket Command fehlgeschlagen: {e}")
            self.is_connected = False
            return {"success": False, "error": str(e)}
    
    async def send_command(self, command: dict[str, Any]) -> dict[str, Any]:
        """
        Sendet einen Command an den Desktop-Client.
        
        Versucht zuerst WebSocket, dann HTTP als Fallback.
        
        Args:
            command: Command-Dict
            
        Returns:
            Ergebnis
        """
        # Versuche WebSocket
        if WEBSOCKETS_AVAILABLE and self.ws_url:
            result = await self.send_command_websocket(command)
            if result.get("success") or "Timeout" not in str(result.get("error", "")):
                return result
        
        # Fallback zu HTTP
        if self.supabase:
            return await self.send_command_http(command)
        
        return {"success": False, "error": "Keine Verbindungsmethode verfügbar"}
    
    def set_desktop_client_id(self, client_id: str) -> None:
        """Setzt die Ziel-Desktop-Client-ID."""
        self.desktop_client_id = client_id
        logger.info(f"Desktop Client ID gesetzt: {client_id}")
    
    async def get_available_clients(self) -> list[dict[str, Any]]:
        """
        Holt eine Liste verfügbarer Desktop-Clients.
        
        Returns:
            Liste von Client-Infos
        """
        if not self.supabase:
            return []
        
        try:
            # Clients der letzten 5 Minuten
            result = self.supabase.table("desktop_clients")\
                .select("*")\
                .gt("last_heartbeat", f"now() - interval '5 minutes'")\
                .execute()
            
            return result.data or []
        except Exception as e:
            logger.error(f"Konnte Clients nicht abrufen: {e}")
            return []
    
    async def close(self) -> None:
        """Schließt alle Ressourcen."""
        await self.disconnect_websocket()


# Globale Bridge-Instanzen
_global_bridge: Optional[DesktopClientBridge] = None
_local_bridge: Optional[LocalDesktopBridge] = None


def get_desktop_bridge(use_local: bool = True) -> LocalDesktopBridge | DesktopClientBridge:
    """
    Holt die globale Bridge-Instanz.
    
    Args:
        use_local: Wenn True, wird die lokale HTTP-Bridge verwendet (empfohlen)
    """
    global _local_bridge, _global_bridge
    
    if use_local:
        if _local_bridge is None:
            backend_url = os.getenv("TRAE_BACKEND_URL", "http://localhost:8007")
            _local_bridge = LocalDesktopBridge(backend_url=backend_url)
        return _local_bridge
    else:
        if _global_bridge is None:
            _global_bridge = DesktopClientBridge()
        return _global_bridge


def set_desktop_bridge(bridge: LocalDesktopBridge | DesktopClientBridge) -> None:
    """Setzt die globale Bridge-Instanz."""
    global _local_bridge, _global_bridge
    if isinstance(bridge, LocalDesktopBridge):
        _local_bridge = bridge
    else:
        _global_bridge = bridge


async def send_command_to_desktop(command: dict[str, Any]) -> dict[str, Any]:
    """
    Convenience-Funktion zum Senden von Commands.
    
    Verwendet standardmäßig die lokale Bridge für direkten Backend-Zugriff.
    Kann als Callback für den AutomationAgent verwendet werden.
    """
    bridge = get_desktop_bridge(use_local=True)
    return await bridge.send_command(command)