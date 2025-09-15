#!/usr/bin/env python3
"""
WebSocket Endpoints Test Script
Tests all WebSocket endpoints to ensure they're working correctly
"""

import asyncio
import websockets
import json
import time
from typing import Dict, Any

# Test configuration
BASE_URL = "ws://localhost:8000"
TEST_TIMEOUT = 10  # seconds

class WebSocketTester:
    """WebSocket endpoint testing utility"""
    
    def __init__(self):
        self.results = {}
        
    async def test_endpoint(self, endpoint: str, test_messages: list) -> Dict[str, Any]:
        """Test a single WebSocket endpoint"""
        print(f"🧪 Testing WebSocket endpoint: {endpoint}")
        
        url = f"{BASE_URL}{endpoint}"
        result = {
            "endpoint": endpoint,
            "url": url,
            "status": "failed",
            "connection_time": 0,
            "messages_sent": 0,
            "messages_received": 0,
            "errors": []
        }
        
        try:
            start_time = time.time()
            
            # Connect to WebSocket
            async with websockets.connect(url) as websocket:
                connection_time = time.time() - start_time
                result["connection_time"] = round(connection_time, 3)
                print(f"✅ Connected to {endpoint} in {connection_time:.3f}s")
                
                # Wait for welcome message if any
                try:
                    welcome_msg = await asyncio.wait_for(websocket.recv(), timeout=2)
                    print(f"📨 Welcome message: {welcome_msg[:100]}...")
                    result["messages_received"] += 1
                except asyncio.TimeoutError:
                    print("ℹ️  No welcome message received")
                
                # Send test messages
                for i, message in enumerate(test_messages):
                    print(f"📤 Sending message {i+1}: {message}")
                    await websocket.send(json.dumps(message))
                    result["messages_sent"] += 1
                    
                    try:
                        # Wait for response
                        response = await asyncio.wait_for(websocket.recv(), timeout=5)
                        result["messages_received"] += 1
                        print(f"📨 Response: {response[:100]}...")
                        
                        # Parse response if JSON
                        try:
                            response_data = json.loads(response)
                            if response_data.get("type") == "error":
                                result["errors"].append(f"Server error: {response_data.get('message')}")
                        except json.JSONDecodeError:
                            pass
                            
                    except asyncio.TimeoutError:
                        result["errors"].append(f"No response to message {i+1}")
                
                result["status"] = "success"
                print(f"✅ Test completed for {endpoint}")
                
        except websockets.exceptions.ConnectionClosed as e:
            result["errors"].append(f"Connection closed: {e}")
            print(f"❌ Connection closed for {endpoint}: {e}")
        except websockets.exceptions.WebSocketException as e:
            result["errors"].append(f"WebSocket error: {e}")
            print(f"❌ WebSocket error for {endpoint}: {e}")
        except Exception as e:
            result["errors"].append(f"Unexpected error: {e}")
            print(f"❌ Unexpected error for {endpoint}: {e}")
        
        return result
    
    async def test_all_endpoints(self):
        """Test all WebSocket endpoints"""
        print("🚀 Starting WebSocket endpoint tests...")
        print("=" * 60)
        
        # Define test cases for each endpoint
        test_cases = [
            {
                "endpoint": "/",
                "messages": [
                    {"type": "ping"},
                    {"type": "stats_request"},
                    {"type": "desktop_request"}
                ]
            },
            {
                "endpoint": "/ws",
                "messages": [
                    {"type": "ping"},
                    {"type": "hello", "data": "test"}
                ]
            },
            {
                "endpoint": "/ws/live-desktop",
                "messages": [
                    {"type": "ping"},
                    {"type": "get_status"}
                ]
            },
            {
                "endpoint": "/ws/file-events",
                "messages": [
                    {"type": "ping"},
                    {"type": "get_watchers"}
                ]
            }
        ]
        
        # Run tests for each endpoint
        for test_case in test_cases:
            endpoint = test_case["endpoint"]
            messages = test_case["messages"]
            
            result = await self.test_endpoint(endpoint, messages)
            self.results[endpoint] = result
            
            print("-" * 40)
            await asyncio.sleep(1)  # Brief pause between tests
    
    def print_summary(self):
        """Print test results summary"""
        print("\n" + "=" * 60)
        print("📊 WEBSOCKET TEST RESULTS SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.results)
        successful_tests = sum(1 for r in self.results.values() if r["status"] == "success")
        
        print(f"Total endpoints tested: {total_tests}")
        print(f"Successful connections: {successful_tests}")
        print(f"Failed connections: {total_tests - successful_tests}")
        print()
        
        for endpoint, result in self.results.items():
            status_icon = "✅" if result["status"] == "success" else "❌"
            print(f"{status_icon} {endpoint}")
            print(f"   Connection Time: {result['connection_time']}s")
            print(f"   Messages Sent: {result['messages_sent']}")
            print(f"   Messages Received: {result['messages_received']}")
            
            if result["errors"]:
                print(f"   Errors: {len(result['errors'])}")
                for error in result["errors"]:
                    print(f"     - {error}")
            print()
        
        # Overall status
        if successful_tests == total_tests:
            print("🎉 All WebSocket endpoints are working correctly!")
        else:
            print(f"⚠️  {total_tests - successful_tests} endpoints have issues")
            
        return successful_tests == total_tests

async def main():
    """Main test function"""
    print("🔌 TRAE Backend WebSocket Endpoint Tests")
    print("========================================")
    print("Testing WebSocket endpoints on localhost:8000")
    print()
    
    tester = WebSocketTester()
    
    try:
        await tester.test_all_endpoints()
        success = tester.print_summary()
        
        if success:
            print("\n✨ All tests passed! WebSocket functionality is working correctly.")
            return 0
        else:
            print("\n❌ Some tests failed. Check the details above.")
            return 1
            
    except KeyboardInterrupt:
        print("\n⏹️  Tests interrupted by user")
        return 130
    except Exception as e:
        print(f"\n💥 Test runner error: {e}")
        return 1

if __name__ == "__main__":
    exit(asyncio.run(main()))