#!/usr/bin/env python3
"""
Simple Multi-Monitor Test Client for TRAE Unity AI Platform
Tests multi-monitor detection and capture without external dependencies.

Usage:
python simple_multi_monitor_test.py --server-url ws://localhost:8084
"""

import asyncio
import websockets
import json
import base64
import time
import logging
from io import BytesIO
from PIL import Image, ImageGrab
import argparse
import uuid
import threading
import signal
import sys
from typing import Optional, Dict, Any, List
import tkinter as tk

# Configure logging with clear formatting for debugging
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class SimpleMultiMonitorTestClient:
    """
    Simple multi-monitor test client using tkinter for monitor detection.
    Follows TRAE Unity AI Platform naming conventions and coding standards.
    """
    
    def __init__(self, server_url: str, client_id: Optional[str] = None):
        """
        Initialize the simple multi-monitor test client.
        
        Args:
            server_url: WebSocket server URL to connect to
            client_id: Optional client identifier (auto-generated if not provided)
        """
        self.server_url = server_url
        self.client_id = client_id or str(uuid.uuid4())
        self.websocket: Optional[websockets.WebSocketServerProtocol] = None
        self.is_capturing = False
        
        # Capture configuration following TRAE standards
        self.capture_config = {
            'fps': 5,  # Lower FPS for testing
            'quality': 60,  # Lower quality for testing
            'scale': 0.5,  # Smaller scale for testing
            'format': 'jpeg',
            'capture_mode': 'all_monitors'
        }
        
        # Monitor detection and management
        self.monitors = []
        self.monitor_info = {}
        self.frame_count = 0
        self.capture_thread: Optional[threading.Thread] = None
        self.running = False
        self.frame_queue = None  # Will be initialized as asyncio.Queue
        self.loop = None
        
        # Initialize monitor detection
        self._detect_monitors_simple()

    def _detect_monitors_simple(self):
        """
        Simple monitor detection using tkinter.
        Follows TRAE Unity AI Platform standards for clear debugging.
        """
        try:
            # Create a temporary tkinter root to get screen info
            root = tk.Tk()
            root.withdraw()  # Hide the window
            
            # Get screen dimensions
            screen_width = root.winfo_screenwidth()
            screen_height = root.winfo_screenheight()
            
            # Try to detect multiple monitors using virtual screen size
            virtual_width = root.winfo_vrootwidth()
            virtual_height = root.winfo_vrootheight()
            
            root.destroy()
            
            logger.info(f"Screen dimensions: {screen_width}x{screen_height}")
            logger.info(f"Virtual screen dimensions: {virtual_width}x{virtual_height}")
            
            # Simple heuristic: if virtual width is much larger than screen width, 
            # we likely have multiple monitors
            if virtual_width > screen_width * 1.5:
                # Assume dual monitor setup side by side
                self.monitor_info = {
                    'monitor_0': {
                        'index': 0,
                        'name': 'Primary Monitor',
                        'x': 0,
                        'y': 0,
                        'width': screen_width,
                        'height': screen_height,
                        'is_primary': True
                    },
                    'monitor_1': {
                        'index': 1,
                        'name': 'Secondary Monitor',
                        'x': screen_width,
                        'y': 0,
                        'width': virtual_width - screen_width,
                        'height': screen_height,
                        'is_primary': False
                    }
                }
                logger.info("Detected dual monitor setup:")
                logger.info(f"  Primary: {screen_width}x{screen_height} at (0, 0)")
                logger.info(f"  Secondary: {virtual_width - screen_width}x{screen_height} at ({screen_width}, 0)")
            else:
                # Single monitor
                self.monitor_info = {
                    'monitor_0': {
                        'index': 0,
                        'name': 'Primary Monitor',
                        'x': 0,
                        'y': 0,
                        'width': screen_width,
                        'height': screen_height,
                        'is_primary': True
                    }
                }
                logger.info("Detected single monitor setup:")
                logger.info(f"  Primary: {screen_width}x{screen_height} at (0, 0)")
                
        except Exception as e:
            logger.error(f"Error detecting monitors: {e}")
            # Fallback to single monitor
            self.monitor_info = {
                'monitor_0': {
                    'index': 0,
                    'name': 'Primary Monitor',
                    'x': 0,
                    'y': 0,
                    'width': 1920,
                    'height': 1080,
                    'is_primary': True
                }
            }
            logger.warning("Using fallback single monitor configuration")

    async def connect(self):
        """
        Connect to the WebSocket server with enhanced error handling.
        Follows TRAE Unity AI Platform connection standards.
        """
        try:
            # Store the event loop for later use
            self.loop = asyncio.get_event_loop()
            
            # Initialize the async frame queue
            self.frame_queue = asyncio.Queue()
            
            # Add client type and ID to URL parameters
            url = f"{self.server_url}?client_type=desktop&client_id={self.client_id}"
            logger.info(f"Connecting to {url}")
            
            # Connect with longer timeout and disabled ping
            self.websocket = await asyncio.wait_for(
                websockets.connect(url, ping_interval=None, ping_timeout=None),
                timeout=30.0
            )
            self.running = True
            
            logger.info(f"Connected as simple multi-monitor test client: {self.client_id}")
            
            # Send capability report with monitor information
            await self.send_capabilities()
            
            # Wait for handshake acknowledgment
            handshake_success = await self.wait_for_handshake_ack()
            if not handshake_success:
                logger.error("Handshake failed - disconnecting")
                await self.disconnect()
                return
            
            # Start frame processor task
            asyncio.create_task(self.process_frame_queue())
            
            # Start message handler
            await self.handle_messages()
            
        except asyncio.TimeoutError:
            logger.error("Connection timeout - server may be unavailable")
            await self.disconnect()
        except Exception as e:
            logger.error(f"Connection error: {e}")
            logger.error(f"Exception type: {type(e)}")
            await self.disconnect()

    async def send_capabilities(self):
        """
        Send enhanced client capabilities including monitor information.
        Follows TRAE Unity AI Platform capability reporting standards.
        """
        capabilities = {
            'type': 'handshake',
            'timestamp': time.time(),
            'clientInfo': {
                'clientType': 'simple_multi_monitor_test',
                'clientId': self.client_id,
                'version': '1.0.0',
                'capabilities': [
                    'desktop_stream', 
                    'screen_capture', 
                    'multi_monitor_test'
                ],
                'screen_capture': True,
                'multiple_monitors': len(self.monitor_info) > 1,
                'monitor_count': len(self.monitor_info),
                'monitor_info': self.monitor_info,
                'supported_formats': ['jpeg', 'png'],
                'compression_levels': [1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
            }
        }
        
        await self.send_message(capabilities)
        logger.info(f"Sent handshake with simple multi-monitor capabilities ({len(self.monitor_info)} monitors)")

    async def wait_for_handshake_ack(self):
        """
        Wait for handshake acknowledgment from the server.
        Enhanced with better error handling following TRAE standards.
        """
        try:
            timeout = 10.0
            start_time = time.time()
            
            while time.time() - start_time < timeout:
                try:
                    message = await asyncio.wait_for(self.websocket.recv(), timeout=1.0)
                    data = json.loads(message)
                    
                    if data.get('type') == 'connection_established':
                        logger.info("Connection established message received")
                        continue
                    elif data.get('type') == 'handshake_ack':
                        logger.info("Handshake acknowledgment received")
                        return True
                    else:
                        logger.warning(f"Unexpected message during handshake: {data.get('type')}")
                        
                except asyncio.TimeoutError:
                    continue
                except json.JSONDecodeError as e:
                    logger.error(f"Invalid JSON during handshake: {e}")
                    continue
                    
            logger.error("Timeout waiting for handshake acknowledgment")
            return False
            
        except Exception as e:
            logger.error(f"Error waiting for handshake ack: {e}")
            return False

    async def send_message(self, message: Dict[str, Any]):
        """Send a message to the server with error handling."""
        if self.websocket:
            try:
                await self.websocket.send(json.dumps(message))
            except Exception as e:
                logger.error(f"Error sending message: {e}")

    async def handle_messages(self):
        """Handle incoming messages from the server."""
        try:
            async for message in self.websocket:
                try:
                    data = json.loads(message)
                    await self.process_message(data)
                except json.JSONDecodeError as e:
                    logger.error(f"Invalid JSON received: {e}")
                except Exception as e:
                    logger.error(f"Error processing message: {e}")
        except websockets.exceptions.ConnectionClosed:
            logger.info("Connection closed by server")
        except Exception as e:
            logger.error(f"Message handling error: {e}")

    async def process_message(self, data: Dict[str, Any]):
        """Process individual messages from the server."""
        message_type = data.get('type')
        logger.info(f"Received message: {message_type}")

        if message_type == 'connection_established':
            logger.info(f"Connection established: {data}")
            
        elif message_type == 'handshake_ack':
            logger.info(f"Handshake acknowledged: {data}")
            
        elif message_type == 'start_capture':
            config = data.get('config', {})
            await self.start_capture(config)
            
        elif message_type == 'stop_capture':
            await self.stop_capture()
            
        elif message_type == 'capture_screenshot':
            monitor_id = data.get('monitor_id', 'all')
            await self.capture_single_screenshot(monitor_id)
            
        elif message_type == 'ping':
            await self.send_message({
                'type': 'pong',
                'timestamp': time.time()
            })
            
        else:
            logger.warning(f"Unknown message type: {message_type}")

    async def start_capture(self, config: Dict[str, Any]):
        """Start continuous multi-monitor screen capture."""
        if self.is_capturing:
            logger.warning("Capture already running")
            return

        self.capture_config.update(config)
        self.is_capturing = True
        self.frame_count = 0

        logger.info(f"Starting simple multi-monitor capture with config: {self.capture_config}")

        await self.send_message({
            'type': 'stream_status',
            'streaming': True,
            'config': self.capture_config,
            'monitor_info': self.monitor_info,
            'timestamp': time.time()
        })

        self.capture_thread = threading.Thread(target=self.capture_loop)
        self.capture_thread.daemon = True
        self.capture_thread.start()

    async def stop_capture(self):
        """Stop continuous screen capture."""
        if not self.is_capturing:
            logger.warning("Capture not running")
            return

        self.is_capturing = False
        logger.info("Stopping simple multi-monitor capture")

        if self.capture_thread and self.capture_thread.is_alive():
            self.capture_thread.join(timeout=2)

        await self.send_message({
            'type': 'stream_status',
            'streaming': False,
            'timestamp': time.time()
        })

    async def process_frame_queue(self):
        """Process frames from the queue and send them via WebSocket."""
        while self.running:
            try:
                frame_data = await asyncio.wait_for(self.frame_queue.get(), timeout=0.1)
                if frame_data:
                    await self.send_frame(frame_data)
                    self.frame_queue.task_done()
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"Frame processing error: {e}")
                await asyncio.sleep(0.1)

    def capture_loop(self):
        """Main capture loop for simple multi-monitor testing."""
        fps = self.capture_config.get('fps', 5)
        frame_interval = 1.0 / fps

        logger.info(f"Starting simple multi-monitor capture loop at {fps} FPS")

        while self.is_capturing and self.running:
            try:
                start_time = time.time()
                
                # Test different capture methods
                screenshot_data_list = self.test_multi_monitor_capture()
                
                for screenshot_data in screenshot_data_list:
                    if screenshot_data:
                        if self.loop and self.frame_queue:
                            future = asyncio.run_coroutine_threadsafe(
                                self.frame_queue.put(screenshot_data), 
                                self.loop
                            )
                        
                self.frame_count += 1

                elapsed = time.time() - start_time
                sleep_time = max(0, frame_interval - elapsed)
                
                if sleep_time > 0:
                    time.sleep(sleep_time)

            except Exception as e:
                logger.error(f"Simple multi-monitor capture loop error: {e}")
                time.sleep(0.1)

        logger.info("Simple multi-monitor capture loop ended")

    def test_multi_monitor_capture(self) -> List[Dict[str, Any]]:
        """Test multi-monitor capture methods."""
        screenshot_data_list = []
        
        try:
            # Method 1: Full virtual screen capture
            logger.debug("Capturing full virtual screen")
            full_screenshot = ImageGrab.grab()
            full_data = self._process_screenshot(full_screenshot, 'full_virtual_screen')
            if full_data:
                screenshot_data_list.append(full_data)
            
            # Method 2: Try to capture individual monitors if we detected multiple
            if len(self.monitor_info) > 1:
                for monitor_id, monitor_info in self.monitor_info.items():
                    logger.debug(f"Attempting to capture {monitor_id}")
                    monitor_data = self.capture_monitor_by_bbox(monitor_info, monitor_id)
                    if monitor_data:
                        screenshot_data_list.append(monitor_data)
                        
        except Exception as e:
            logger.error(f"Error in test multi-monitor capture: {e}")
            
        return screenshot_data_list

    def capture_monitor_by_bbox(self, monitor_info: Dict[str, Any], monitor_id: str) -> Optional[Dict[str, Any]]:
        """Capture screenshot from specific monitor using bounding box."""
        try:
            bbox = (
                monitor_info['x'],
                monitor_info['y'],
                monitor_info['x'] + monitor_info['width'],
                monitor_info['y'] + monitor_info['height']
            )
            
            logger.debug(f"Capturing {monitor_id} with bbox: {bbox}")
            screenshot = ImageGrab.grab(bbox=bbox)
            
            return self._process_screenshot(screenshot, monitor_id)
            
        except Exception as e:
            logger.error(f"Error capturing monitor {monitor_id}: {e}")
            return None

    def _process_screenshot(self, screenshot: Image.Image, monitor_id: str) -> Optional[Dict[str, Any]]:
        """Process a screenshot image and return formatted data."""
        try:
            original_width, original_height = screenshot.size
            
            scale = self.capture_config.get('scale', 0.5)
            if scale != 1.0:
                width, height = screenshot.size
                new_size = (int(width * scale), int(height * scale))
                screenshot = screenshot.resize(new_size, Image.Resampling.LANCZOS)

            final_width, final_height = screenshot.size

            buffer = BytesIO()
            format_type = self.capture_config.get('format', 'jpeg').upper()
            quality = self.capture_config.get('quality', 60)
            
            if format_type == 'JPEG':
                screenshot.save(buffer, format='JPEG', quality=quality, optimize=True)
            else:
                screenshot.save(buffer, format='PNG', optimize=True)

            buffer.seek(0)
            image_data = base64.b64encode(buffer.getvalue()).decode('utf-8')
            
            return {
                'image_data': image_data,
                'width': final_width,
                'height': final_height,
                'original_width': original_width,
                'original_height': original_height,
                'monitor_id': monitor_id,
                'is_single': False
            }

        except Exception as e:
            logger.error(f"Screenshot processing error for {monitor_id}: {e}")
            return None

    async def capture_single_screenshot(self, monitor_id: str = 'all'):
        """Capture and send a single screenshot from specified monitor(s)."""
        logger.info(f"Capturing single screenshot from {monitor_id}")
        
        screenshot_data_list = self.test_multi_monitor_capture()
        
        for screenshot_data in screenshot_data_list:
            if screenshot_data:
                screenshot_data['is_single'] = True
                await self.frame_queue.put(screenshot_data)

    async def send_frame(self, frame_data: Dict[str, Any]):
        """Send a frame to the server."""
        message = {
            'type': 'frame_data',
            'frameData': frame_data['image_data'],
            'frameNumber': self.frame_count,
            'timestamp': time.time(),
            'isSingle': frame_data.get('is_single', False),
            'width': frame_data['width'],
            'height': frame_data['height'],
            'monitorId': frame_data.get('monitor_id', 'unknown'),
            'metadata': {
                'clientId': self.client_id,
                'clientType': 'simple_multi_monitor_test',
                'config': self.capture_config,
                'dataSize': len(frame_data['image_data']),
                'dimensions': {
                    'width': frame_data['width'],
                    'height': frame_data['height'],
                    'original_width': frame_data['original_width'],
                    'original_height': frame_data['original_height']
                },
                'monitor_info': self.monitor_info.get(frame_data.get('monitor_id', ''), {})
            }
        }

        await self.send_message(message)

    async def disconnect(self):
        """Disconnect from the WebSocket server with proper cleanup."""
        logger.info("Initiating simple multi-monitor test client disconnect...")
        self.running = False
        
        if self.is_capturing:
            await self.stop_capture()
        
        if self.capture_thread and self.capture_thread.is_alive():
            logger.info("Waiting for capture thread to finish...")
            self.capture_thread.join(timeout=3)
            if self.capture_thread.is_alive():
                logger.warning("Capture thread did not finish gracefully")
        
        if self.websocket:
            try:
                await self.send_message({
                    'type': 'client_disconnect',
                    'clientId': self.client_id,
                    'timestamp': time.time(),
                    'client_type': 'simple_multi_monitor_test'
                })
                await asyncio.sleep(0.1)
            except Exception as e:
                logger.warning(f"Could not send disconnect message: {e}")
            
            try:
                await self.websocket.close()
                logger.info("WebSocket connection closed")
            except Exception as e:
                logger.warning(f"Error closing WebSocket: {e}")
        
        logger.info("Simple multi-monitor test client disconnect completed")

async def main():
    """Main function following TRAE Unity AI Platform standards."""
    parser = argparse.ArgumentParser(description='Simple Multi-Monitor Test Client for TRAE Unity AI Platform')
    parser.add_argument('--server-url', 
                       default='ws://localhost:8084',
                       help='WebSocket server URL')
    parser.add_argument('--client-id', 
                       help='Optional client ID (will generate if not provided)')
    parser.add_argument('--log-level', 
                       choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'], 
                       default='INFO',
                       help='Logging level')

    args = parser.parse_args()

    # Set logging level
    logging.getLogger().setLevel(getattr(logging, args.log_level))

    # Create and run client
    client = SimpleMultiMonitorTestClient(args.server_url, args.client_id)
    
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
        logger.info("Starting Simple Multi-Monitor Test Client...")
        logger.info(f"Server URL: {args.server_url}")
        logger.info(f"Client ID: {client.client_id}")
        
        await client.connect()
        
        # Keep the client running until interrupted
        while client.running and client.websocket and not client.websocket.closed:
            await asyncio.sleep(1)
        
    except KeyboardInterrupt:
        logger.info("Received interrupt signal")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
    finally:
        logger.info("Shutting down simple multi-monitor test client...")
        await client.disconnect()
        logger.info("Simple Multi-Monitor Test Client stopped")

if __name__ == '__main__':
    asyncio.run(main())