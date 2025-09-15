#!/usr/bin/env python3
"""Debug WebSocket service availability"""

import asyncio
import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def test_websocket_services():
    """Test WebSocket service availability"""
    
    print("🔧 Testing WebSocket service imports...")
    
    try:
        # Test service imports
        from app.services import (
            get_websocket_service,
            get_live_desktop_service,
            get_file_watcher_service
        )
        print("✅ WebSocket service imports successful")
        
        # Test service instances
        websocket_service = get_websocket_service()
        live_desktop_service = get_live_desktop_service()
        file_watcher_service = get_file_watcher_service()
        
        print(f"🔌 WebSocket service: {websocket_service}")
        print(f"🖥️  Live desktop service: {live_desktop_service}")
        print(f"📁 File watcher service: {file_watcher_service}")
        
        # Test if live desktop service has handle_websocket method
        if live_desktop_service:
            has_handle_websocket = hasattr(live_desktop_service, 'handle_websocket')
            print(f"📡 Live desktop service has handle_websocket: {has_handle_websocket}")
        
        return {
            "websocket_service": websocket_service is not None,
            "live_desktop_service": live_desktop_service is not None,
            "file_watcher_service": file_watcher_service is not None
        }
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return {"error": str(e)}
        
    except Exception as e:
        print(f"💥 Unexpected error: {e}")
        return {"error": str(e)}

if __name__ == "__main__":
    result = asyncio.run(test_websocket_services())
    print(f"\n📊 Result: {result}")