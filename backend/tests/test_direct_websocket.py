#!/usr/bin/env python3

import asyncio
import websockets
import json
from datetime import datetime

async def test_websocket_connection():
    """Test direct WebSocket connection to live-desktop endpoint"""
    
    url = "ws://localhost:8000/ws/live-desktop"
    print(f"🔌 [TEST] Testing WebSocket connection to: {url}")
    
    try:
        # Test connection
        async with websockets.connect(
            url,
            ping_interval=None,
            ping_timeout=None
        ) as websocket:
            print("✅ [TEST] WebSocket connection established successfully!")
            
            # Wait for any initial messages
            try:
                initial_message = await asyncio.wait_for(websocket.recv(), timeout=5)
                print(f"📨 [TEST] Received initial message: {initial_message}")
            except asyncio.TimeoutError:
                print("⏰ [TEST] No initial message received (timeout)")
            
            # Send a test message
            test_message = {
                "type": "test",
                "message": "Direct WebSocket test",
                "timestamp": datetime.now().isoformat()
            }
            
            await websocket.send(json.dumps(test_message))
            print(f"📤 [TEST] Sent test message: {test_message}")
            
            # Wait for response
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=5)
                print(f"📨 [TEST] Received response: {response}")
            except asyncio.TimeoutError:
                print("⏰ [TEST] No response received (timeout)")
            
            # Keep connection alive briefly to test streaming
            print("🔄 [TEST] Keeping connection alive for 10 seconds...")
            for i in range(10):
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=1)
                    print(f"📨 [TEST] Stream message {i+1}: {message[:100]}...")
                except asyncio.TimeoutError:
                    print(f"⏰ [TEST] No message in second {i+1}")
            
            print("✅ [TEST] WebSocket connection test completed successfully")
            
    except websockets.exceptions.ConnectionClosed as e:
        print(f"💥 [TEST] WebSocket connection closed: {e}")
        
    except websockets.exceptions.InvalidStatusCode as e:
        print(f"💥 [TEST] Invalid status code: {e}")
        print(f"     Status: {e.status_code}")
        if hasattr(e, 'headers'):
            print(f"     Headers: {e.headers}")
            
    except websockets.exceptions.InvalidURI as e:
        print(f"💥 [TEST] Invalid WebSocket URI: {e}")
        
    except ConnectionRefusedError as e:
        print(f"💥 [TEST] Connection refused: {e}")
        print("     Make sure the backend server is running on port 8000")
        
    except OSError as e:
        print(f"💥 [TEST] Network error: {e}")
        
    except Exception as e:
        print(f"💥 [TEST] Unexpected error: {e}")
        import traceback
        traceback.print_exc()

async def test_root_websocket():
    """Test root WebSocket connection as comparison"""
    
    url = "ws://localhost:8000/"
    print(f"\n🔌 [TEST] Testing root WebSocket connection to: {url}")
    
    try:
        async with websockets.connect(url) as websocket:
            print("✅ [TEST] Root WebSocket connection established!")
            
            # Wait for welcome message
            try:
                welcome = await asyncio.wait_for(websocket.recv(), timeout=3)
                print(f"📨 [TEST] Received welcome: {welcome}")
            except asyncio.TimeoutError:
                print("⏰ [TEST] No welcome message received")
                
    except Exception as e:
        print(f"💥 [TEST] Root WebSocket connection failed: {e}")

if __name__ == "__main__":
    print("🧪 [TEST] Starting WebSocket connection tests...\n")
    asyncio.run(test_websocket_connection())
    asyncio.run(test_root_websocket())