#!/usr/bin/env python3

import asyncio
import sys
import os
import json
import traceback
import websockets

# Add project root to path
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_root)

async def test_websocket_with_detailed_logging():
    """Test WebSocket connection with detailed logging of the router path"""
    
    print("=== Testing WebSocket Router Path Debug ===")
    
    # First test the basic connection to see error details
    websocket_url = "ws://localhost:8007/ws/live-desktop"
    
    try:
        print(f"Attempting connection to: {websocket_url}")
        
        # Try connecting with more detailed error handling
        async with websockets.connect(
            websocket_url,
            ping_interval=None,  # Disable ping/pong for debugging
            ping_timeout=None
        ) as websocket:
            print("✅ Successfully connected to WebSocket!")
            
            # Send a test message
            test_message = {
                "type": "ping",
                "timestamp": "2024-01-01T00:00:00"
            }
            
            await websocket.send(json.dumps(test_message))
            print("📤 Sent test ping message")
            
            # Wait for response
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=5)
                response_data = json.loads(response)
                print(f"📥 Received response: {response_data}")
            except asyncio.TimeoutError:
                print("⚠️  No response received within timeout")
            
    except websockets.exceptions.InvalidStatus as e:
        print(f"❌ WebSocket connection failed with status: {e}")
        print(f"   Full error: {e}")
        
        # Try to get more detailed error information
        try:
            status_code = e.response.status_code if hasattr(e, 'response') else 'unknown'
            headers = dict(e.response.headers) if hasattr(e, 'response') and hasattr(e.response, 'headers') else {}
            print(f"   Status Code: {status_code}")
            print(f"   Response Headers: {headers}")
        except:
            pass
            
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        print(f"Error type: {type(e)}")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_websocket_with_detailed_logging())