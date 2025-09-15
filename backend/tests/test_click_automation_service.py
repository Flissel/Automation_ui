#!/usr/bin/env python3
"""
Tests for Click Automation Service
Tests automated mouse clicking and coordinate validation
"""

import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock

# Import the service
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.click_automation_service import ClickAutomationService

class TestClickAutomationService:
    """Test the ClickAutomationService class"""
    
    @pytest.fixture
    def service(self):
        """Create a ClickAutomationService instance for testing"""
        return ClickAutomationService()
    
    def test_service_initialization(self, service):
        """Test service initialization"""
        assert service.click_history == []
        assert service.supported_buttons == ["left", "right", "middle"]
        assert service.supported_click_types == ["single", "double", "triple"]
        assert service.screen_bounds == {"width": 1920, "height": 1080}  # Default
    
    def test_is_healthy_without_pyautogui(self, service):
        """Test health check without pyautogui available"""
        with patch('pyautogui.size', side_effect=Exception("PyAutoGUI not available")):
            assert service.is_healthy() is False
    
    def test_is_healthy_with_pyautogui(self, service):
        """Test health check with pyautogui available"""
        with patch('pyautogui.size', return_value=(1920, 1080)):
            assert service.is_healthy() is True
    
    def test_get_supported_buttons(self, service):
        """Test getting supported mouse buttons"""
        buttons = service.get_supported_buttons()
        
        assert isinstance(buttons, list)
        assert "left" in buttons
        assert "right" in buttons
        assert "middle" in buttons
    
    def test_get_supported_click_types(self, service):
        """Test getting supported click types"""
        click_types = service.get_supported_click_types()
        
        assert isinstance(click_types, list)
        assert "single" in click_types
        assert "double" in click_types
        assert "triple" in click_types
    
    @pytest.mark.asyncio
    async def test_get_screen_bounds(self, service):
        """Test getting screen bounds"""
        with patch('pyautogui.size', return_value=(1920, 1080)):
            bounds = await service.get_screen_bounds()
            
            assert bounds["width"] == 1920
            assert bounds["height"] == 1080
            assert bounds["min_x"] == 0
            assert bounds["min_y"] == 0
            assert bounds["max_x"] == 1919
            assert bounds["max_y"] == 1079
    
    @pytest.mark.asyncio
    async def test_validate_coordinates_valid(self, service):
        """Test validating coordinates within screen bounds"""
        with patch('pyautogui.size', return_value=(1920, 1080)):
            # Valid coordinates
            assert await service.validate_coordinates(500, 300) is True
            assert await service.validate_coordinates(0, 0) is True
            assert await service.validate_coordinates(1919, 1079) is True
    
    @pytest.mark.asyncio
    async def test_validate_coordinates_invalid(self, service):
        """Test validating coordinates outside screen bounds"""
        with patch('pyautogui.size', return_value=(1920, 1080)):
            # Invalid coordinates
            assert await service.validate_coordinates(-1, 300) is False
            assert await service.validate_coordinates(500, -1) is False
            assert await service.validate_coordinates(1920, 1080) is False  # Exact bounds
            assert await service.validate_coordinates(2000, 1500) is False
    
    @pytest.mark.asyncio
    async def test_click_at_coordinates_success(self, service):
        """Test successful click at coordinates"""
        with patch('pyautogui.size', return_value=(1920, 1080)), \
             patch('pyautogui.click') as mock_click, \
             patch('time.sleep') as mock_sleep:
            
            result = await service.click_at_coordinates(
                x=500,
                y=300,
                button="left",
                click_type="single",
                delay=0.1
            )
            
            assert result["success"] is True
            assert result["clicked"] is True
            assert result["coordinates"]["x"] == 500
            assert result["coordinates"]["y"] == 300
            assert result["button"] == "left"
            assert result["click_type"] == "single"
            
            # Check that PyAutoGUI click was called
            mock_click.assert_called_once_with(x=500, y=300, button="left", clicks=1)
            mock_sleep.assert_called_once_with(0.1)
    
    @pytest.mark.asyncio
    async def test_click_at_coordinates_double_click(self, service):
        """Test double click functionality"""
        with patch('pyautogui.size', return_value=(1920, 1080)), \
             patch('pyautogui.click') as mock_click:
            
            result = await service.click_at_coordinates(
                x=500,
                y=300,
                button="left",
                click_type="double"
            )
            
            assert result["success"] is True
            assert result["click_type"] == "double"
            
            # Check that double click was performed
            mock_click.assert_called_once_with(x=500, y=300, button="left", clicks=2)
    
    @pytest.mark.asyncio
    async def test_click_at_coordinates_triple_click(self, service):
        """Test triple click functionality"""
        with patch('pyautogui.size', return_value=(1920, 1080)), \
             patch('pyautogui.click') as mock_click:
            
            result = await service.click_at_coordinates(
                x=500,
                y=300,
                button="left",
                click_type="triple"
            )
            
            assert result["success"] is True
            assert result["click_type"] == "triple"
            
            # Check that triple click was performed
            mock_click.assert_called_once_with(x=500, y=300, button="left", clicks=3)
    
    @pytest.mark.asyncio
    async def test_click_at_coordinates_right_button(self, service):
        """Test right button clicking"""
        with patch('pyautogui.size', return_value=(1920, 1080)), \
             patch('pyautogui.click') as mock_click:
            
            result = await service.click_at_coordinates(
                x=500,
                y=300,
                button="right",
                click_type="single"
            )
            
            assert result["success"] is True
            assert result["button"] == "right"
            
            mock_click.assert_called_once_with(x=500, y=300, button="right", clicks=1)
    
    @pytest.mark.asyncio
    async def test_click_at_coordinates_invalid_coordinates(self, service):
        """Test clicking at invalid coordinates"""
        with patch('pyautogui.size', return_value=(1920, 1080)):
            
            result = await service.click_at_coordinates(
                x=-1,
                y=300,
                button="left",
                click_type="single"
            )
            
            assert result["success"] is False
            assert result["clicked"] is False
            assert "error" in result
            assert "invalid coordinates" in result["error"].lower()
    
    @pytest.mark.asyncio
    async def test_click_at_coordinates_invalid_button(self, service):
        """Test clicking with invalid button"""
        with patch('pyautogui.size', return_value=(1920, 1080)):
            
            result = await service.click_at_coordinates(
                x=500,
                y=300,
                button="invalid_button",
                click_type="single"
            )
            
            assert result["success"] is False
            assert result["clicked"] is False
            assert "error" in result
            assert "invalid button" in result["error"].lower()
    
    @pytest.mark.asyncio
    async def test_click_at_coordinates_invalid_click_type(self, service):
        """Test clicking with invalid click type"""
        with patch('pyautogui.size', return_value=(1920, 1080)):
            
            result = await service.click_at_coordinates(
                x=500,
                y=300,
                button="left",
                click_type="invalid_type"
            )
            
            assert result["success"] is False
            assert result["clicked"] is False
            assert "error" in result
            assert "invalid click type" in result["error"].lower()
    
    @pytest.mark.asyncio
    async def test_click_at_coordinates_pyautogui_error(self, service):
        """Test error handling when PyAutoGUI fails"""
        with patch('pyautogui.size', return_value=(1920, 1080)), \
             patch('pyautogui.click', side_effect=Exception("Click failed")):
            
            result = await service.click_at_coordinates(
                x=500,
                y=300,
                button="left",
                click_type="single"
            )
            
            assert result["success"] is False
            assert result["clicked"] is False
            assert "error" in result
            assert "Click failed" in result["error"]
    
    @pytest.mark.asyncio
    async def test_perform_click_success(self, service):
        """Test perform_click method (convenience wrapper)"""
        with patch('pyautogui.size', return_value=(1920, 1080)), \
             patch('pyautogui.click') as mock_click:
            
            result = await service.perform_click({
                "x": 600,
                "y": 400,
                "button": "left",
                "click_type": "single",
                "delay": 0.2
            })
            
            assert result["success"] is True
            assert result["coordinates"]["x"] == 600
            assert result["coordinates"]["y"] == 400
            
            mock_click.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_validate_target_valid(self, service):
        """Test validating click target"""
        with patch('pyautogui.size', return_value=(1920, 1080)):
            
            result = await service.validate_target(500, 300)
            
            assert result["valid"] is True
            assert result["coordinates"]["x"] == 500
            assert result["coordinates"]["y"] == 300
            assert result["screen_bounds"]["width"] == 1920
            assert result["screen_bounds"]["height"] == 1080
    
    @pytest.mark.asyncio
    async def test_validate_target_invalid(self, service):
        """Test validating invalid click target"""
        with patch('pyautogui.size', return_value=(1920, 1080)):
            
            result = await service.validate_target(2000, 1500)
            
            assert result["valid"] is False
            assert result["coordinates"]["x"] == 2000
            assert result["coordinates"]["y"] == 1500
            assert "reason" in result
    
    def test_click_history_tracking(self, service):
        """Test that click history is tracked"""
        initial_count = len(service.click_history)
        
        # Add click to history
        service._add_to_history(500, 300, "left", "single", True, 0.05)
        
        assert len(service.click_history) == initial_count + 1
        
        latest_click = service.click_history[-1]
        assert latest_click["x"] == 500
        assert latest_click["y"] == 300
        assert latest_click["button"] == "left"
        assert latest_click["click_type"] == "single"
        assert latest_click["success"] is True
        assert latest_click["execution_time"] == 0.05
        assert "timestamp" in latest_click
    
    def test_click_history_limit(self, service):
        """Test that click history respects size limit"""
        # Set small history limit for testing
        original_limit = service.max_history_size
        service.max_history_size = 3
        
        try:
            # Add more clicks than the limit
            for i in range(5):
                service._add_to_history(i*100, i*100, "left", "single", True, 0.05)
            
            # Should only keep the most recent clicks
            assert len(service.click_history) == 3
            
            # Check that latest clicks are preserved
            for i, click in enumerate(service.click_history):
                expected_x = (i + 2) * 100  # Should be clicks 2, 3, 4
                assert click["x"] == expected_x
        
        finally:
            service.max_history_size = original_limit
    
    @pytest.mark.asyncio
    async def test_get_click_history(self, service):
        """Test getting click history"""
        # Add some clicks to history
        service._add_to_history(100, 200, "left", "single", True, 0.05)
        service._add_to_history(300, 400, "right", "double", True, 0.08)
        
        history = await service.get_click_history()
        
        assert len(history) >= 2
        assert isinstance(history, list)
        
        # Check recent clicks are in history
        recent_clicks = history[-2:]
        assert recent_clicks[0]["x"] == 100
        assert recent_clicks[1]["x"] == 300
    
    @pytest.mark.asyncio
    async def test_get_click_statistics(self, service):
        """Test getting click statistics"""
        # Add some clicks to history
        service._add_to_history(100, 200, "left", "single", True, 0.05)
        service._add_to_history(300, 400, "left", "double", True, 0.08)
        service._add_to_history(500, 600, "right", "single", False, 0.0)  # Failed click
        
        stats = await service.get_click_statistics()
        
        assert "total_clicks" in stats
        assert "successful_clicks" in stats
        assert "failed_clicks" in stats
        assert "success_rate" in stats
        assert "average_execution_time" in stats
        assert "click_types_used" in stats
        assert "buttons_used" in stats
        
        assert stats["total_clicks"] >= 3
        assert stats["successful_clicks"] >= 2
        assert stats["failed_clicks"] >= 1
    
    @pytest.mark.asyncio
    async def test_concurrent_clicks(self, service):
        """Test multiple concurrent click operations"""
        with patch('pyautogui.size', return_value=(1920, 1080)), \
             patch('pyautogui.click') as mock_click:
            
            # Start multiple concurrent clicks
            tasks = []
            coordinates = [(100, 100), (200, 200), (300, 300)]
            
            for x, y in coordinates:
                task = service.click_at_coordinates(x, y, "left", "single")
                tasks.append(task)
            
            results = await asyncio.gather(*tasks)
            
            # Check all clicks succeeded
            assert len(results) == 3
            for i, result in enumerate(results):
                assert result["success"] is True
                assert result["coordinates"]["x"] == coordinates[i][0]
                assert result["coordinates"]["y"] == coordinates[i][1]
            
            # Check PyAutoGUI was called for each click
            assert mock_click.call_count == 3
    
    @pytest.mark.asyncio
    async def test_performance_timing(self, service):
        """Test that execution time is measured"""
        with patch('pyautogui.size', return_value=(1920, 1080)), \
             patch('pyautogui.click'), \
             patch('time.time', side_effect=[1000.0, 1000.05]):  # Mock 0.05 second execution
            
            result = await service.click_at_coordinates(500, 300, "left", "single")
            
            assert result["success"] is True
            assert "execution_time" in result
            assert result["execution_time"] == 0.05
    
    @pytest.mark.asyncio
    async def test_screen_bounds_caching(self, service):
        """Test that screen bounds are cached for performance"""
        with patch('pyautogui.size', return_value=(1920, 1080)) as mock_size:
            
            # Call multiple times
            await service.get_screen_bounds()
            await service.get_screen_bounds()
            await service.validate_coordinates(500, 300)
            
            # Should only call pyautogui.size() once due to caching
            assert mock_size.call_count <= 2  # Allow for some flexibility

if __name__ == "__main__":
    pytest.main([__file__]) 