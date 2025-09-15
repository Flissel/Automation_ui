#!/usr/bin/env python3
"""
Tests for TRAE Backend Server
Tests all API endpoints and main server functionality
"""

import pytest
import asyncio
import json
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, AsyncMock

# Import the app
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Global test client - will be created in conftest.py or test setup
client = None

def setup_module():
    """Setup module by importing the app and creating test client"""
    global client
    try:
        from app.main import create_app
        app = create_app()
        client = TestClient(app)
    except Exception as e:
        pytest.skip(f"Could not import backend server: {e}")

class TestHealthEndpoint:
    """Test health check endpoint"""
    
    def test_health_check_success(self):
        """Test successful health check"""
        with patch('trae_backend_server.graph_execution_service') as mock_graph, \
             patch('trae_backend_server.live_desktop_service') as mock_desktop, \
             patch('trae_backend_server.ocr_service') as mock_ocr, \
             patch('trae_backend_server.file_watcher_service') as mock_file, \
             patch('trae_backend_server.click_automation_service') as mock_click, \
             patch('trae_backend_server.websocket_service') as mock_ws:
            
            # Mock all services as healthy
            mock_graph.is_healthy.return_value = True
            mock_desktop.is_healthy.return_value = True
            mock_ocr.is_healthy.return_value = True
            mock_file.is_healthy.return_value = True
            mock_click.is_healthy.return_value = True
            mock_ws.is_healthy.return_value = True
            
            response = client.get("/api/health")
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"
            assert data["version"] == "1.0.0"
            assert "services" in data
            assert all(data["services"].values())
    
    def test_health_check_degraded(self):
        """Test degraded health check when some services are down"""
        with patch('trae_backend_server.graph_execution_service') as mock_graph, \
             patch('trae_backend_server.live_desktop_service') as mock_desktop, \
             patch('trae_backend_server.ocr_service') as mock_ocr, \
             patch('trae_backend_server.file_watcher_service') as mock_file, \
             patch('trae_backend_server.click_automation_service') as mock_click, \
             patch('trae_backend_server.websocket_service') as mock_ws:
            
            # Mock some services as unhealthy
            mock_graph.is_healthy.return_value = True
            mock_desktop.is_healthy.return_value = False
            mock_ocr.is_healthy.return_value = False
            mock_file.is_healthy.return_value = True
            mock_click.is_healthy.return_value = False
            mock_ws.is_healthy.return_value = True
            
            response = client.get("/api/health")
            
            assert response.status_code == 503
            data = response.json()
            assert data["status"] == "degraded"
            assert not all(data["services"].values())

class TestNodeSystemEndpoints:
    """Test node system API endpoints"""
    
    def test_get_node_templates(self):
        """Test getting node templates"""
        with patch('trae_backend_server.graph_execution_service') as mock_service:
            mock_templates = [
                {
                    "id": "ocr_region",
                    "name": "OCR Region",
                    "type": "ocr_region",
                    "category": "Processing"
                },
                {
                    "id": "condition",
                    "name": "Condition", 
                    "type": "condition",
                    "category": "Logic"
                }
            ]
            mock_service.get_node_templates.return_value = mock_templates
            
            response = client.get("/api/node-system/templates")
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert len(data["templates"]) == 2
            assert data["total_count"] == 2
            assert "categories" in data
    
    def test_execute_graph(self):
        """Test graph execution endpoint"""
        graph_data = {
            "graph_id": "test-graph-123",
            "nodes": [
                {"id": "node1", "type": "ocr_region"},
                {"id": "node2", "type": "condition"}
            ],
            "edges": [
                {"source": "node1", "target": "node2"}
            ],
            "execution_mode": "sequential"
        }
        
        response = client.post("/api/node-system/graphs/execute", json=graph_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "execution_id" in data
        assert data["status"] == "started"
    
    def test_get_execution_status(self):
        """Test getting execution status"""
        execution_id = "test-execution-123"
        
        with patch('trae_backend_server.graph_execution_service') as mock_service:
            mock_status = {
                "execution_id": execution_id,
                "status": "completed",
                "progress": 1.0,
                "executed_nodes": 2,
                "failed_nodes": 0
            }
            mock_service.get_execution_status = AsyncMock(return_value=mock_status)
            
            response = client.get(f"/api/node-system/executions/{execution_id}")
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["execution"]["execution_id"] == execution_id
    
    def test_get_execution_status_not_found(self):
        """Test getting status for non-existent execution"""
        execution_id = "non-existent"
        
        with patch('trae_backend_server.graph_execution_service') as mock_service:
            mock_service.get_execution_status = AsyncMock(return_value=None)
            
            response = client.get(f"/api/node-system/executions/{execution_id}")
            
            assert response.status_code == 404

class TestOCREndpoints:
    """Test OCR API endpoints"""
    
    def test_extract_ocr_region(self):
        """Test OCR region extraction"""
        ocr_data = {
            "image_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
            "region": {"x": 100, "y": 100, "width": 200, "height": 50},
            "language": "eng+deu",
            "confidence_threshold": 0.7
        }
        
        with patch('trae_backend_server.ocr_service') as mock_service:
            mock_result = {
                "text": "Sample extracted text",
                "confidence": 0.95,
                "bounding_box": ocr_data["region"],
                "language": "eng+deu"
            }
            mock_service.process_region = AsyncMock(return_value=mock_result)
            
            response = client.post("/api/ocr/extract-region", json=ocr_data)
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["result"]["text"] == "Sample extracted text"
            assert data["result"]["confidence"] == 0.95
    
    def test_test_ocr_region(self):
        """Test OCR region testing endpoint"""
        test_data = {
            "x": 100,
            "y": 100,
            "width": 200,
            "height": 50,
            "language": "eng+deu",
            "confidence_threshold": 0.7
        }
        
        with patch('trae_backend_server.ocr_service') as mock_service:
            mock_result = {
                "text": "Test text from screen",
                "confidence": 0.88,
                "metadata": {"processing_time": 0.5}
            }
            mock_service.test_region = AsyncMock(return_value=mock_result)
            
            response = client.post("/api/ocr/test-region", json=test_data)
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["extracted_text"] == "Test text from screen"
            assert data["confidence"] == 0.88

class TestLiveDesktopEndpoints:
    """Test live desktop API endpoints"""
    
    def test_get_live_desktop_status(self):
        """Test getting live desktop status"""
        with patch('trae_backend_server.live_desktop_service') as mock_service:
            mock_status = {
                "streaming": True,
                "client_count": 2,
                "fps": 10,
                "quality": 80
            }
            mock_service.get_status = AsyncMock(return_value=mock_status)
            
            response = client.get("/api/live-desktop/status")
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["streaming"] is True
            assert data["clients"] == 2
            assert data["fps"] == 10
    
    def test_configure_live_desktop(self):
        """Test configuring live desktop"""
        config_data = {
            "fps": 15,
            "quality": 90,
            "scale_factor": 0.8
        }
        
        with patch('trae_backend_server.live_desktop_service') as mock_service:
            mock_service.update_config = AsyncMock()
            
            response = client.post("/api/live-desktop/configure", json=config_data)
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["message"] == "Live desktop configured successfully"
            assert data["config"] == config_data

class TestClickAutomationEndpoints:
    """Test click automation API endpoints"""
    
    def test_execute_click(self):
        """Test executing automated click"""
        click_data = {
            "x": 500,
            "y": 300,
            "button": "left",
            "click_type": "single",
            "delay": 0.1
        }
        
        with patch('trae_backend_server.click_automation_service') as mock_service:
            mock_result = {
                "success": True,
                "clicked": True,
                "coordinates": {"x": 500, "y": 300},
                "execution_time": 0.05
            }
            mock_service.perform_click = AsyncMock(return_value=mock_result)
            
            response = client.post("/api/automation/click", json=click_data)
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["clicked"] is True
            assert data["coordinates"]["x"] == 500
    
    def test_validate_click_target(self):
        """Test validating click target coordinates"""
        coordinates = {"x": 500, "y": 300}
        
        with patch('trae_backend_server.click_automation_service') as mock_service:
            mock_result = {
                "valid": True,
                "coordinates": coordinates,
                "screen_bounds": {"width": 1920, "height": 1080}
            }
            mock_service.validate_target = AsyncMock(return_value=mock_result)
            
            response = client.post("/api/automation/validate-click", json=coordinates)
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["valid"] is True
            assert data["coordinates"] == coordinates

class TestFileSystemEndpoints:
    """Test file system API endpoints"""
    
    def test_start_file_watcher(self):
        """Test starting file watcher"""
        watcher_data = {
            "path": "C:\\temp",
            "event_types": ["created", "modified"],
            "file_patterns": ["*"],
            "recursive": True
        }
        
        with patch('trae_backend_server.file_watcher_service') as mock_service:
            mock_watcher_id = "watcher_123456789"
            mock_service.start_watching = AsyncMock(return_value=mock_watcher_id)
            
            response = client.post("/api/filesystem/watch", json=watcher_data)
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["watcher_id"] == mock_watcher_id
            assert data["path"] == "C:\\temp"
    
    def test_stop_file_watcher(self):
        """Test stopping file watcher"""
        stop_data = {"watcher_id": "watcher_123456789"}
        
        with patch('trae_backend_server.file_watcher_service') as mock_service:
            mock_service.stop_watching = AsyncMock(return_value=True)
            
            response = client.post("/api/filesystem/stop-watch", json=stop_data)
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["watcher_id"] == "watcher_123456789"
    
    def test_list_file_watchers(self):
        """Test listing active file watchers"""
        with patch('trae_backend_server.file_watcher_service') as mock_service:
            mock_watchers = [
                {
                    "id": "watcher_123",
                    "path": "C:\\temp",
                    "event_types": ["created", "modified"],
                    "uptime": 300.5,
                    "event_count": 5
                }
            ]
            mock_service.list_watchers = AsyncMock(return_value=mock_watchers)
            
            response = client.get("/api/filesystem/watchers")
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert len(data["watchers"]) == 1
            assert data["total_count"] == 1

class TestErrorHandling:
    """Test error handling in API endpoints"""
    
    def test_ocr_extraction_error(self):
        """Test OCR extraction error handling"""
        ocr_data = {
            "image_data": "invalid_image_data",
            "region": {"x": 100, "y": 100, "width": 200, "height": 50}
        }
        
        with patch('trae_backend_server.ocr_service') as mock_service:
            mock_service.process_region = AsyncMock(side_effect=Exception("OCR processing failed"))
            
            response = client.post("/api/ocr/extract-region", json=ocr_data)
            
            assert response.status_code == 500
    
    def test_file_watcher_missing_id(self):
        """Test file watcher stop without watcher_id"""
        response = client.post("/api/filesystem/stop-watch", json={})
        
        assert response.status_code == 400
    
    def test_click_automation_error(self):
        """Test click automation error handling"""
        click_data = {
            "x": 500,
            "y": 300,
            "button": "left"
        }
        
        with patch('trae_backend_server.click_automation_service') as mock_service:
            mock_service.perform_click = AsyncMock(side_effect=Exception("Click failed"))
            
            response = client.post("/api/automation/click", json=click_data)
            
            assert response.status_code == 500

# Test configuration
@pytest.fixture
def mock_services():
    """Fixture to mock all backend services"""
    with patch('trae_backend_server.graph_execution_service') as mock_graph, \
         patch('trae_backend_server.live_desktop_service') as mock_desktop, \
         patch('trae_backend_server.ocr_service') as mock_ocr, \
         patch('trae_backend_server.file_watcher_service') as mock_file, \
         patch('trae_backend_server.click_automation_service') as mock_click, \
         patch('trae_backend_server.websocket_service') as mock_ws:
        
        yield {
            'graph': mock_graph,
            'desktop': mock_desktop,
            'ocr': mock_ocr,
            'file': mock_file,
            'click': mock_click,
            'websocket': mock_ws
        }

if __name__ == "__main__":
    pytest.main([__file__]) 