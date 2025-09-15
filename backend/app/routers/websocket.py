"""WebSocket Router for Live Desktop Streaming

Provides WebSocket endpoints for real-time desktop streaming,
workflow automation, and filesystem bridge communication.
"""

import json
import asyncio
import base64
from typing import Dict, Set, Any
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from ..logging import get_logger

logger = get_logger("websocket_router")

# Define router without prefix (prefix added in main.py)
router = APIRouter(tags=["WebSocket"])

class ConnectionManager:
    """Manages WebSocket connections for live desktop streaming"""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.client_info: Dict[str, Dict] = {}
    
    async def connect(self, websocket: WebSocket, client_id: str, client_info_data: Dict):
        """Accept new WebSocket connection"""
        await websocket.accept()
        self.active_connections[client_id] = websocket
        self.client_info[client_id] = client_info_data
        logger.info(f"✅ Client connected: {client_id} ({client_info_data.get('clientType', 'unknown')})")
    
    def disconnect(self, client_id: str):
        """Remove WebSocket connection"""
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        if client_id in self.client_info:
            del self.client_info[client_id]
        logger.info(f"🔌 Client disconnected: {client_id}")
    
    async def send_personal_message(self, message: str, client_id: str):
        """Send message to specific client"""
        if client_id in self.active_connections:
            try:
                await self.active_connections[client_id].send_text(message)
            except Exception as e:
                logger.error(f"❌ Failed to send message to {client_id}: {e}")
                self.disconnect(client_id)
    
    async def send_binary_message(self, data: bytes, client_id: str):
        """Send binary data to specific client"""
        if client_id in self.active_connections:
            try:
                await self.active_connections[client_id].send_bytes(data)
            except Exception as e:
                logger.error(f"❌ Failed to send binary data to {client_id}: {e}")
                self.disconnect(client_id)
    
    async def broadcast(self, message: str, exclude_client: str = None):
        """Broadcast message to all connected clients"""
        disconnected_clients = []
        
        for client_id, connection in self.active_connections.items():
            if client_id != exclude_client:
                try:
                    await connection.send_text(message)
                except Exception as e:
                    logger.error(f"❌ Broadcast failed to {client_id}: {e}")
                    disconnected_clients.append(client_id)
        
        # Clean up disconnected clients
        for client_id in disconnected_clients:
            self.disconnect(client_id)
    
    def get_connection_count(self) -> int:
        """Get number of active connections"""
        return len(self.active_connections)
    
    def get_client_list(self) -> list:
        """Get list of connected client IDs"""
        return list(self.client_info.keys())

# Global connection manager
manager = ConnectionManager()

@router.websocket("/live-desktop")
async def websocket_live_desktop(websocket: WebSocket):
    """Main WebSocket endpoint for live desktop streaming"""
    client_id = None
    
    try:
        # Accept WebSocket connection first
        await websocket.accept()
        logger.info("🤝 WebSocket connection accepted, waiting for handshake...")
        
        # Get desktop service from app state through websocket scope
        desktop_service = None
        try:
            app = websocket.scope.get("app")
            if app and hasattr(app, 'state') and hasattr(app.state, 'service_manager'):
                service_manager = app.state.service_manager
                desktop_service = service_manager.get_service("live_desktop")
                logger.info(f"✅ Desktop service retrieved: {desktop_service is not None}")
            else:
                logger.warning("⚠️ Service manager not available in app state")
        except Exception as e:
            logger.error(f"❌ Failed to get desktop service: {e}")
        
        # Receive handshake with timeout
        try:
            handshake_data = await asyncio.wait_for(websocket.receive_text(), timeout=10.0)
            handshake = json.loads(handshake_data)
        except asyncio.TimeoutError:
            await websocket.close(code=4000, reason="Handshake timeout")
            logger.warning("⏰ Handshake timeout")
            return
        except json.JSONDecodeError:
            await websocket.close(code=4000, reason="Invalid handshake JSON")
            logger.warning("❌ Invalid handshake JSON")
            return
        
        if handshake.get('type') != 'handshake':
            await websocket.close(code=4000, reason="Invalid handshake type")
            logger.warning(f"❌ Invalid handshake type: {handshake.get('type')}")
            return
        
        client_info_data = handshake.get('clientInfo', {})
        client_id = client_info_data.get('clientId', f"client_{id(websocket)}")
        client_type = client_info_data.get('clientType', 'unknown')
        
        # Register connection (without accepting again)
        manager.active_connections[client_id] = websocket
        manager.client_info[client_id] = client_info_data
        logger.info(f"✅ Client connected: {client_id} ({client_type})")
        
        # Send handshake confirmation
        handshake_response = {
            "type": "handshake_ack",
            "clientId": client_id,
            "status": "connected",
            "timestamp": datetime.now().isoformat(),
            "serverCapabilities": [
                "desktop_stream",
                "workflow_data",
                "file_operations",
                "screenshot_capture",
                "automation_triggers",
                "multi_desktop_clients"
            ]
        }
        
        await websocket.send_text(json.dumps(handshake_response))
        logger.info(f"✅ Handshake completed for {client_id} ({client_type})")
        
        # Handle messages
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                
                await handle_websocket_message(websocket, client_id, message, desktop_service)
                
            except json.JSONDecodeError:
                logger.warning(f"⚠️ Invalid JSON from client {client_id}")
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "Invalid JSON format"
                }))
            
    except WebSocketDisconnect:
        logger.info(f"🔌 Client {client_id} disconnected normally")
    except Exception as e:
        logger.error(f"❌ WebSocket error for client {client_id}: {e}")
    finally:
        if client_id:
            # Stop streaming for this client and cleanup
            if desktop_service:
                try:
                    await desktop_service.stop_streaming(client_id)
                    logger.info(f"🛑 Streaming stopped for disconnected client {client_id}")
                except Exception as e:
                    logger.error(f"❌ Error stopping streaming for {client_id}: {e}")
            manager.disconnect(client_id)

async def handle_websocket_message(websocket: WebSocket, client_id: str, message: Dict, desktop_service=None):
    """Handle incoming WebSocket messages"""
    message_type = message.get('type')
    
    try:
        if message_type == 'ping':
            await websocket.send_text(json.dumps({
                "type": "pong",
                "timestamp": message.get('timestamp', datetime.now().isoformat())
            }))
        
        elif message_type == 'get_desktop_clients':
            await handle_get_desktop_clients(websocket, client_id, message, desktop_service)
        
        elif message_type == 'subscribe_workflow_execution':
            await handle_subscribe_workflow_execution(websocket, client_id, message)
        
        elif message_type == 'unsubscribe_workflow_execution':
            await handle_unsubscribe_workflow_execution(websocket, client_id, message)
        
        elif message_type == 'request_desktop_stream' or message_type == 'start_desktop_stream':
            await handle_stream_request(websocket, client_id, message, desktop_service)
        
        elif message_type == 'stop_desktop_stream':
            await handle_stream_stop(websocket, client_id, message, desktop_service)
        
        elif message_type == 'configure_stream':
            await handle_stream_config(websocket, client_id, message, desktop_service)
        
        elif message_type == 'request_screenshot':
            await handle_screenshot_request(websocket, client_id, message, desktop_service)
        
        elif message_type == 'workflow_data':
            await handle_workflow_data(client_id, message.get('data', {}))
        
        elif message_type == 'filesystem_operation':
            await handle_filesystem_operation(websocket, client_id, message)
        
        elif message_type == 'subscribe_workflow_execution':
            await handle_subscribe_workflow_execution(websocket, client_id, message)
        
        elif message_type == 'unsubscribe_workflow_execution':
            await handle_unsubscribe_workflow_execution(websocket, client_id, message)
        
        else:
            logger.warning(f"⚠️ Unknown message type from {client_id}: {message_type}")
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": f"Unknown message type: {message_type}"
            }))
            
    except Exception as e:
        logger.error(f"❌ Error handling message from {client_id}: {e}")
        await websocket.send_text(json.dumps({
            "type": "error",
            "message": f"Message handling error: {str(e)}"
        }))

async def handle_get_desktop_clients(websocket: WebSocket, client_id: str, message: Dict, desktop_service):
    """Handle get desktop clients request - returns list of available desktop monitors/clients"""
    try:
        if not desktop_service:
            # Return mock data if service not available - matching real service data structure
            desktop_clients = [
                {
                    "id": "monitor_0",
                    "name": "Primary Monitor",
                    "status": "available",
                    "resolution": {"width": 1920, "height": 1080},
                    "isPrimary": True,
                    "x": 0,
                    "y": 0,
                    "scale_factor": 1.0,
                    "streaming": False
                },
                {
                    "id": "monitor_1", 
                    "name": "Secondary Monitor",
                    "status": "available",
                    "resolution": {"width": 1920, "height": 1080},
                    "isPrimary": False,
                    "x": 1920,
                    "y": 0,
                    "scale_factor": 1.0,
                    "streaming": False
                }
            ]
        else:
            # Get actual desktop clients from service
            desktop_clients = await desktop_service.get_available_monitors()
        
        response = {
            "type": "desktop_clients_list",
            "clients": desktop_clients,
            "timestamp": datetime.now().isoformat()
        }
        
        await websocket.send_text(json.dumps(response))
        logger.info(f"📱 Sent desktop clients list to {client_id}: {len(desktop_clients)} clients")
        
    except Exception as e:
        logger.error(f"❌ Error getting desktop clients for {client_id}: {e}")
        await websocket.send_text(json.dumps({
            "type": "error",
            "message": f"Failed to get desktop clients: {str(e)}"
        }))

async def handle_stream_request(websocket: WebSocket, client_id: str, message: Dict, desktop_service):
    """Handle desktop stream request"""
    monitor_id = message.get('monitorId', 'monitor_0')
    
    if not desktop_service:
        await websocket.send_text(json.dumps({
            "type": "stream_error",
            "message": "Desktop service not available",
            "monitorId": monitor_id
        }))
        return
    
    client_info = message.get('clientInfo', {})
    success = await desktop_service.start_streaming(client_id, client_info, monitor_id)
    
    if success:
        # Set up frame callback for this client
        def frame_callback(frame_data: bytes):
            asyncio.create_task(manager.send_binary_message(frame_data, client_id))
        
        desktop_service.add_frame_callback(frame_callback)
        
        await websocket.send_text(json.dumps({
            "type": "stream_started",
            "clientId": client_id,
            "monitorId": monitor_id,
            "timestamp": datetime.now().isoformat()
        }))
        logger.info(f"🎬 Desktop streaming started for {client_id} on {monitor_id}")
    else:
        await websocket.send_text(json.dumps({
            "type": "stream_error",
            "message": "Failed to start desktop streaming",
            "monitorId": monitor_id
        }))

async def handle_stream_stop(websocket: WebSocket, client_id: str, message: Dict, desktop_service):
    """Handle desktop stream stop request"""
    monitor_id = message.get('monitorId', 'monitor_0')
    
    if desktop_service:
        success = await desktop_service.stop_streaming(client_id, monitor_id)
        
        await websocket.send_text(json.dumps({
            "type": "stream_stopped",
            "clientId": client_id,
            "monitorId": monitor_id,
            "success": success,
            "timestamp": datetime.now().isoformat()
        }))
        logger.info(f"🛑 Desktop streaming stopped for {client_id} on {monitor_id}")

async def handle_stream_config(websocket: WebSocket, client_id: str, message: Dict, desktop_service):
    """Handle stream configuration"""
    if not desktop_service:
        await websocket.send_text(json.dumps({
            "type": "config_error",
            "message": "Desktop service not available"
        }))
        return
    
    config = message.get('config', {})
    success = await desktop_service.configure_streaming(config)
    
    await websocket.send_text(json.dumps({
        "type": "config_updated",
        "success": success,
        "config": desktop_service.stream_config if success else None,
        "timestamp": datetime.now().isoformat()
    }))

async def handle_screenshot_request(websocket: WebSocket, client_id: str, message: Dict, desktop_service):
    """Handle screenshot request"""
    if not desktop_service:
        await websocket.send_text(json.dumps({
            "type": "screenshot_error",
            "message": "Desktop service not available"
        }))
        return
    
    screenshot_data = await desktop_service.take_screenshot(encode_base64=True)
    
    if screenshot_data:
        await websocket.send_text(json.dumps({
            "type": "screenshot",
            "data": screenshot_data,
            "timestamp": datetime.now().isoformat()
        }))
        logger.debug(f"📸 Screenshot sent to {client_id}")
    else:
        await websocket.send_text(json.dumps({
            "type": "screenshot_error",
            "message": "Failed to capture screenshot"
        }))

async def handle_workflow_data(client_id: str, data: Dict):
    """Handle workflow data from filesystem bridge"""
    logger.info(f"📊 Received workflow data from {client_id}: {len(str(data))} bytes")
    
    # Broadcast to other clients if needed
    await manager.broadcast(json.dumps({
        "type": "workflow_update",
        "source": client_id,
        "data": data,
        "timestamp": datetime.now().isoformat()
    }), exclude_client=client_id)

async def handle_filesystem_operation(websocket: WebSocket, client_id: str, message: Dict):
    """Handle filesystem operations"""
    operation = message.get('operation')
    path = message.get('path')
    
    logger.info(f"📁 Filesystem operation from {client_id}: {operation} on {path}")
    
    # Mock response - in real implementation, this would perform actual file operations
    await websocket.send_text(json.dumps({
        "type": "filesystem_response",
        "operation": operation,
        "path": path,
        "success": True,
        "message": f"Operation {operation} completed",
        "timestamp": datetime.now().isoformat()
    }))

@router.get("/health")
async def websocket_health():
    """WebSocket router health check"""
    return {
        "status": "ok",
        "router": "websocket",
        "active_connections": manager.get_connection_count(),
        "clients": manager.get_client_list(),
        "endpoints": [
            "/ws/live-desktop",
            "/ws/echo",
            "/ws/health"
        ]
    }

# Workflow execution subscription management
workflow_execution_subscribers: Dict[str, Set[str]] = {}  # execution_id -> set of client_ids

async def handle_subscribe_workflow_execution(websocket: WebSocket, client_id: str, message: Dict):
    """Handle workflow execution subscription"""
    execution_id = message.get('executionId')
    
    if not execution_id:
        await websocket.send_text(json.dumps({
            "type": "subscription_error",
            "message": "Missing executionId"
        }))
        return
    
    # Add client to subscribers
    if execution_id not in workflow_execution_subscribers:
        workflow_execution_subscribers[execution_id] = set()
    
    workflow_execution_subscribers[execution_id].add(client_id)
    
    await websocket.send_text(json.dumps({
        "type": "workflow_execution_subscribed",
        "executionId": execution_id,
        "clientId": client_id,
        "timestamp": datetime.now().isoformat()
    }))
    
    logger.info(f"📊 Client {client_id} subscribed to workflow execution {execution_id}")

async def handle_unsubscribe_workflow_execution(websocket: WebSocket, client_id: str, message: Dict):
    """Handle workflow execution unsubscription"""
    execution_id = message.get('executionId')
    
    if not execution_id:
        await websocket.send_text(json.dumps({
            "type": "unsubscription_error",
            "message": "Missing executionId"
        }))
        return
    
    # Remove client from subscribers
    if execution_id in workflow_execution_subscribers:
        workflow_execution_subscribers[execution_id].discard(client_id)
        
        # Clean up empty subscription sets
        if not workflow_execution_subscribers[execution_id]:
            del workflow_execution_subscribers[execution_id]
    
    await websocket.send_text(json.dumps({
        "type": "workflow_execution_unsubscribed",
        "executionId": execution_id,
        "clientId": client_id,
        "timestamp": datetime.now().isoformat()
    }))
    
    logger.info(f"📊 Client {client_id} unsubscribed from workflow execution {execution_id}")

async def broadcast_workflow_execution_update(execution_id: str, update_data: Dict):
    """Broadcast workflow execution update to subscribed clients"""
    if execution_id not in workflow_execution_subscribers:
        return
    
    subscribers = workflow_execution_subscribers[execution_id].copy()
    disconnected_clients = []
    
    message = json.dumps({
        "type": "workflow_execution_update",
        "executionId": execution_id,
        "data": update_data,
        "timestamp": datetime.now().isoformat()
    })
    
    for client_id in subscribers:
        if client_id in manager.active_connections:
            try:
                await manager.active_connections[client_id].send_text(message)
            except Exception as e:
                logger.error(f"❌ Failed to send workflow update to {client_id}: {e}")
                disconnected_clients.append(client_id)
        else:
            disconnected_clients.append(client_id)
    
    # Clean up disconnected clients
    for client_id in disconnected_clients:
        workflow_execution_subscribers[execution_id].discard(client_id)
    
    if disconnected_clients:
        logger.info(f"🧹 Cleaned up {len(disconnected_clients)} disconnected clients from execution {execution_id}")

async def broadcast_node_execution_update(execution_id: str, node_id: str, node_data: Dict):
    """Broadcast individual node execution update"""
    update_data = {
        "type": "node_update",
        "nodeId": node_id,
        "nodeData": node_data
    }
    
    await broadcast_workflow_execution_update(execution_id, update_data)
    logger.debug(f"📊 Broadcasted node update for {node_id} in execution {execution_id}")

async def broadcast_execution_status_update(execution_id: str, status_data: Dict):
    """Broadcast execution status update"""
    update_data = {
        "type": "status_update",
        "statusData": status_data
    }
    
    await broadcast_workflow_execution_update(execution_id, update_data)
    logger.debug(f"📊 Broadcasted status update for execution {execution_id}")

@router.websocket("/echo")
async def websocket_echo(websocket: WebSocket):
    """Simple echo WebSocket endpoint for testing"""
    await websocket.accept()
    logger.info("🔄 WebSocket echo connection accepted")
    
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(f"Echo: {data}")
            logger.debug(f"🔄 Echoed: {data[:50]}...")
    except WebSocketDisconnect:
        logger.info("🔌 WebSocket echo connection disconnected")