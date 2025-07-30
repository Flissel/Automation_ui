#!/usr/bin/env python3
"""
Test script for multiple desktop capture clients
Tests connection, streaming, and graceful disconnection
"""

import asyncio
import websockets
import json
import signal
import sys
import time
import threading
from datetime import datetime

class TestDesktopClient:
    def __init__(self, client_id, server_url="ws://localhost:8084"):
        self.client_id = client_id
        self.server_url = server_url
        self.websocket = None
        self.running = False
        self.connected = False
        
    async def connect(self):
        """Connect to the WebSocket server"""
        try:
            print(f"[{self.client_id}] Connecting to {self.server_url}")
            self.websocket = await websockets.connect(self.server_url)
            self.connected = True
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
                print(f"[{self.client_id}] Handshake acknowledged")
            
            return True
            
        except Exception as e:
            print(f"[{self.client_id}] Connection failed: {e}")
            return False
    
    async def listen_for_messages(self):
        """Listen for incoming messages"""
        try:
            while self.running and self.websocket:
                try:
                    message = await asyncio.wait_for(self.websocket.recv(), timeout=1.0)
                    data = json.loads(message)
                    print(f"[{self.client_id}] Received: {data.get('type', 'unknown')}")
                    
                    # Handle ping messages
                    if data.get("type") == "ping":
                        pong_response = {
                            "type": "pong",
                            "timestamp": datetime.now().isoformat()
                        }
                        await self.websocket.send(json.dumps(pong_response))
                        
                except asyncio.TimeoutError:
                    continue
                except websockets.exceptions.ConnectionClosed:
                    print(f"[{self.client_id}] Connection closed by server")
                    break
                    
        except Exception as e:
            print(f"[{self.client_id}] Error in message listener: {e}")
        finally:
            self.running = False
    
    async def disconnect(self):
        """Gracefully disconnect from the server"""
        print(f"[{self.client_id}] Initiating disconnect...")
        self.running = False
        
        if self.websocket:
            try:
                # Check if connection is still open by trying to ping
                await self.websocket.ping()
                connection_open = True
            except:
                connection_open = False
                
            if connection_open:
            try:
                # Send disconnect message
                disconnect_msg = {
                    "type": "client_disconnect",
                    "clientId": self.client_id,
                    "timestamp": datetime.now().isoformat()
                }
                await self.websocket.send(json.dumps(disconnect_msg))
                print(f"[{self.client_id}] Disconnect message sent")
                
                # Close connection
                await self.websocket.close()
                print(f"[{self.client_id}] Connection closed")
                
            except Exception as e:
                print(f"[{self.client_id}] Error during disconnect: {e}")
        
        self.connected = False

async def test_client_lifecycle(client_id, duration=10):
    """Test a single client's lifecycle"""
    client = TestDesktopClient(client_id)
    
    try:
        # Connect
        if await client.connect():
            print(f"[{client_id}] Connected successfully")
            
            # Start message listener
            listener_task = asyncio.create_task(client.listen_for_messages())
            
            # Run for specified duration
            await asyncio.sleep(duration)
            
            # Disconnect
            await client.disconnect()
            
            # Cancel listener
            listener_task.cancel()
            try:
                await listener_task
            except asyncio.CancelledError:
                pass
                
        else:
            print(f"[{client_id}] Failed to connect")
            
    except Exception as e:
        print(f"[{client_id}] Error in lifecycle: {e}")

async def test_multiple_clients():
    """Test multiple clients connecting and disconnecting"""
    print("=== Testing Multiple Desktop Clients ===")
    
    # Test 1: Sequential connections
    print("\n1. Testing sequential connections...")
    for i in range(3):
        client_id = f"test_client_{i+1}"
        await test_client_lifecycle(client_id, duration=5)
        await asyncio.sleep(2)  # Wait between clients
    
    # Test 2: Concurrent connections
    print("\n2. Testing concurrent connections...")
    tasks = []
    for i in range(3):
        client_id = f"concurrent_client_{i+1}"
        task = asyncio.create_task(test_client_lifecycle(client_id, duration=8))
        tasks.append(task)
    
    await asyncio.gather(*tasks)
    
    # Test 3: Staggered disconnections
    print("\n3. Testing staggered connections and disconnections...")
    clients = []
    
    # Connect all clients
    for i in range(3):
        client_id = f"staggered_client_{i+1}"
        client = TestDesktopClient(client_id)
        if await client.connect():
            clients.append(client)
            # Start listener for each client
            asyncio.create_task(client.listen_for_messages())
            await asyncio.sleep(1)  # Stagger connections
    
    # Let them run for a bit
    await asyncio.sleep(5)
    
    # Disconnect them one by one
    for i, client in enumerate(clients):
        await client.disconnect()
        print(f"Disconnected client {i+1}")
        await asyncio.sleep(2)  # Stagger disconnections
    
    print("\n=== All tests completed ===")

def signal_handler(signum, frame):
    """Handle interrupt signals"""
    print("\nReceived interrupt signal, shutting down...")
    sys.exit(0)

if __name__ == "__main__":
    # Set up signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        asyncio.run(test_multiple_clients())
    except KeyboardInterrupt:
        print("\nTest interrupted by user")
    except Exception as e:
        print(f"Test failed with error: {e}")