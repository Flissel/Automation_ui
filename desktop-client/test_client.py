#!/usr/bin/env python3
"""
Test script for the desktop capture client with proper cleanup.
This script demonstrates how to start and stop the client cleanly.
"""

import asyncio
import signal
import sys
import logging
from desktop_capture_client import DesktopCaptureClient

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def test_client():
    """Test the desktop capture client with proper cleanup."""
    client = DesktopCaptureClient('ws://localhost:8084', 'test-client-001')
    
    # Signal handler for graceful shutdown
    def signal_handler(signum, frame):
        logger.info(f"Received signal {signum}, initiating graceful shutdown...")
        client.running = False
        if client.is_capturing:
            asyncio.create_task(client.stop_capture())
    
    # Register signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        logger.info("Starting test client...")
        await client.connect()
        
        # Keep the client running for a short time
        logger.info("Client connected, running for 30 seconds...")
        for i in range(30):
            if not client.running or not client.websocket or client.websocket.closed:
                break
            await asyncio.sleep(1)
            if i % 10 == 0:
                logger.info(f"Client running... {30-i} seconds remaining")
        
        logger.info("Test completed, shutting down...")
        
    except KeyboardInterrupt:
        logger.info("Received interrupt signal")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
    finally:
        logger.info("Shutting down client...")
        await client.disconnect()
        logger.info("Test client stopped")

if __name__ == '__main__':
    asyncio.run(test_client())