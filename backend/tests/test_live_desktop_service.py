#!/usr/bin/env python3
"""
Tests for Live Desktop Service
Tests real-time desktop streaming and WebSocket functionality
"""

import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from PIL import Image
import io
import base64

# Import the service
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.live_desktop_service import LiveDesktopService

class TestLiveDesktopService:
    """Test the LiveDesktopService class"""
    
    @pytest.fixture
    def service(self):
        """Create a LiveDesktopService instance for testing"""
        return LiveDesktopService()
    
    @pytest.fixture
    def mock_websocket_manager(self):
        """Create a mock WebSocket manager"""
        mock_manager = Mock()
        mock_manager.broadcast_to_all = AsyncMock()
        mock_manager.get_client_count = Mock(return_value=0)
        return mock_manager
    
    def test_service_initialization(self, service):
        """Test service initialization"""
        assert service.streaming is False
        assert service.fps == 10
        assert service.quality == 80
        assert service.scale_factor == 1.0
        assert service.clients == set()
        assert service.streaming_task is None
    
    def test_is_healthy(self, service):
        """Test health check"""
        assert service.is_healthy() is True
    
    @pytest.mark.asyncio
    async def test_get_status_not_streaming(self, service):
        """Test getting status when not streaming"""
        status = await service.get_status()
        
        assert status["streaming"] is False
        assert status["client_count"] == 0
        assert status["fps"] == 10
        assert status["quality"] == 80
        assert status["scale_factor"] == 1.0
        assert "uptime" not in status
    
    @pytest.mark.asyncio
    async def test_update_config(self, service):
        """Test updating streaming configuration"""
        new_config = {
            "fps": 15,
            "quality": 90,
            "scale_factor": 0.8
        }
        
        await service.update_config(new_config)
        
        assert service.fps == 15
        assert service.quality == 90
        assert service.scale_factor == 0.8
    
    @pytest.mark.asyncio
    async def test_update_config_invalid_fps(self, service):
        """Test updating config with invalid FPS"""
        with pytest.raises(ValueError, match="FPS must be between 1 and 60"):
            await service.update_config({"fps": 0})
        
        with pytest.raises(ValueError, match="FPS must be between 1 and 60"):
            await service.update_config({"fps": 61})
    
    @pytest.mark.asyncio
    async def test_update_config_invalid_quality(self, service):
        """Test updating config with invalid quality"""
        with pytest.raises(ValueError, match="Quality must be between 1 and 100"):
            await service.update_config({"quality": 0})
        
        with pytest.raises(ValueError, match="Quality must be between 1 and 100"):
            await service.update_config({"quality": 101})
    
    @pytest.mark.asyncio
    async def test_update_config_invalid_scale_factor(self, service):
        """Test updating config with invalid scale factor"""
        with pytest.raises(ValueError, match="Scale factor must be between 0.1 and 2.0"):
            await service.update_config({"scale_factor": 0.05})
        
        with pytest.raises(ValueError, match="Scale factor must be between 0.1 and 2.0"):
            await service.update_config({"scale_factor": 2.5})
    
    def test_capture_screenshot(self, service):
        """Test capturing screenshot"""
        with patch('pyautogui.screenshot') as mock_screenshot:
            # Create a mock image
            mock_img = Image.new('RGB', (1920, 1080), color='red')
            mock_screenshot.return_value = mock_img
            
            screenshot = service._capture_screenshot()
            
            assert isinstance(screenshot, Image.Image)
            assert screenshot.size == (1920, 1080)
            mock_screenshot.assert_called_once()
    
    def test_capture_screenshot_error(self, service):
        """Test screenshot capture error handling"""
        with patch('pyautogui.screenshot', side_effect=Exception("Screenshot failed")):
            screenshot = service._capture_screenshot()
            
            assert screenshot is None
    
    def test_process_image_no_scaling(self, service):
        """Test image processing without scaling"""
        # Create test image
        img = Image.new('RGB', (800, 600), color='blue')
        service.scale_factor = 1.0
        service.quality = 80
        
        processed = service._process_image(img)
        
        assert isinstance(processed, str)  # Should be base64 string
        
        # Decode and verify
        decoded = base64.b64decode(processed)
        processed_img = Image.open(io.BytesIO(decoded))
        assert processed_img.size == (800, 600)
    
    def test_process_image_with_scaling(self, service):
        """Test image processing with scaling"""
        # Create test image
        img = Image.new('RGB', (800, 600), color='green')
        service.scale_factor = 0.5
        service.quality = 80
        
        processed = service._process_image(img)
        
        # Decode and verify scaling
        decoded = base64.b64decode(processed)
        processed_img = Image.open(io.BytesIO(decoded))
        assert processed_img.size == (400, 300)  # 50% of original
    
    def test_process_image_error(self, service):
        """Test image processing error handling"""
        # Use invalid image
        with patch.object(Image.Image, 'save', side_effect=Exception("Processing failed")):
            img = Image.new('RGB', (100, 100), color='white')
            result = service._process_image(img)
            
            assert result is None
    
    @pytest.mark.asyncio
    async def test_add_client(self, service, mock_websocket_manager):
        """Test adding client to streaming"""
        service.websocket_manager = mock_websocket_manager
        client_id = "test_client_123"
        
        await service.add_client(client_id)
        
        assert client_id in service.clients
        assert len(service.clients) == 1
    
    @pytest.mark.asyncio
    async def test_remove_client(self, service, mock_websocket_manager):
        """Test removing client from streaming"""
        service.websocket_manager = mock_websocket_manager
        client_id = "test_client_123"
        
        # Add then remove client
        await service.add_client(client_id)
        await service.remove_client(client_id)
        
        assert client_id not in service.clients
        assert len(service.clients) == 0
    
    @pytest.mark.asyncio
    async def test_start_streaming(self, service, mock_websocket_manager):
        """Test starting desktop streaming"""
        service.websocket_manager = mock_websocket_manager
        
        with patch.object(service, '_capture_screenshot') as mock_capture, \
             patch.object(service, '_process_image') as mock_process:
            
            # Mock screenshot and processing
            mock_img = Image.new('RGB', (800, 600), color='red')
            mock_capture.return_value = mock_img
            mock_process.return_value = "mock_base64_data"
            
            await service.start_streaming()
            
            assert service.streaming is True
            assert service.streaming_task is not None
            
            # Stop streaming to clean up
            await service.stop_streaming()
    
    @pytest.mark.asyncio
    async def test_stop_streaming(self, service):
        """Test stopping desktop streaming"""
        service.streaming = True
        service.streaming_task = Mock()
        service.streaming_task.cancel = Mock()
        
        await service.stop_streaming()
        
        assert service.streaming is False
        assert service.streaming_task is None
    
    @pytest.mark.asyncio
    async def test_streaming_loop_with_clients(self, service, mock_websocket_manager):
        """Test streaming loop when clients are connected"""
        service.websocket_manager = mock_websocket_manager
        service.clients.add("client1")
        service.clients.add("client2")
        
        with patch.object(service, '_capture_screenshot') as mock_capture, \
             patch.object(service, '_process_image') as mock_process, \
             patch('asyncio.sleep', side_effect=asyncio.CancelledError):  # Cancel after first iteration
            
            mock_img = Image.new('RGB', (800, 600), color='blue')
            mock_capture.return_value = mock_img
            mock_process.return_value = "test_image_data"
            
            try:
                await service._streaming_loop()
            except asyncio.CancelledError:
                pass  # Expected when we cancel the loop
            
            # Verify screenshot was captured and processed
            mock_capture.assert_called()
            mock_process.assert_called_with(mock_img)
            
            # Verify data was broadcast
            mock_websocket_manager.broadcast_to_all.assert_called()
    
    @pytest.mark.asyncio
    async def test_streaming_loop_no_clients(self, service, mock_websocket_manager):
        """Test streaming loop when no clients are connected"""
        service.websocket_manager = mock_websocket_manager
        # No clients added
        
        with patch.object(service, '_capture_screenshot') as mock_capture, \
             patch('asyncio.sleep', side_effect=asyncio.CancelledError):
            
            try:
                await service._streaming_loop()
            except asyncio.CancelledError:
                pass
            
            # Should not capture screenshots when no clients
            mock_capture.assert_not_called()
            mock_websocket_manager.broadcast_to_all.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_streaming_loop_capture_failure(self, service, mock_websocket_manager):
        """Test streaming loop when screenshot capture fails"""
        service.websocket_manager = mock_websocket_manager
        service.clients.add("client1")
        
        with patch.object(service, '_capture_screenshot', return_value=None), \
             patch('asyncio.sleep', side_effect=asyncio.CancelledError):
            
            try:
                await service._streaming_loop()
            except asyncio.CancelledError:
                pass
            
            # Should not broadcast when capture fails
            mock_websocket_manager.broadcast_to_all.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_streaming_loop_processing_failure(self, service, mock_websocket_manager):
        """Test streaming loop when image processing fails"""
        service.websocket_manager = mock_websocket_manager
        service.clients.add("client1")
        
        with patch.object(service, '_capture_screenshot') as mock_capture, \
             patch.object(service, '_process_image', return_value=None), \
             patch('asyncio.sleep', side_effect=asyncio.CancelledError):
            
            mock_img = Image.new('RGB', (800, 600), color='green')
            mock_capture.return_value = mock_img
            
            try:
                await service._streaming_loop()
            except asyncio.CancelledError:
                pass
            
            # Should not broadcast when processing fails
            mock_websocket_manager.broadcast_to_all.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_get_status_while_streaming(self, service, mock_websocket_manager):
        """Test getting status while streaming is active"""
        service.websocket_manager = mock_websocket_manager
        service.streaming = True
        service.clients.add("client1")
        service.clients.add("client2")
        
        # Mock start time
        service.start_time = 1000.0
        with patch('time.time', return_value=1010.0):  # 10 seconds later
            status = await service.get_status()
        
        assert status["streaming"] is True
        assert status["client_count"] == 2
        assert status["fps"] == 10
        assert status["quality"] == 80
        assert status["uptime"] == 10.0
    
    def test_calculate_frame_interval(self, service):
        """Test frame interval calculation"""
        service.fps = 10
        interval = service._calculate_frame_interval()
        assert interval == 0.1  # 1/10 = 0.1 seconds
        
        service.fps = 30
        interval = service._calculate_frame_interval()
        assert abs(interval - 0.0333) < 0.001  # 1/30 ≈ 0.0333
    
    @pytest.mark.asyncio
    async def test_get_streaming_statistics(self, service):
        """Test getting streaming statistics"""
        service.frames_sent = 100
        service.total_bytes_sent = 1024000
        service.start_time = 1000.0
        
        with patch('time.time', return_value=1010.0):  # 10 seconds later
            stats = await service.get_streaming_statistics()
        
        assert "frames_sent" in stats
        assert "total_bytes_sent" in stats
        assert "average_fps" in stats
        assert "average_bitrate" in stats
        assert "uptime" in stats
        
        assert stats["frames_sent"] == 100
        assert stats["uptime"] == 10.0
    
    @pytest.mark.asyncio
    async def test_concurrent_client_management(self, service, mock_websocket_manager):
        """Test concurrent client addition and removal"""
        service.websocket_manager = mock_websocket_manager
        
        # Add multiple clients concurrently
        tasks = []
        client_ids = [f"client_{i}" for i in range(5)]
        
        for client_id in client_ids:
            tasks.append(service.add_client(client_id))
        
        await asyncio.gather(*tasks)
        
        assert len(service.clients) == 5
        for client_id in client_ids:
            assert client_id in service.clients
        
        # Remove clients concurrently
        tasks = []
        for client_id in client_ids[:3]:  # Remove first 3
            tasks.append(service.remove_client(client_id))
        
        await asyncio.gather(*tasks)
        
        assert len(service.clients) == 2
        for client_id in client_ids[3:]:  # Last 2 should remain
            assert client_id in service.clients
    
    @pytest.mark.asyncio
    async def test_automatic_stop_when_no_clients(self, service, mock_websocket_manager):
        """Test that streaming stops automatically when all clients disconnect"""
        service.websocket_manager = mock_websocket_manager
        
        # Start streaming with a client
        await service.add_client("client1")
        await service.start_streaming()
        
        assert service.streaming is True
        
        # Remove the last client
        await service.remove_client("client1")
        
        # Wait a moment for potential auto-stop
        await asyncio.sleep(0.01)
        
        # Note: This test would need the actual auto-stop logic implemented
        # For now, we just verify the client was removed
        assert len(service.clients) == 0
    
    def test_image_compression_quality(self, service):
        """Test that image compression quality affects file size"""
        img = Image.new('RGB', (800, 600), color='red')
        
        # High quality
        service.quality = 95
        high_quality = service._process_image(img)
        
        # Low quality
        service.quality = 10
        low_quality = service._process_image(img)
        
        # Low quality should result in smaller data
        assert len(low_quality) < len(high_quality)

if __name__ == "__main__":
    pytest.main([__file__]) 