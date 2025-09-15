#!/usr/bin/env python3
"""
WebSocket Live Desktop Endpoint Diagnostic Script
Tests WebSocket connectivity to /ws/live-desktop endpoint
"""

import asyncio
import websockets
import json
import sys
from datetime import datetime

async def test_websocket_connection():
    """Test WebSocket connection to live desktop endpoint"""
    uri = "ws://localhost:8007/ws/live-desktop"
    
    print(f"🔍 [DEBUG] Testing WebSocket connection to {uri}")
    print(f"🕐 [DEBUG] Test started at {datetime.now().isoformat()}")
    
    try:
        print("🔌 [DEBUG] Attempting WebSocket connection...")
        
        # Connect with timeout
        websocket = await asyncio.wait_for(
            websockets.connect(uri), 
            timeout=5.0
        )
        
        print("✅ [DEBUG] WebSocket connection established!")
        
        # Send test message
        test_message = {
            "type": "ping",
            "message": "diagnostic test",
            "timestamp": datetime.now().isoformat()
        }
        
        print(f"📤 [DEBUG] Sending test message: {test_message}")
        await websocket.send(json.dumps(test_message))
        
        # Wait for response
        print("📥 [DEBUG] Waiting for response...")
        response = await asyncio.wait_for(websocket.recv(), timeout=10.0)
        print(f"✅ [DEBUG] Received response: {response}")
        
        # Parse response
        try:
            response_data = json.loads(response)
            print(f"📊 [DEBUG] Parsed response: {response_data}")
        except json.JSONDecodeError:
            print(f"⚠️ [DEBUG] Non-JSON response: {response}")
        
        # Keep connection open briefly to test streaming
        print("🕐 [DEBUG] Keeping connection open for 3 seconds to test streaming...")
        for i in range(3):
            try:
                message = await asyncio.wait_for(websocket.recv(), timeout=1.5)
                print(f"📨 [DEBUG] Streaming message {i+1}: {message[:100]}...")
            except asyncio.TimeoutError:
                print(f"⏰ [DEBUG] No message received in iteration {i+1}")
        
        print("🔌 [DEBUG] Closing WebSocket connection...")
        await websocket.close()
        print("✅ [DEBUG] WebSocket connection closed successfully")
        
        return True
        
    except asyncio.TimeoutError:
        print("💥 [DEBUG] WebSocket connection timeout!")
        return False
        
    except websockets.exceptions.ConnectionRefused:
        print("💥 [DEBUG] WebSocket connection refused - endpoint may not be available")
        return False
        
    except websockets.exceptions.InvalidStatusCode as e:
        print(f"💥 [DEBUG] WebSocket invalid status code: {e}")
        return False
        
    except Exception as e:
        print(f"💥 [DEBUG] WebSocket connection error: {e}")
        print(f"💥 [DEBUG] Error type: {type(e).__name__}")
        return False

async def test_http_endpoint():
    """Test if the backend is accessible via HTTP"""
    import aiohttp
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get("http://localhost:8007/api/health") as response:
                status = response.status
                text = await response.text()
                print(f"🌐 [DEBUG] HTTP health check: {status} - {text[:100]}")
                return status == 200
    except Exception as e:
        print(f"💥 [DEBUG] HTTP test failed: {e}")
        return False

async def main():
    """Main diagnostic function"""
    print("=" * 60)
    print("🔍 WEBSOCKET LIVE DESKTOP ENDPOINT DIAGNOSTIC")
    print("=" * 60)
    
    # Test HTTP connectivity first
    print("\n1. Testing HTTP connectivity...")
    http_ok = await test_http_endpoint()
    
    if not http_ok:
        print("💥 [ERROR] HTTP connectivity failed - backend may not be running")
        return False
    
    print("✅ [SUCCESS] HTTP connectivity confirmed")
    
    # Test WebSocket connectivity
    print("\n2. Testing WebSocket connectivity...")
    ws_ok = await test_websocket_connection()
    
    if ws_ok:
        print("\n✅ [SUCCESS] WebSocket live desktop endpoint is working correctly!")
        print("🎯 [CONCLUSION] Backend WebSocket endpoint is functional")
        print("🔍 [NEXT STEP] Check frontend WebSocket connection code")
    else:
        print("\n💥 [FAILURE] WebSocket live desktop endpoint is not working")
        print("🎯 [CONCLUSION] Backend WebSocket endpoint has issues")
        print("🔍 [NEXT STEP] Check backend service configuration")
    
    print("\n" + "=" * 60)
    return ws_ok

if __name__ == "__main__":
    try:
        result = asyncio.run(main())
        sys.exit(0 if result else 1)
    except KeyboardInterrupt:
        print("\n🛑 [DEBUG] Test interrupted by user")
        sys.exit(1)