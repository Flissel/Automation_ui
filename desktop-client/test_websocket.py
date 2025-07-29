#!/usr/bin/env python3
"""
Simple WebSocket connection test
"""

import asyncio
import websockets
import json
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def test_connection():
    """Test WebSocket connection to the server."""
    try:
        url = "ws://localhost:8084?client_type=desktop&client_id=test_client"
        logger.info(f"Testing connection to {url}")
        
        # Try to connect with a longer timeout
        websocket = await asyncio.wait_for(
            websockets.connect(url, ping_interval=None, ping_timeout=None),
            timeout=30.0
        )
        
        logger.info("Connected successfully!")
        
        # Send a simple handshake
        handshake = {
            'type': 'handshake',
            'timestamp': 1234567890,
            'clientInfo': {
                'clientType': 'desktop_capture',
                'clientId': 'test_client',
                'version': '1.0.0'
            }
        }
        
        await websocket.send(json.dumps(handshake))
        logger.info("Sent handshake")
        
        # Wait for response
        try:
            response = await asyncio.wait_for(websocket.recv(), timeout=10.0)
            logger.info(f"Received response: {response}")
        except asyncio.TimeoutError:
            logger.error("Timeout waiting for response")
        
        await websocket.close()
        logger.info("Connection closed")
        
    except Exception as e:
        logger.error(f"Connection test failed: {e}")
        logger.error(f"Exception type: {type(e)}")

if __name__ == "__main__":
    asyncio.run(test_connection())