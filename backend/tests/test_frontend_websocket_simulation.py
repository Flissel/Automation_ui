#!/usr/bin/env python3
"""
Test Frontend WebSocket Implementation Issues
Simulates exactly what the frontend does to identify connection problems
"""

import asyncio
import json
import time
import requests
import websockets
from typing import Dict, Any

class FrontendWebSocketSimulator:
    """Simulates frontend WebSocket behavior to identify issues"""
    
    def __init__(self):
        self.ws_url = "ws://localhost:8000/ws/live-desktop"
        self.is_connecting = False
        self.should_reconnect = True
        self.reconnect_attempts = 0
        self.max_reconnect_attempts = 10
        self.reconnect_interval = 5
        
    async def test_simple_connection(self):
        """Test basic connection like our working browser test"""
        print("\n=== TESTING SIMPLE CONNECTION (Like Browser Test) ===")
        try:
            async with websockets.connect(self.ws_url) as websocket:
                print(f"✅ Simple connection successful to {self.ws_url}")
                
                # Listen for a few messages
                message_count = 0
                timeout_duration = 5
                start_time = time.time()
                
                while time.time() - start_time < timeout_duration and message_count < 3:
                    try:
                        message = await asyncio.wait_for(websocket.recv(), timeout=2)
                        data = json.loads(message)
                        print(f"📦 Message {message_count + 1}: Type={data.get('type')}, Size={len(message)} bytes")
                        message_count += 1
                    except asyncio.TimeoutError:
                        print("⏱️  No message received within timeout")
                        break
                    except Exception as e:
                        print(f"❌ Error receiving message: {e}")
                        break
                
                print(f"✅ Simple connection test completed - received {message_count} messages")
                
        except Exception as e:
            print(f"❌ Simple connection failed: {e}")
            return False
        return True
    
    async def test_frontend_style_connection(self):
        """Test complex connection logic like frontend implementation"""
        print("\n=== TESTING FRONTEND-STYLE CONNECTION ===")
        
        if self.is_connecting:
            print("🔌 Connection already in progress...")
            return False
        
        self.is_connecting = True
        print(f"🔌 Creating WebSocket connection to: {self.ws_url}")
        
        try:
            # Simulate frontend connection with all the complexity
            websocket = await websockets.connect(self.ws_url)
            print("✅ Frontend-style connection successful")
            self.is_connecting = False
            self.reconnect_attempts = 0
            
            # Test sending a message like frontend does
            test_message = {
                "type": "desktop_click",
                "data": {"x": 100, "y": 100, "button": "left"},
                "timestamp": time.time(),
                "id": f"msg_{int(time.time() * 1000)}_test123"
            }
            
            await websocket.send(json.dumps(test_message))
            print("✅ Message sent successfully")
            
            # Listen for responses
            message_count = 0
            timeout_duration = 5
            start_time = time.time()
            
            while time.time() - start_time < timeout_duration and message_count < 3:
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=2)
                    data = json.loads(message)
                    print(f"📦 Frontend-style message {message_count + 1}: Type={data.get('type')}, Size={len(message)} bytes")
                    message_count += 1
                except asyncio.TimeoutError:
                    print("⏱️  No message received within timeout")
                    break
                except Exception as e:
                    print(f"❌ Error receiving message: {e}")
                    break
            
            await websocket.close()
            print(f"✅ Frontend-style connection test completed - received {message_count} messages")
            
        except Exception as e:
            print(f"❌ Frontend-style connection failed: {e}")
            self.is_connecting = False
            return False
        
        return True
    
    async def test_connection_with_headers(self):
        """Test connection with various headers like browser might send"""
        print("\n=== TESTING CONNECTION WITH BROWSER HEADERS ===")
        
        headers = {
            "Origin": "http://localhost:3000",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Sec-WebSocket-Version": "13",
            "Sec-WebSocket-Key": "test-key-12345",
        }
        
        try:
            async with websockets.connect(self.ws_url, extra_headers=headers) as websocket:
                print("✅ Connection with browser headers successful")
                
                # Try to receive a message
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=3)
                    data = json.loads(message)
                    print(f"📦 Message with headers: Type={data.get('type')}, Size={len(message)} bytes")
                except asyncio.TimeoutError:
                    print("⏱️  No message received with headers")
                
        except Exception as e:
            print(f"❌ Connection with headers failed: {e}")
            return False
        
        return True
    
    def test_backend_health(self):
        """Test if backend is responding correctly"""
        print("\n=== TESTING BACKEND HEALTH ===")
        
        try:
            # Test root endpoint
            response = requests.get("http://localhost:8000/", timeout=5)
            print(f"✅ Root endpoint: Status {response.status_code}")
        except Exception as e:
            print(f"❌ Root endpoint failed: {e}")
        
        try:
            # Test docs endpoint
            response = requests.get("http://localhost:8000/docs", timeout=5)
            print(f"✅ Docs endpoint: Status {response.status_code}")
        except Exception as e:
            print(f"❌ Docs endpoint failed: {e}")
        
        try:
            # Test health endpoint
            response = requests.get("http://localhost:8000/health", timeout=5)
            print(f"✅ Health endpoint: Status {response.status_code}")
        except Exception as e:
            print(f"❌ Health endpoint failed: {e}")
            
        # Test if the backend is a different port
        for port in [8000, 8007, 8080]:
            try:
                response = requests.get(f"http://localhost:{port}/", timeout=2)
                print(f"✅ Found backend on port {port}: Status {response.status_code}")
            except:
                print(f"❌ No backend on port {port}")
    
    async def run_all_tests(self):
        """Run all tests to identify the issue"""
        print("=" * 60)
        print("FRONTEND WEBSOCKET ISSUE DIAGNOSIS")
        print("=" * 60)
        
        # Test backend health first
        self.test_backend_health()
        
        # Test different connection approaches
        simple_success = await self.test_simple_connection()
        frontend_success = await self.test_frontend_style_connection()
        headers_success = await self.test_connection_with_headers()
        
        print("\n" + "=" * 60)
        print("TEST RESULTS SUMMARY")
        print("=" * 60)
        print(f"Simple Connection (Browser Test Style): {'✅ SUCCESS' if simple_success else '❌ FAILED'}")
        print(f"Frontend-Style Connection: {'✅ SUCCESS' if frontend_success else '❌ FAILED'}")
        print(f"Connection with Headers: {'✅ SUCCESS' if headers_success else '❌ FAILED'}")
        
        if simple_success and not frontend_success:
            print("\n🔍 DIAGNOSIS: Frontend implementation has logic issues")
            print("The backend works fine, but frontend connection logic needs fixing")
        elif not simple_success:
            print("\n🔍 DIAGNOSIS: Backend connection issues")
            print("Basic WebSocket connection is failing")
        else:
            print("\n🔍 DIAGNOSIS: All connections working")
            print("Issue might be in browser environment or frontend framework")

async def main():
    """Main test execution"""
    simulator = FrontendWebSocketSimulator()
    await simulator.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())