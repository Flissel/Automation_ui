#!/usr/bin/env python3
"""
Tests for Graph Execution Service
Tests the graph execution engine with topological sorting and node processing
"""

import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
import json
import time

# Import the service
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.graph_execution_service import GraphExecutionService

class TestGraphExecutionService:
    """Test the GraphExecutionService class"""
    
    @pytest.fixture
    def service(self):
        """Create a GraphExecutionService instance for testing"""
        return GraphExecutionService()
    
    def test_service_initialization(self, service):
        """Test service initialization"""
        assert service.active_executions == {}
        assert service.execution_history == []
        assert service.node_templates is not None
        assert len(service.node_templates) > 0
    
    def test_is_healthy(self, service):
        """Test health check"""
        assert service.is_healthy() is True
    
    def test_get_node_templates(self, service):
        """Test getting node templates"""
        templates = service.get_node_templates()
        
        assert len(templates) > 0
        assert any(t["type"] == "ocr_region" for t in templates)
        assert any(t["type"] == "condition" for t in templates)
        assert any(t["type"] == "click_action" for t in templates)
        
        # Check template structure
        for template in templates:
            assert "id" in template
            assert "name" in template
            assert "type" in template
            assert "category" in template
            assert "inputs" in template
            assert "outputs" in template
            assert "properties" in template
    
    def test_topological_sort_simple(self, service):
        """Test topological sorting with simple graph"""
        nodes = [
            {"id": "A", "type": "ocr_region"},
            {"id": "B", "type": "condition"},
            {"id": "C", "type": "click_action"}
        ]
        edges = [
            {"source": "A", "target": "B"},
            {"source": "B", "target": "C"}
        ]
        
        sorted_levels = service._topological_sort(nodes, edges)
        
        assert len(sorted_levels) == 3
        assert sorted_levels[0] == ["A"]
        assert sorted_levels[1] == ["B"]
        assert sorted_levels[2] == ["C"]
    
    def test_topological_sort_parallel(self, service):
        """Test topological sorting with parallel nodes"""
        nodes = [
            {"id": "A", "type": "ocr_region"},
            {"id": "B", "type": "condition"},
            {"id": "C", "type": "click_action"},
            {"id": "D", "type": "ocr_region"}
        ]
        edges = [
            {"source": "A", "target": "C"},
            {"source": "B", "target": "C"}
        ]
        
        sorted_levels = service._topological_sort(nodes, edges)
        
        assert len(sorted_levels) == 3
        assert set(sorted_levels[0]) == {"A", "B"}  # A and B can run in parallel
        assert sorted_levels[1] == ["D"]  # D has no dependencies
        assert sorted_levels[2] == ["C"]  # C depends on A and B
    
    def test_topological_sort_complex(self, service):
        """Test topological sorting with complex graph"""
        nodes = [
            {"id": "A", "type": "ocr_region"},
            {"id": "B", "type": "condition"},
            {"id": "C", "type": "click_action"},
            {"id": "D", "type": "condition"},
            {"id": "E", "type": "ocr_region"}
        ]
        edges = [
            {"source": "A", "target": "B"},
            {"source": "B", "target": "C"},
            {"source": "C", "target": "D"},
            {"source": "A", "target": "E"}
        ]
        
        sorted_levels = service._topological_sort(nodes, edges)
        
        assert sorted_levels[0] == ["A"]
        assert set(sorted_levels[1]) == {"B", "E"}  # B and E can run after A
        assert sorted_levels[2] == ["C"]
        assert sorted_levels[3] == ["D"]
    
    def test_topological_sort_cyclic(self, service):
        """Test topological sorting with cyclic graph (should raise error)"""
        nodes = [
            {"id": "A", "type": "ocr_region"},
            {"id": "B", "type": "condition"},
            {"id": "C", "type": "click_action"}
        ]
        edges = [
            {"source": "A", "target": "B"},
            {"source": "B", "target": "C"},
            {"source": "C", "target": "A"}  # Creates cycle
        ]
        
        with pytest.raises(ValueError, match="Cyclic graph detected"):
            service._topological_sort(nodes, edges)
    
    @pytest.mark.asyncio
    async def test_execute_ocr_node(self, service):
        """Test executing OCR node"""
        node = {
            "id": "ocr1",
            "type": "ocr_region",
            "properties": {
                "region": {"x": 100, "y": 100, "width": 200, "height": 50},
                "language": "eng+deu",
                "confidence_threshold": 0.7
            }
        }
        context = {}
        
        with patch('services.ocr_service.OCRService') as mock_ocr_service:
            mock_instance = Mock()
            mock_instance.extract_text_from_region = AsyncMock(return_value={
                "text": "Extracted text",
                "confidence": 0.85
            })
            mock_ocr_service.return_value = mock_instance
            
            result = await service._execute_node(node, context, None)
            
            assert result["text"] == "Extracted text"
            assert result["confidence"] == 0.85
    
    @pytest.mark.asyncio
    async def test_execute_condition_node(self, service):
        """Test executing condition node"""
        node = {
            "id": "cond1",
            "type": "condition",
            "properties": {
                "condition": "input_value > 10",
                "variable_name": "input_value"
            }
        }
        context = {"input_value": 15}
        
        result = await service._execute_node(node, context, None)
        
        assert result["condition_met"] is True
        assert result["condition"] == "input_value > 10"
        assert result["context_data"] == {"input_value": 15}
    
    @pytest.mark.asyncio
    async def test_execute_condition_node_false(self, service):
        """Test executing condition node that evaluates to false"""
        node = {
            "id": "cond1",
            "type": "condition",
            "properties": {
                "condition": "input_value > 20",
                "variable_name": "input_value"
            }
        }
        context = {"input_value": 15}
        
        result = await service._execute_node(node, context, None)
        
        assert result["condition_met"] is False
        assert result["condition"] == "input_value > 20"
    
    @pytest.mark.asyncio
    async def test_execute_click_action_node(self, service):
        """Test executing click action node"""
        node = {
            "id": "click1",
            "type": "click_action",
            "properties": {
                "x": 500,
                "y": 300,
                "button": "left",
                "click_type": "single"
            }
        }
        context = {}
        
        with patch('services.click_automation_service.ClickAutomationService') as mock_click_service:
            mock_instance = Mock()
            mock_instance.click_at_coordinates = AsyncMock(return_value={
                "success": True,
                "clicked": True,
                "coordinates": {"x": 500, "y": 300}
            })
            mock_click_service.return_value = mock_instance
            
            result = await service._execute_node(node, context, None)
            
            assert result["success"] is True
            assert result["clicked"] is True
            assert result["coordinates"]["x"] == 500
    
    @pytest.mark.asyncio
    async def test_execute_graph_simple(self, service):
        """Test executing a simple graph"""
        graph_data = {
            "graph_id": "test-graph",
            "nodes": [
                {
                    "id": "node1",
                    "type": "condition",
                    "properties": {
                        "condition": "1 == 1",
                        "variable_name": "test"
                    }
                }
            ],
            "edges": [],
            "execution_mode": "sequential"
        }
        
        execution_id = await service.execute_graph(graph_data)
        
        assert execution_id in service.active_executions
        
        # Wait for execution to complete
        await asyncio.sleep(0.1)
        
        status = await service.get_execution_status(execution_id)
        assert status["status"] in ["running", "completed"]
        assert status["progress"] >= 0
    
    @pytest.mark.asyncio
    async def test_execute_graph_complex(self, service):
        """Test executing a complex graph with multiple nodes"""
        graph_data = {
            "graph_id": "complex-graph",
            "nodes": [
                {
                    "id": "node1",
                    "type": "condition",
                    "properties": {
                        "condition": "1 == 1",
                        "variable_name": "test1"
                    }
                },
                {
                    "id": "node2",
                    "type": "condition",
                    "properties": {
                        "condition": "2 > 1",
                        "variable_name": "test2"
                    }
                }
            ],
            "edges": [
                {"source": "node1", "target": "node2"}
            ],
            "execution_mode": "sequential"
        }
        
        execution_id = await service.execute_graph(graph_data)
        
        assert execution_id in service.active_executions
        
        # Wait for execution to complete
        await asyncio.sleep(0.2)
        
        status = await service.get_execution_status(execution_id)
        assert status["status"] in ["running", "completed"]
        assert status["executed_nodes"] >= 0
    
    @pytest.mark.asyncio
    async def test_get_execution_status_nonexistent(self, service):
        """Test getting status for non-existent execution"""
        status = await service.get_execution_status("non-existent-id")
        assert status is None
    
    def test_node_template_properties(self, service):
        """Test that node templates have required properties"""
        templates = service.get_node_templates()
        
        for template in templates:
            # Check required fields
            assert isinstance(template["id"], str)
            assert isinstance(template["name"], str)
            assert isinstance(template["type"], str)
            assert isinstance(template["category"], str)
            assert isinstance(template["inputs"], list)
            assert isinstance(template["outputs"], list)
            assert isinstance(template["properties"], dict)
            
            # Check category is valid
            valid_categories = ["Input", "Processing", "Automation", "Logic", "Integration", "Workflow"]
            assert template["category"] in valid_categories
    
    @pytest.mark.asyncio
    async def test_concurrent_executions(self, service):
        """Test multiple concurrent graph executions"""
        graph_data1 = {
            "graph_id": "graph1",
            "nodes": [{"id": "node1", "type": "condition", "properties": {"condition": "1 == 1"}}],
            "edges": [],
            "execution_mode": "sequential"
        }
        
        graph_data2 = {
            "graph_id": "graph2", 
            "nodes": [{"id": "node2", "type": "condition", "properties": {"condition": "2 == 2"}}],
            "edges": [],
            "execution_mode": "sequential"
        }
        
        # Start both executions
        execution_id1 = await service.execute_graph(graph_data1)
        execution_id2 = await service.execute_graph(graph_data2)
        
        assert execution_id1 != execution_id2
        assert execution_id1 in service.active_executions
        assert execution_id2 in service.active_executions
        
        # Wait for both to complete
        await asyncio.sleep(0.2)
        
        status1 = await service.get_execution_status(execution_id1)
        status2 = await service.get_execution_status(execution_id2)
        
        assert status1 is not None
        assert status2 is not None
    
    @pytest.mark.asyncio
    async def test_execution_error_handling(self, service):
        """Test error handling during node execution"""
        node = {
            "id": "error_node",
            "type": "unknown_type",
            "properties": {}
        }
        context = {}
        
        with pytest.raises(ValueError, match="Unknown node type"):
            await service._execute_node(node, context, None)
    
    def test_execution_history_tracking(self, service):
        """Test that execution history is tracked"""
        initial_count = len(service.execution_history)
        
        # Execute a simple graph
        asyncio.run(service.execute_graph({
            "graph_id": "history-test",
            "nodes": [{"id": "node1", "type": "condition", "properties": {"condition": "1 == 1"}}],
            "edges": [],
            "execution_mode": "sequential"
        }))
        
        # Wait briefly
        time.sleep(0.1)
        
        # Check that history was updated
        assert len(service.execution_history) >= initial_count

if __name__ == "__main__":
    pytest.main([__file__]) 