"""
Detailed WebSocket debugging script to identify the exact error
"""

import asyncio
import json
import sys
import traceback
import requests
import websockets
from datetime import datetime

async def test_websocket_with_detailed_error():
    """Test WebSocket connection with detailed error reporting"""
    websocket_url = "ws://localhost:8007/ws/live-desktop"
    
    print(f"=== Detailed WebSocket Debug Test ===")
    print(f"Target URL: {websocket_url}")
    print(f"Test time: {datetime.now().isoformat()}")
    print()
    
    # First verify HTTP health
    try:
        health_response = requests.get("http://localhost:8007/api/health", timeout=5)
        print(f"✅ Health check: {health_response.status_code}")
        health_data = health_response.json()
        print(f"Live desktop service status: {health_data.get('services', {}).get('live_desktop', 'unknown')}")
        print()
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False
    
    # Test direct screenshot API
    try:
        screenshot_response = requests.get("http://localhost:8007/api/desktop/screenshot", timeout=10)
        print(f"✅ Screenshot API: {screenshot_response.status_code}")
        if screenshot_response.status_code == 200:
            print(f"Screenshot size: {len(screenshot_response.content)} bytes")
        print()
    except Exception as e:
        print(f"❌ Screenshot API failed: {e}")
        return False
    
    # Now attempt WebSocket connection with detailed error capture
    print("Attempting WebSocket connection...")
    
    try:
        async with websockets.connect(websocket_url, timeout=10) as websocket:
            print("✅ WebSocket connection successful!")
            
            # Wait for welcome message
            try:
                welcome_msg = await asyncio.wait_for(websocket.recv(), timeout=5)
                print(f"📩 Welcome message: {welcome_msg}")
                
                # Wait for first frame
                frame_msg = await asyncio.wait_for(websocket.recv(), timeout=10)
                frame_data = json.loads(frame_msg)
                print(f"🖼️  First frame received: type={frame_data.get('type')}, size={len(frame_msg)} chars")
                
                return True
                
            except asyncio.TimeoutError:
                print("⏰ Timeout waiting for messages")
                return False
                
    except websockets.exceptions.InvalidStatus as e:
        print(f"❌ WebSocket rejected connection: {e}")
        print(f"Status code: {e.response.status_code}")
        print(f"Headers: {dict(e.response.headers)}")
        
        # Try to get response body if available
        try:
            response_body = e.response.body
            if response_body:
                print(f"Response body: {response_body}")
        except:
            pass
            
        return False
        
    except Exception as e:
        print(f"❌ WebSocket connection failed: {e}")
        print(f"Exception type: {type(e).__name__}")
        print("Full traceback:")
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_websocket_with_detailed_error())
    sys.exit(0 if success else 1)