#!/usr/bin/env python3
"""
Test WebSocket Connection to Running Server
Tests the actual WebSocket connection to /ws/live-desktop endpoint.
"""

import asyncio
import websockets
import json

async def test_websocket_connection():
    """Test WebSocket connection to live desktop endpoint"""
    print("=== Testing WebSocket Connection to Running Server ===")
    
    websocket_url = "ws://localhost:8007/ws/live-desktop"
    
    try:
        print(f"Connecting to {websocket_url}...")
        
        async with websockets.connect(websocket_url) as websocket:
            print("✓ WebSocket connection established!")
            
            # Send start streaming message
            start_message = {
                "type": "start_stream",
                "data": {
                    "fps": 5,
                    "quality": 80
                }
            }
            
            await websocket.send(json.dumps(start_message))
            print("✓ Start streaming message sent")
            
            # Wait for response
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                print(f"✓ Received response: {response[:100]}...")
                
                # Try to parse as JSON
                try:
                    parsed_response = json.loads(response)
                    print(f"✓ Response type: {parsed_response.get('type', 'unknown')}")
                except json.JSONDecodeError:
                    print("✓ Received binary data (likely screenshot)")
                
            except asyncio.TimeoutError:
                print("⚠️  Timeout waiting for response")
            
            # Send stop streaming message
            stop_message = {
                "type": "stop_stream"
            }
            
            await websocket.send(json.dumps(stop_message))
            print("✓ Stop streaming message sent")
            
    except websockets.exceptions.ConnectionClosed as e:
        print(f"✗ WebSocket connection closed: {e}")
    except websockets.exceptions.InvalidStatusCode as e:
        print(f"✗ Invalid status code: {e}")
    except ConnectionRefusedError:
        print("✗ Connection refused - make sure server is running on port 8007")
    except Exception as e:
        print(f"✗ Connection failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_websocket_connection())