#!/usr/bin/env python3
"""
Desktop Capture Client for TRAE Unity AI Platform
Captures desktop screenshots and streams them to the Supabase edge function.

Requirements:
- pip install websockets pillow pynput pyautogui

Usage:
python desktop_capture_client.py --server-url wss://dgzreelowtzquljhxskq.functions.supabase.co/live-desktop-stream
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
from typing import Optional, Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DesktopCaptureClient:
    def __init__(self, server_url: str, client_id: Optional[str] = None):
        self.server_url = server_url
        self.client_id = client_id or str(uuid.uuid4())
        self.websocket: Optional[websockets.WebSocketServerProtocol] = None
        self.is_capturing = False
        self.capture_config = {
            'fps': 10,
            'quality': 80,
            'scale': 1.0,
            'format': 'jpeg'
        }
        self.frame_count = 0
        self.capture_thread: Optional[threading.Thread] = None
        self.running = False
        self.frame_queue = None  # Will be initialized as asyncio.Queue
        self.loop = None

    async def connect(self):
        """Connect to the WebSocket server."""
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
            
            logger.info(f"Connected as desktop client: {self.client_id}")
            
            # Send capability report
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

    async def disconnect(self):
        """Disconnect from the WebSocket server."""
        self.running = False
        self.is_capturing = False
        
        if self.capture_thread and self.capture_thread.is_alive():
            self.capture_thread.join(timeout=2)
        
        if self.websocket:
            await self.websocket.close()
            logger.info("Disconnected from server")

    async def send_capabilities(self):
        """Send client capabilities to the server."""
        capabilities = {
            'type': 'handshake',
            'timestamp': time.time(),
            'clientInfo': {
                'clientType': 'desktop_capture',
                'clientId': self.client_id,
                'version': '1.0.0',
                'capabilities': ['desktop_stream', 'screen_capture', 'mouse_control', 'keyboard_control'],
                'screen_capture': True,
                'multiple_monitors': True,
                'mouse_control': True,
                'keyboard_control': True,
                'file_operations': True,
                'max_resolution': [1920, 1080],
                'supported_formats': ['jpeg', 'png'],
                'compression_levels': [1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
            }
        }
        
        await self.send_message(capabilities)
        logger.info("Sent handshake with capabilities")

    async def wait_for_handshake_ack(self):
        """Wait for handshake acknowledgment from the server."""
        try:
            # Wait for handshake acknowledgment with timeout
            timeout = 10.0  # 10 second timeout
            start_time = time.time()
            
            while time.time() - start_time < timeout:
                try:
                    # Check for incoming message with short timeout
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
                    # Continue waiting
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
        """Send a message to the server."""
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
            # Connection is now fully established
            
        elif message_type == 'handshake_ack':
            logger.info(f"Handshake acknowledged: {data}")
            # Handshake completed successfully
            
        elif message_type == 'start_capture':
            config = data.get('config', {})
            await self.start_capture(config)
            
        elif message_type == 'stop_capture':
            await self.stop_capture()
            
        elif message_type == 'config_update':
            config = data.get('config', {})
            self.update_config(config)
            
        elif message_type == 'capture_screenshot':
            await self.capture_single_screenshot()
            
        elif message_type == 'ping':
            await self.send_message({
                'type': 'pong',
                'timestamp': time.time()
            })
            
        else:
            logger.warning(f"Unknown message type: {message_type}")

    async def start_capture(self, config: Dict[str, Any]):
        """Start continuous screen capture."""
        if self.is_capturing:
            logger.warning("Capture already running")
            return

        # Update configuration
        self.capture_config.update(config)
        self.is_capturing = True
        self.frame_count = 0

        logger.info(f"Starting capture with config: {self.capture_config}")

        # Send status update
        await self.send_message({
            'type': 'stream_status',
            'streaming': True,
            'config': self.capture_config,
            'timestamp': time.time()
        })

        # Start capture in separate thread to avoid blocking
        self.capture_thread = threading.Thread(target=self.capture_loop)
        self.capture_thread.daemon = True
        self.capture_thread.start()

    async def stop_capture(self):
        """Stop continuous screen capture."""
        if not self.is_capturing:
            logger.warning("Capture not running")
            return

        self.is_capturing = False
        logger.info("Stopping capture")

        # Wait for capture thread to finish
        if self.capture_thread and self.capture_thread.is_alive():
            self.capture_thread.join(timeout=2)

        # Send status update
        await self.send_message({
            'type': 'stream_status',
            'streaming': False,
            'timestamp': time.time()
        })

    def update_config(self, config: Dict[str, Any]):
        """Update capture configuration."""
        self.capture_config.update(config)
        logger.info(f"Updated config: {self.capture_config}")

    async def process_frame_queue(self):
        """Process frames from the queue and send them via WebSocket."""
        while self.running:
            try:
                # Get frame from queue with timeout using asyncio
                frame_data = await asyncio.wait_for(self.frame_queue.get(), timeout=0.1)
                if frame_data:
                    await self.send_frame(
                        frame_data['image_data'], 
                        frame_data['width'],
                        frame_data['height'],
                        frame_data['original_width'],
                        frame_data['original_height'],
                        frame_data.get('is_single', False)
                    )
                    self.frame_queue.task_done()
            except asyncio.TimeoutError:
                # No frames in queue, continue
                continue
            except Exception as e:
                logger.error(f"Frame processing error: {e}")
                await asyncio.sleep(0.1)

    def capture_loop(self):
        """Main capture loop (runs in separate thread)."""
        fps = self.capture_config.get('fps', 10)
        frame_interval = 1.0 / fps

        logger.info(f"Starting capture loop at {fps} FPS")

        while self.is_capturing and self.running:
            try:
                start_time = time.time()
                
                # Capture screenshot
                screenshot_data = self.capture_screenshot()
                if screenshot_data:
                    # Add frame to queue for async processing using thread-safe method
                    frame_data = {
                        'image_data': screenshot_data['image_data'],
                        'width': screenshot_data['width'],
                        'height': screenshot_data['height'],
                        'original_width': screenshot_data['original_width'],
                        'original_height': screenshot_data['original_height'],
                        'is_single': False
                    }
                    # Use asyncio.run_coroutine_threadsafe to put item in async queue from thread
                    if self.loop and self.frame_queue:
                        future = asyncio.run_coroutine_threadsafe(
                            self.frame_queue.put(frame_data), 
                            self.loop
                        )
                        # Don't wait for the future to complete to avoid blocking
                    self.frame_count += 1

                # Calculate sleep time to maintain FPS
                elapsed = time.time() - start_time
                sleep_time = max(0, frame_interval - elapsed)
                
                if sleep_time > 0:
                    time.sleep(sleep_time)

            except Exception as e:
                logger.error(f"Capture loop error: {e}")
                time.sleep(0.1)  # Brief pause before retrying

        logger.info("Capture loop ended")

    def capture_screenshot(self) -> Optional[dict]:
        """Capture a single screenshot and return as base64 encoded string with dimensions."""
        try:
            # Capture the screen
            screenshot = ImageGrab.grab()
            original_width, original_height = screenshot.size
            
            # Apply scaling if needed
            scale = self.capture_config.get('scale', 1.0)
            if scale != 1.0:
                width, height = screenshot.size
                new_size = (int(width * scale), int(height * scale))
                screenshot = screenshot.resize(new_size, Image.Resampling.LANCZOS)

            final_width, final_height = screenshot.size

            # Convert to bytes
            buffer = BytesIO()
            format_type = self.capture_config.get('format', 'jpeg').upper()
            quality = self.capture_config.get('quality', 80)
            
            if format_type == 'JPEG':
                screenshot.save(buffer, format='JPEG', quality=quality, optimize=True)
            else:
                screenshot.save(buffer, format='PNG', optimize=True)

            # Encode as base64
            buffer.seek(0)
            image_data = base64.b64encode(buffer.getvalue()).decode('utf-8')
            
            return {
                'image_data': image_data,
                'width': final_width,
                'height': final_height,
                'original_width': original_width,
                'original_height': original_height
            }

        except Exception as e:
            logger.error(f"Screenshot capture error: {e}")
            return None

    async def capture_single_screenshot(self):
        """Capture and send a single screenshot."""
        logger.info("Capturing single screenshot")
        screenshot_data = self.capture_screenshot()
        if screenshot_data:
            frame_data = {
                'image_data': screenshot_data['image_data'],
                'width': screenshot_data['width'],
                'height': screenshot_data['height'],
                'original_width': screenshot_data['original_width'],
                'original_height': screenshot_data['original_height'],
                'is_single': True
            }
            await self.frame_queue.put(frame_data)

    async def send_frame(self, image_data: str, width: int, height: int, original_width: int, original_height: int, is_single: bool = False):
        """Send a frame to the server."""
        message = {
            'type': 'frame_data',
            'frameData': image_data,
            'frameNumber': self.frame_count,
            'timestamp': time.time(),
            'isSingle': is_single,
            'width': width,
            'height': height,
            'metadata': {
                'clientId': self.client_id,
                'config': self.capture_config,
                'dataSize': len(image_data),
                'dimensions': {
                    'width': width,
                    'height': height,
                    'original_width': original_width,
                    'original_height': original_height
                }
            }
        }

        await self.send_message(message)

async def main():
    parser = argparse.ArgumentParser(description='Desktop Capture Client for TRAE Unity AI Platform')
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
    client = DesktopCaptureClient(args.server_url, args.client_id)
    
    try:
        logger.info("Starting Desktop Capture Client...")
        logger.info(f"Server URL: {args.server_url}")
        logger.info(f"Client ID: {client.client_id}")
        
        await client.connect()
        
    except KeyboardInterrupt:
        logger.info("Received interrupt signal")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
    finally:
        await client.disconnect()
        logger.info("Desktop Capture Client stopped")

if __name__ == '__main__':
    asyncio.run(main())