#!/usr/bin/env python3
"""
Tests for WebSocket Service
Tests real-time communication and WebSocket management
"""

import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
import json

# Import the service
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.websocket_service import WebSocketService

class TestWebSocketService:
    """Test the WebSocketService class"""
    
    @pytest.fixture
    def service(self):
        """Create a WebSocketService instance for testing"""
        return WebSocketService()
    
    @pytest.fixture
    def mock_websocket(self):
        """Create a mock WebSocket connection"""
        mock_ws = Mock()
        mock_ws.send = AsyncMock()
        mock_ws.receive = AsyncMock()
        mock_ws.close = AsyncMock()
        mock_ws.client_state = Mock()
        mock_ws.client_state.CONNECTED = 1
        mock_ws.client_state.DISCONNECTED = 3
        return mock_ws
    
    def test_service_initialization(self, service):
        """Test service initialization"""
        assert service.active_connections == {}
        assert service.connection_history == []
        assert service.message_history == []
        assert service.max_connections == 100
    
    def test_is_healthy(self, service):
        """Test health check"""
        assert service.is_healthy() is True
    
    @pytest.mark.asyncio
    async def test_connect_client(self, service, mock_websocket):
        """Test connecting a client"""
        client_id = "test_client_123"
        
        await service.connect(client_id, mock_websocket)
        
        assert client_id in service.active_connections
        assert service.active_connections[client_id]["websocket"] == mock_websocket
        assert service.active_connections[client_id]["status"] == "connected"
        assert "connected_at" in service.active_connections[client_id]
    
    @pytest.mark.asyncio
    async def test_disconnect_client(self, service, mock_websocket):
        """Test disconnecting a client"""
        client_id = "test_client_123"
        
        # Connect then disconnect
        await service.connect(client_id, mock_websocket)
        await service.disconnect(client_id)
        
        assert client_id not in service.active_connections
        mock_websocket.close.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_disconnect_nonexistent_client(self, service):
        """Test disconnecting a non-existent client"""
        result = await service.disconnect("nonexistent_client")
        
        assert result is False
    
    @pytest.mark.asyncio
    async def test_send_to_client_success(self, service, mock_websocket):
        """Test sending message to specific client"""
        client_id = "test_client_123"
        message = {"type": "test", "data": "hello"}
        
        await service.connect(client_id, mock_websocket)
        result = await service.send_to_client(client_id, message)
        
        assert result is True
        mock_websocket.send.assert_called_once()
        
        # Check the sent message
        sent_data = mock_websocket.send.call_args[0][0]
        sent_message = json.loads(sent_data)
        assert sent_message["type"] == "test"
        assert sent_message["data"] == "hello"
    
    @pytest.mark.asyncio
    async def test_send_to_client_not_found(self, service):
        """Test sending message to non-existent client"""
        message = {"type": "test", "data": "hello"}
        
        result = await service.send_to_client("nonexistent_client", message)
        
        assert result is False
    
    @pytest.mark.asyncio
    async def test_send_to_client_error(self, service, mock_websocket):
        """Test error handling when sending to client fails"""
        client_id = "test_client_123"
        message = {"type": "test", "data": "hello"}
        
        # Mock send to raise exception
        mock_websocket.send.side_effect = Exception("Send failed")
        
        await service.connect(client_id, mock_websocket)
        result = await service.send_to_client(client_id, message)
        
        assert result is False
    
    @pytest.mark.asyncio
    async def test_broadcast_to_all(self, service):
        """Test broadcasting message to all connected clients"""
        # Create multiple mock clients
        clients = {}
        for i in range(3):
            client_id = f"client_{i}"
            mock_ws = Mock()
            mock_ws.send = AsyncMock()
            clients[client_id] = mock_ws
            await service.connect(client_id, mock_ws)
        
        message = {"type": "broadcast", "data": "hello all"}
        await service.broadcast_to_all(message)
        
        # Check all clients received the message
        for client_id, mock_ws in clients.items():
            mock_ws.send.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_broadcast_to_all_no_clients(self, service):
        """Test broadcasting when no clients are connected"""
        message = {"type": "broadcast", "data": "hello all"}
        
        # Should not raise an error
        await service.broadcast_to_all(message)
    
    @pytest.mark.asyncio
    async def test_get_client_count(self, service, mock_websocket):
        """Test getting connected client count"""
        assert service.get_client_count() == 0
        
        # Connect some clients
        await service.connect("client1", mock_websocket)
        assert service.get_client_count() == 1
        
        mock_ws2 = Mock()
        mock_ws2.send = AsyncMock()
        mock_ws2.close = AsyncMock()
        await service.connect("client2", mock_ws2)
        assert service.get_client_count() == 2
        
        # Disconnect one
        await service.disconnect("client1")
        assert service.get_client_count() == 1
    
    @pytest.mark.asyncio
    async def test_get_connected_clients(self, service, mock_websocket):
        """Test getting list of connected clients"""
        clients = await service.get_connected_clients()
        assert clients == []
        
        # Connect some clients
        await service.connect("client1", mock_websocket)
        
        mock_ws2 = Mock()
        mock_ws2.send = AsyncMock()
        mock_ws2.close = AsyncMock()
        await service.connect("client2", mock_ws2)
        
        clients = await service.get_connected_clients()
        assert len(clients) == 2
        assert any(c["client_id"] == "client1" for c in clients)
        assert any(c["client_id"] == "client2" for c in clients)
        
        # Check client info structure
        for client in clients:
            assert "client_id" in client
            assert "status" in client
            assert "connected_at" in client
            assert "uptime" in client
    
    @pytest.mark.asyncio
    async def test_is_client_connected(self, service, mock_websocket):
        """Test checking if client is connected"""
        client_id = "test_client_123"
        
        assert await service.is_client_connected(client_id) is False
        
        await service.connect(client_id, mock_websocket)
        assert await service.is_client_connected(client_id) is True
        
        await service.disconnect(client_id)
        assert await service.is_client_connected(client_id) is False
    
    def test_add_to_message_history(self, service):
        """Test adding messages to history"""
        initial_count = len(service.message_history)
        
        service._add_to_message_history("client1", "outgoing", {"type": "test"})
        service._add_to_message_history("client2", "incoming", {"type": "response"})
        
        assert len(service.message_history) == initial_count + 2
        
        recent_messages = service.message_history[-2:]
        assert recent_messages[0]["client_id"] == "client1"
        assert recent_messages[0]["direction"] == "outgoing"
        assert recent_messages[1]["client_id"] == "client2"
        assert recent_messages[1]["direction"] == "incoming"
    
    def test_message_history_limit(self, service):
        """Test that message history respects size limit"""
        # Set small history limit for testing
        original_limit = service.max_message_history
        service.max_message_history = 3
        
        try:
            # Add more messages than the limit
            for i in range(5):
                service._add_to_message_history(f"client{i}", "outgoing", {"type": f"test{i}"})
            
            # Should only keep the most recent messages
            assert len(service.message_history) == 3
            
            # Check that latest messages are preserved
            for i, message in enumerate(service.message_history):
                expected_client = f"client{i+2}"  # Should be messages 2, 3, 4
                assert message["client_id"] == expected_client
        
        finally:
            service.max_message_history = original_limit
    
    @pytest.mark.asyncio
    async def test_get_message_history(self, service):
        """Test getting message history"""
        # Add some messages
        service._add_to_message_history("client1", "outgoing", {"type": "test1"})
        service._add_to_message_history("client1", "incoming", {"type": "response1"})
        
        history = await service.get_message_history()
        
        assert len(history) >= 2
        assert isinstance(history, list)
        
        # Check recent messages
        recent_messages = history[-2:]
        assert recent_messages[0]["client_id"] == "client1"
        assert recent_messages[1]["client_id"] == "client1"
    
    @pytest.mark.asyncio
    async def test_get_message_history_for_client(self, service):
        """Test getting message history for specific client"""
        # Add messages for different clients
        service._add_to_message_history("client1", "outgoing", {"type": "test1"})
        service._add_to_message_history("client2", "outgoing", {"type": "test2"})
        service._add_to_message_history("client1", "incoming", {"type": "response1"})
        
        client1_history = await service.get_message_history_for_client("client1")
        
        assert len(client1_history) == 2
        for message in client1_history:
            assert message["client_id"] == "client1"
    
    @pytest.mark.asyncio
    async def test_max_connections_limit(self, service):
        """Test maximum connections limit"""
        # Set low limit for testing
        service.max_connections = 2
        
        # Connect up to the limit
        mock_ws1 = Mock()
        mock_ws1.send = AsyncMock()
        mock_ws1.close = AsyncMock()
        await service.connect("client1", mock_ws1)
        
        mock_ws2 = Mock()
        mock_ws2.send = AsyncMock()
        mock_ws2.close = AsyncMock()
        await service.connect("client2", mock_ws2)
        
        # Try to exceed the limit
        mock_ws3 = Mock()
        mock_ws3.send = AsyncMock()
        mock_ws3.close = AsyncMock()
        
        with pytest.raises(Exception, match="Maximum connections reached"):
            await service.connect("client3", mock_ws3)
    
    @pytest.mark.asyncio
    async def test_cleanup_all_connections(self, service):
        """Test cleaning up all connections"""
        # Connect multiple clients
        clients = {}
        for i in range(3):
            client_id = f"client_{i}"
            mock_ws = Mock()
            mock_ws.send = AsyncMock()
            mock_ws.close = AsyncMock()
            clients[client_id] = mock_ws
            await service.connect(client_id, mock_ws)
        
        assert service.get_client_count() == 3
        
        await service.cleanup_all_connections()
        
        assert service.get_client_count() == 0
        
        # Check all websockets were closed
        for mock_ws in clients.values():
            mock_ws.close.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_connection_statistics(self, service):
        """Test getting connection statistics"""
        # Connect some clients
        mock_ws1 = Mock()
        mock_ws1.send = AsyncMock()
        mock_ws1.close = AsyncMock()
        await service.connect("client1", mock_ws1)
        
        # Add some message history
        service._add_to_message_history("client1", "outgoing", {"type": "test"})
        service._add_to_message_history("client1", "incoming", {"type": "response"})
        
        stats = await service.get_connection_statistics()
        
        assert "active_connections" in stats
        assert "total_messages_sent" in stats
        assert "total_messages_received" in stats
        assert "uptime" in stats
        
        assert stats["active_connections"] == 1
        assert stats["total_messages_sent"] >= 1
        assert stats["total_messages_received"] >= 1
    
    @pytest.mark.asyncio
    async def test_ping_client(self, service, mock_websocket):
        """Test pinging a client"""
        client_id = "test_client_123"
        
        await service.connect(client_id, mock_websocket)
        result = await service.ping_client(client_id)
        
        assert result is True
        mock_websocket.send.assert_called_once()
        
        # Check ping message was sent
        sent_data = mock_websocket.send.call_args[0][0]
        sent_message = json.loads(sent_data)
        assert sent_message["type"] == "ping"
    
    @pytest.mark.asyncio
    async def test_ping_all_clients(self, service):
        """Test pinging all connected clients"""
        # Connect multiple clients
        clients = {}
        for i in range(3):
            client_id = f"client_{i}"
            mock_ws = Mock()
            mock_ws.send = AsyncMock()
            clients[client_id] = mock_ws
            await service.connect(client_id, mock_ws)
        
        await service.ping_all_clients()
        
        # Check all clients received ping
        for mock_ws in clients.values():
            mock_ws.send.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_concurrent_connections(self, service):
        """Test multiple concurrent connections"""
        # Create multiple concurrent connection tasks
        tasks = []
        clients = {}
        
        for i in range(5):
            client_id = f"client_{i}"
            mock_ws = Mock()
            mock_ws.send = AsyncMock()
            mock_ws.close = AsyncMock()
            clients[client_id] = mock_ws
            
            task = service.connect(client_id, mock_ws)
            tasks.append(task)
        
        await asyncio.gather(*tasks)
        
        # Check all clients are connected
        assert service.get_client_count() == 5
        for client_id in clients.keys():
            assert await service.is_client_connected(client_id)
    
    @pytest.mark.asyncio
    async def test_connection_uptime_tracking(self, service, mock_websocket):
        """Test that connection uptime is tracked"""
        client_id = "test_client_123"
        
        await service.connect(client_id, mock_websocket)
        
        # Wait a brief moment
        await asyncio.sleep(0.01)
        
        clients = await service.get_connected_clients()
        client_info = next(c for c in clients if c["client_id"] == client_id)
        
        assert client_info["uptime"] > 0

if __name__ == "__main__":
    pytest.main([__file__]) 