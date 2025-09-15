#!/usr/bin/env python3
"""
Pytest configuration and shared fixtures for TRAE backend tests
"""

import pytest
import asyncio
import sys
import os
from unittest.mock import Mock, patch

# Add backend to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
def mock_pyautogui():
    """Mock PyAutoGUI for testing without actual mouse/keyboard interaction"""
    with patch('pyautogui.size', return_value=(1920, 1080)), \
         patch('pyautogui.click') as mock_click, \
         patch('pyautogui.screenshot') as mock_screenshot:
        
        # Set up default screenshot mock
        from PIL import Image
        mock_screenshot.return_value = Image.new('RGB', (1920, 1080), color='white')
        
        yield {
            'click': mock_click,
            'screenshot': mock_screenshot
        }

@pytest.fixture
def mock_tesseract():
    """Mock Tesseract OCR for testing without actual OCR dependencies"""
    with patch('pytesseract.image_to_data') as mock_ocr, \
         patch('pytesseract.get_tesseract_version', return_value="5.0.0"):
        
        # Default OCR response
        mock_ocr.return_value = {
            'text': ['', 'Sample', 'Text', ''],
            'conf': ['-1', '85', '90', '-1']
        }
        
        yield mock_ocr

@pytest.fixture
def mock_watchdog():
    """Mock watchdog file system monitoring"""
    with patch('watchdog.observers.Observer') as mock_observer, \
         patch('watchdog.events.FileSystemEventHandler'):
        
        mock_observer_instance = Mock()
        mock_observer_instance.start = Mock()
        mock_observer_instance.stop = Mock()
        mock_observer_instance.join = Mock()
        mock_observer.return_value = mock_observer_instance
        
        yield mock_observer_instance

@pytest.fixture
def sample_graph_data():
    """Sample graph data for testing"""
    return {
        "graph_id": "test-graph-123",
        "nodes": [
            {
                "id": "node1",
                "type": "ocr_region",
                "properties": {
                    "region": {"x": 100, "y": 100, "width": 200, "height": 50},
                    "language": "eng",
                    "confidence_threshold": 0.7
                }
            },
            {
                "id": "node2",
                "type": "condition",
                "properties": {
                    "condition": "extracted_text != ''",
                    "variable_name": "extracted_text"
                }
            },
            {
                "id": "node3",
                "type": "click_action",
                "properties": {
                    "x": 500,
                    "y": 300,
                    "button": "left",
                    "click_type": "single"
                }
            }
        ],
        "edges": [
            {"source": "node1", "target": "node2"},
            {"source": "node2", "target": "node3"}
        ],
        "execution_mode": "sequential"
    }

@pytest.fixture
def sample_ocr_data():
    """Sample OCR request data for testing"""
    import base64
    from PIL import Image
    import io
    
    # Create a simple test image
    img = Image.new('RGB', (200, 100), color='white')
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    img_data = buffer.getvalue()
    img_base64 = base64.b64encode(img_data).decode('utf-8')
    
    return {
        "image_data": img_base64,
        "region": {"x": 10, "y": 10, "width": 180, "height": 80},
        "language": "eng+deu",
        "confidence_threshold": 0.7
    }

@pytest.fixture
def temp_test_file():
    """Create a temporary test file"""
    import tempfile
    import os
    
    with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as f:
        f.write("Test file content\nLine 2\nLine 3")
        temp_path = f.name
    
    yield temp_path
    
    # Cleanup
    try:
        os.unlink(temp_path)
    except:
        pass

@pytest.fixture
def mock_websocket():
    """Mock WebSocket connection for testing"""
    from unittest.mock import AsyncMock
    
    mock_ws = Mock()
    mock_ws.send = AsyncMock()
    mock_ws.receive = AsyncMock()
    mock_ws.close = AsyncMock()
    mock_ws.client_state = Mock()
    mock_ws.client_state.CONNECTED = 1
    mock_ws.client_state.DISCONNECTED = 3
    
    return mock_ws

# Pytest configuration
def pytest_configure(config):
    """Configure pytest with custom markers"""
    config.addinivalue_line("markers", "slow: marks tests as slow")
    config.addinivalue_line("markers", "integration: marks tests as integration tests")
    config.addinivalue_line("markers", "unit: marks tests as unit tests")
    config.addinivalue_line("markers", "service: marks tests as service tests")

def pytest_collection_modifyitems(config, items):
    """Modify test collection to add markers automatically"""
    for item in items:
        # Mark async tests
        if asyncio.iscoroutinefunction(item.function):
            item.add_marker(pytest.mark.asyncio)
        
        # Mark service tests
        if "service" in item.nodeid:
            item.add_marker(pytest.mark.service)
        
        # Mark integration tests
        if "integration" in item.nodeid or "test_backend_server" in item.nodeid:
            item.add_marker(pytest.mark.integration)
        else:
            item.add_marker(pytest.mark.unit)

# Test utilities
class TestUtils:
    """Utility functions for tests"""
    
    @staticmethod
    def create_mock_image(width=800, height=600, color='white'):
        """Create a mock PIL Image for testing"""
        from PIL import Image
        return Image.new('RGB', (width, height), color=color)
    
    @staticmethod
    def image_to_base64(image):
        """Convert PIL Image to base64 string"""
        import base64
        import io
        
        buffer = io.BytesIO()
        image.save(buffer, format='PNG')
        buffer.seek(0)
        img_data = buffer.getvalue()
        return base64.b64encode(img_data).decode('utf-8')
    
    @staticmethod
    async def wait_for_condition(condition_func, timeout=1.0, interval=0.01):
        """Wait for a condition to become true"""
        import time
        
        start_time = time.time()
        while time.time() - start_time < timeout:
            if condition_func():
                return True
            await asyncio.sleep(interval)
        return False

@pytest.fixture
def test_utils():
    """Provide test utilities"""
    return TestUtils 