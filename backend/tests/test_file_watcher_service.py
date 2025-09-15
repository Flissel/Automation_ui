#!/usr/bin/env python3
"""
Tests for File Watcher Service
Tests file system monitoring and event detection capabilities
"""

import pytest
import asyncio
import tempfile
import os
import time
from unittest.mock import Mock, patch, AsyncMock
from pathlib import Path

# Import the service
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.file_watcher_service import FileWatcherService

class TestFileWatcherService:
    """Test the FileWatcherService class"""
    
    @pytest.fixture
    def service(self):
        """Create a FileWatcherService instance for testing"""
        return FileWatcherService()
    
    @pytest.fixture
    def temp_dir(self):
        """Create a temporary directory for testing"""
        with tempfile.TemporaryDirectory() as temp_dir:
            yield temp_dir
    
    def test_service_initialization(self, service):
        """Test service initialization"""
        assert service.active_watchers == {}
        assert service.event_history == []
        assert service.supported_events == ["created", "modified", "deleted", "moved"]
    
    def test_is_healthy(self, service):
        """Test health check"""
        assert service.is_healthy() is True
    
    def test_get_supported_events(self, service):
        """Test getting supported event types"""
        events = service.get_supported_events()
        
        assert isinstance(events, list)
        assert "created" in events
        assert "modified" in events
        assert "deleted" in events
        assert "moved" in events
    
    @pytest.mark.asyncio
    async def test_start_watching_basic(self, service, temp_dir):
        """Test starting basic file watcher"""
        watcher_id = await service.start_watching(
            path=temp_dir,
            event_types=["created", "modified"],
            file_patterns=["*"],
            recursive=True
        )
        
        assert watcher_id is not None
        assert watcher_id in service.active_watchers
        
        watcher_info = service.active_watchers[watcher_id]
        assert watcher_info["path"] == temp_dir
        assert watcher_info["event_types"] == ["created", "modified"]
        assert watcher_info["file_patterns"] == ["*"]
        assert watcher_info["recursive"] is True
        assert watcher_info["status"] == "active"
    
    @pytest.mark.asyncio
    async def test_start_watching_invalid_path(self, service):
        """Test starting watcher with invalid path"""
        invalid_path = "/nonexistent/path/that/does/not/exist"
        
        with pytest.raises(ValueError, match="Path does not exist"):
            await service.start_watching(
                path=invalid_path,
                event_types=["created"],
                file_patterns=["*"]
            )
    
    @pytest.mark.asyncio
    async def test_start_watching_invalid_events(self, service, temp_dir):
        """Test starting watcher with invalid event types"""
        with pytest.raises(ValueError, match="Invalid event types"):
            await service.start_watching(
                path=temp_dir,
                event_types=["invalid_event"],
                file_patterns=["*"]
            )
    
    @pytest.mark.asyncio
    async def test_stop_watching_existing(self, service, temp_dir):
        """Test stopping an existing watcher"""
        watcher_id = await service.start_watching(
            path=temp_dir,
            event_types=["created"],
            file_patterns=["*"]
        )
        
        result = await service.stop_watching(watcher_id)
        
        assert result is True
        assert watcher_id not in service.active_watchers
    
    @pytest.mark.asyncio
    async def test_stop_watching_nonexistent(self, service):
        """Test stopping a non-existent watcher"""
        result = await service.stop_watching("nonexistent_watcher_id")
        
        assert result is False
    
    @pytest.mark.asyncio
    async def test_list_watchers_empty(self, service):
        """Test listing watchers when none are active"""
        watchers = await service.list_watchers()
        
        assert isinstance(watchers, list)
        assert len(watchers) == 0
    
    @pytest.mark.asyncio
    async def test_list_watchers_with_active(self, service, temp_dir):
        """Test listing watchers with active watchers"""
        watcher_id = await service.start_watching(
            path=temp_dir,
            event_types=["created", "modified"],
            file_patterns=["*.txt"],
            recursive=False
        )
        
        watchers = await service.list_watchers()
        
        assert len(watchers) == 1
        watcher = watchers[0]
        assert watcher["id"] == watcher_id
        assert watcher["path"] == temp_dir
        assert watcher["event_types"] == ["created", "modified"]
        assert watcher["file_patterns"] == ["*.txt"]
        assert watcher["recursive"] is False
        assert "uptime" in watcher
        assert "event_count" in watcher
    
    def test_matches_pattern_simple(self, service):
        """Test pattern matching with simple patterns"""
        assert service._matches_pattern("test.txt", ["*.txt"]) is True
        assert service._matches_pattern("test.py", ["*.txt"]) is False
        assert service._matches_pattern("document.doc", ["*.doc", "*.txt"]) is True
    
    def test_matches_pattern_wildcard(self, service):
        """Test pattern matching with wildcard"""
        assert service._matches_pattern("anyfile.ext", ["*"]) is True
        assert service._matches_pattern("nested/path/file.txt", ["*"]) is True
    
    def test_matches_pattern_specific(self, service):
        """Test pattern matching with specific patterns"""
        assert service._matches_pattern("config.json", ["config.*"]) is True
        assert service._matches_pattern("backup.json", ["config.*"]) is False
        assert service._matches_pattern("test_file.py", ["test_*.py"]) is True
    
    def test_should_process_event_valid(self, service):
        """Test event processing validation"""
        watcher_config = {
            "event_types": ["created", "modified"],
            "file_patterns": ["*.txt"],
            "recursive": True
        }
        
        # Valid events
        assert service._should_process_event("created", "test.txt", watcher_config) is True
        assert service._should_process_event("modified", "document.txt", watcher_config) is True
        
        # Invalid event type
        assert service._should_process_event("deleted", "test.txt", watcher_config) is False
        
        # Invalid file pattern
        assert service._should_process_event("created", "test.py", watcher_config) is False
    
    @pytest.mark.asyncio
    async def test_handle_file_event(self, service, temp_dir):
        """Test handling file events"""
        watcher_id = await service.start_watching(
            path=temp_dir,
            event_types=["created"],
            file_patterns=["*"]
        )
        
        # Mock WebSocket manager
        with patch.object(service, 'websocket_manager') as mock_ws:
            mock_ws.broadcast_to_all = AsyncMock()
            
            # Simulate file event
            test_file = os.path.join(temp_dir, "test.txt")
            await service._handle_file_event("created", test_file, watcher_id)
            
            # Check event was broadcast
            mock_ws.broadcast_to_all.assert_called_once()
            call_args = mock_ws.broadcast_to_all.call_args[0]
            event_data = call_args[0]
            
            assert event_data["type"] == "file_event"
            assert event_data["event_type"] == "created"
            assert event_data["file_path"] == test_file
            assert event_data["watcher_id"] == watcher_id
    
    @pytest.mark.asyncio
    async def test_handle_file_event_filtered(self, service, temp_dir):
        """Test handling file events that should be filtered"""
        watcher_id = await service.start_watching(
            path=temp_dir,
            event_types=["created"],
            file_patterns=["*.txt"]  # Only .txt files
        )
        
        with patch.object(service, 'websocket_manager') as mock_ws:
            mock_ws.broadcast_to_all = AsyncMock()
            
            # Simulate file event for .py file (should be filtered)
            test_file = os.path.join(temp_dir, "test.py")
            await service._handle_file_event("created", test_file, watcher_id)
            
            # Check event was NOT broadcast
            mock_ws.broadcast_to_all.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_get_watcher_info_existing(self, service, temp_dir):
        """Test getting watcher information for existing watcher"""
        watcher_id = await service.start_watching(
            path=temp_dir,
            event_types=["created"],
            file_patterns=["*"]
        )
        
        info = await service.get_watcher_info(watcher_id)
        
        assert info is not None
        assert info["id"] == watcher_id
        assert info["path"] == temp_dir
        assert info["status"] == "active"
        assert "uptime" in info
    
    @pytest.mark.asyncio
    async def test_get_watcher_info_nonexistent(self, service):
        """Test getting watcher information for non-existent watcher"""
        info = await service.get_watcher_info("nonexistent_id")
        
        assert info is None
    
    @pytest.mark.asyncio
    async def test_multiple_watchers(self, service, temp_dir):
        """Test managing multiple watchers simultaneously"""
        # Create subdirectory
        sub_dir = os.path.join(temp_dir, "subdir")
        os.makedirs(sub_dir)
        
        # Start multiple watchers
        watcher_id1 = await service.start_watching(
            path=temp_dir,
            event_types=["created"],
            file_patterns=["*.txt"]
        )
        
        watcher_id2 = await service.start_watching(
            path=sub_dir,
            event_types=["modified"],
            file_patterns=["*.py"]
        )
        
        # Check both are active
        assert watcher_id1 in service.active_watchers
        assert watcher_id2 in service.active_watchers
        
        watchers = await service.list_watchers()
        assert len(watchers) == 2
        
        # Stop one watcher
        await service.stop_watching(watcher_id1)
        
        # Check only one remains
        watchers = await service.list_watchers()
        assert len(watchers) == 1
        assert watchers[0]["id"] == watcher_id2
    
    @pytest.mark.asyncio
    async def test_watcher_uptime_tracking(self, service, temp_dir):
        """Test that watcher uptime is tracked correctly"""
        watcher_id = await service.start_watching(
            path=temp_dir,
            event_types=["created"],
            file_patterns=["*"]
        )
        
        # Wait a short time
        await asyncio.sleep(0.1)
        
        watchers = await service.list_watchers()
        assert len(watchers) == 1
        assert watchers[0]["uptime"] > 0
    
    @pytest.mark.asyncio
    async def test_event_count_tracking(self, service, temp_dir):
        """Test that event count is tracked correctly"""
        watcher_id = await service.start_watching(
            path=temp_dir,
            event_types=["created"],
            file_patterns=["*"]
        )
        
        # Simulate multiple events
        with patch.object(service, 'websocket_manager') as mock_ws:
            mock_ws.broadcast_to_all = AsyncMock()
            
            test_file1 = os.path.join(temp_dir, "test1.txt")
            test_file2 = os.path.join(temp_dir, "test2.txt")
            
            await service._handle_file_event("created", test_file1, watcher_id)
            await service._handle_file_event("created", test_file2, watcher_id)
        
        watchers = await service.list_watchers()
        assert len(watchers) == 1
        assert watchers[0]["event_count"] == 2
    
    def test_event_history_tracking(self, service):
        """Test that event history is maintained"""
        initial_count = len(service.event_history)
        
        # Add some events
        service._add_to_history("created", "/path/to/file1.txt", "watcher1")
        service._add_to_history("modified", "/path/to/file2.txt", "watcher2")
        
        assert len(service.event_history) == initial_count + 2
        
        # Check latest events
        recent_events = service.event_history[-2:]
        assert recent_events[0]["event_type"] == "created"
        assert recent_events[1]["event_type"] == "modified"
    
    def test_history_limit_enforcement(self, service):
        """Test that event history doesn't grow beyond limit"""
        # Set a small history limit for testing
        original_limit = service.max_history_size
        service.max_history_size = 3
        
        try:
            # Add more events than the limit
            for i in range(5):
                service._add_to_history("created", f"/path/file{i}.txt", "watcher1")
            
            # Should only keep the most recent events
            assert len(service.event_history) == 3
            
            # Check that latest events are preserved
            for i, event in enumerate(service.event_history):
                expected_file = f"/path/file{i+2}.txt"  # Should be files 2, 3, 4
                assert event["file_path"] == expected_file
        
        finally:
            service.max_history_size = original_limit
    
    @pytest.mark.asyncio
    async def test_cleanup_on_service_destruction(self, service, temp_dir):
        """Test that watchers are cleaned up when service is destroyed"""
        watcher_id = await service.start_watching(
            path=temp_dir,
            event_types=["created"],
            file_patterns=["*"]
        )
        
        assert len(service.active_watchers) == 1
        
        # Simulate cleanup
        await service.cleanup_all_watchers()
        
        assert len(service.active_watchers) == 0
    
    @pytest.mark.asyncio
    async def test_error_handling_invalid_watcher_config(self, service, temp_dir):
        """Test error handling with invalid watcher configuration"""
        # Test with empty event types
        with pytest.raises(ValueError):
            await service.start_watching(
                path=temp_dir,
                event_types=[],
                file_patterns=["*"]
            )
        
        # Test with empty file patterns
        with pytest.raises(ValueError):
            await service.start_watching(
                path=temp_dir,
                event_types=["created"],
                file_patterns=[]
            )

if __name__ == "__main__":
    pytest.main([__file__]) 