#!/usr/bin/env python3
"""
Simple test for desktop capture client connection and disconnection
"""

import asyncio
import websockets
import json
import signal
import sys
from datetime import datetime

class SimpleTestClient:
    def __init__(self, client_id, server_url="ws://localhost:8084"):
        self.client_id = client_id
        self.server_url = server_url
        self.websocket = None
        self.running = False
        
    async def connect_and_test(self, duration=5):
        """Connect, wait, and disconnect"""
        try:
            print(f"[{self.client_id}] Connecting to {self.server_url}")
            self.websocket = await websockets.connect(self.server_url)
            self.running = True
            
            # Send handshake
            handshake = {
                "type": "handshake",
                "clientType": "desktop",
                "clientId": self.client_id,
                "timestamp": datetime.now().isoformat()
            }
            await self.websocket.send(json.dumps(handshake))
            print(f"[{self.client_id}] Handshake sent")
            
            # Wait for handshake acknowledgment
            response = await self.websocket.recv()
            message = json.loads(response)
            if message.get("type") == "handshake_ack":
                print(f"[{self.client_id}] Handshake acknowledged - Connected successfully!")
            
            # Wait for specified duration
            print(f"[{self.client_id}] Running for {duration} seconds...")
            await asyncio.sleep(duration)
            
            # Send disconnect message
            print(f"[{self.client_id}] Sending disconnect message...")
            disconnect_msg = {
                "type": "client_disconnect",
                "clientId": self.client_id,
                "timestamp": datetime.now().isoformat()
            }
            await self.websocket.send(json.dumps(disconnect_msg))
            
            # Close connection
            await self.websocket.close()
            print(f"[{self.client_id}] Disconnected successfully!")
            
            return True
            
        except Exception as e:
            print(f"[{self.client_id}] Error: {e}")
            return False
        finally:
            self.running = False

async def main():
    print("=== Simple Desktop Client Test ===")
    
    # Test single client
    client = SimpleTestClient("simple_test_client")
    success = await client.connect_and_test(duration=3)
    
    if success:
        print("✅ Test completed successfully!")
    else:
        print("❌ Test failed!")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nTest interrupted by user")
    except Exception as e:
        print(f"Test failed with error: {e}")