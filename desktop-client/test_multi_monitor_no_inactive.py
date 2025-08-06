#!/usr/bin/env python3
"""
Test Multi-Monitor Desktop Capture Client with disabled inactive detection.
Part of TRAE Unity AI Platform - Multi-Monitor Capture System
"""

import asyncio
import sys
import os

# Add the current directory to Python path to import the main client
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from multi_monitor_capture_client import MultiMonitorDesktopCaptureClient
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def main():
    """Test client with disabled inactive detection."""
    logger.info("🔧 Starting Multi-Monitor Client with DISABLED inactive detection")
    logger.info("This will show the raw capture from both monitors, even if they appear black")
    
    # Create client
    client = MultiMonitorDesktopCaptureClient('ws://localhost:8084')
    
    # DISABLE inactive detection
    client.capture_config['disable_inactive_detection'] = True
    client.capture_config['inactive_threshold'] = 99.9  # Very high threshold as backup
    
    logger.info("✅ Inactive detection DISABLED")
    logger.info("📺 Both monitors will show raw capture content")
    
    try:
        # Connect and start capture
        await client.connect()
        await client.start_capture()
        
        # Keep running
        while client.running:
            await asyncio.sleep(1)
            
    except KeyboardInterrupt:
        logger.info("Received interrupt signal, shutting down...")
    except Exception as e:
        logger.error(f"Client error: {e}")
    finally:
        if client.is_capturing:
            await client.stop_capture()
        await client.disconnect()

if __name__ == "__main__":
    asyncio.run(main())