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
import signal
import sys
import tkinter as tk
from typing import Optional, Dict, Any, List

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DesktopCaptureClient:
    def __init__(self, server_url: str, client_id: Optional[str] = None):
        """
        Initialize the desktop capture client.
        
        Args:
            server_url: WebSocket server URL to connect to
            client_id: Optional client identifier (auto-generated if not provided)
        """
        self.server_url = server_url
        self.client_id = client_id or str(uuid.uuid4())
        self.websocket: Optional[websockets.WebSocketServerProtocol] = None
        self.is_capturing = False
        
        # Desktop instance identification
        self.desktop_id: Optional[str] = None
        self.screen_id: Optional[str] = None
        
        # Capture configuration
        self.capture_config = {
            'fps': 30,
            'quality': 80,
            'scale': 1.0,
            'format': 'jpeg',
            'capture_mode': 'all_monitors'  # 'primary', 'all_monitors', 'specific_monitor'
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
        self._detect_monitors()

    def _detect_monitors(self):
        """
        Detect available monitors using tkinter.
        Enhanced to support multiple monitor detection.
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
            
            # Test actual capture capabilities
            try:
                # Test if we can capture the full virtual desktop
                test_screenshot = ImageGrab.grab(bbox=(0, 0, virtual_width, virtual_height))
                actual_capture_width, actual_capture_height = test_screenshot.size
                logger.info(f"Actual capture test: {actual_capture_width}x{actual_capture_height}")
                
                # If the capture size matches virtual size, we can capture multiple monitors
                if actual_capture_width == virtual_width and actual_capture_height == virtual_height:
                    logger.info("Full virtual desktop capture confirmed")
                else:
                    logger.warning(f"Virtual desktop capture limited to {actual_capture_width}x{actual_capture_height}")
                    
            except Exception as e:
                logger.warning(f"Virtual desktop capture test failed: {e}")
            
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
        """Connect to the WebSocket server."""
        try:
            # Store the event loop for later use
            self.loop = asyncio.get_event_loop()
            
            # Initialize the async frame queue
            self.frame_queue = asyncio.Queue()
            
            # Add client type and ID to URL parameters
            url = f"{self.server_url}?client_type=desktop&client_id={self.client_id}"
            logger.info(f"Connecting to {url}")
            
            # Connect with compatible ping settings for server heartbeat
            self.websocket = await asyncio.wait_for(
                websockets.connect(url, ping_interval=30, ping_timeout=10),
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
        logger.info("Initiating disconnect...")
        self.running = False
        
        # Stop capture if running
        if self.is_capturing:
            await self.stop_capture()
        
        # Wait for capture thread to finish
        if self.capture_thread and self.capture_thread.is_alive():
            logger.info("Waiting for capture thread to finish...")
            self.capture_thread.join(timeout=3)
            if self.capture_thread.is_alive():
                logger.warning("Capture thread did not finish gracefully")
        
        # Close WebSocket connection
        if self.websocket:
            try:
                # Send disconnect message if possible
                await self.send_message({
                    'type': 'client_disconnect',
                    'clientId': self.client_id,
                    'timestamp': time.time()
                })
                await asyncio.sleep(0.1)  # Brief delay to ensure message is sent
            except Exception as e:
                logger.warning(f"Could not send disconnect message: {e}")
            
            try:
                await self.websocket.close()
                logger.info("WebSocket connection closed")
            except Exception as e:
                logger.warning(f"Error closing WebSocket: {e}")
        
        logger.info("Disconnect completed")

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
                'compression_levels': [1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
                'desktopId': self.desktop_id,
                'screenId': self.screen_id,
                'monitorInfo': self.monitor_info,
                'captureConfig': self.capture_config
            }
        }
        
        await self.send_message(capabilities)
        logger.info(f"Sent handshake with capabilities for desktop {self.desktop_id}, screen {self.screen_id}")

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
            
        elif message_type == 'frame_data':
            # Desktop client should not normally receive frame_data messages
            # This might indicate a server-side routing issue
            logger.debug(f"Received frame_data message (unexpected for desktop client)")
            # Silently ignore to prevent spam, but log at debug level for troubleshooting
            
        else:
            logger.warning(f"Unknown message type: {message_type}")

    async def start_capture(self, config: Dict[str, Any]):
        """Start continuous screen capture."""
        if self.is_capturing:
            logger.warning("Capture already running")
            # Still send status update to inform web client of current state
            await self.send_message({
                'type': 'stream_status',
                'streaming': True,
                'config': self.capture_config,
                'timestamp': time.time()
            })
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
                        frame_data.get('is_single', False),
                        frame_data.get('monitor_id', 'unknown')
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
                
                # Capture screenshots (can be multiple for multi-monitor)
                screenshot_data_list = self.capture_screenshot()
                for screenshot_data in screenshot_data_list:
                    if screenshot_data:
                        # Add frame to queue for async processing using thread-safe method
                        frame_data = {
                            'image_data': screenshot_data['image_data'],
                            'width': screenshot_data['width'],
                            'height': screenshot_data['height'],
                            'original_width': screenshot_data['original_width'],
                            'original_height': screenshot_data['original_height'],
                            'monitor_id': screenshot_data.get('monitor_id', 'unknown'),
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

    def capture_screenshot(self) -> List[dict]:
        """Capture screenshots from all monitors and return as list of base64 encoded strings with dimensions."""
        screenshot_data_list = []
        
        try:
            capture_mode = self.capture_config.get('capture_mode', 'all_monitors')
            
            if capture_mode == 'specific_monitor':
                # Capture specific monitor only
                target_monitor = self.capture_config.get('target_monitor', 0)
                monitor_id = f'monitor_{target_monitor}'
                
                if monitor_id in self.monitor_info:
                    monitor_info = self.monitor_info[monitor_id]
                    screenshot_data = self.capture_monitor_by_info(monitor_info, monitor_id)
                    if screenshot_data:
                        screenshot_data_list.append(screenshot_data)
                else:
                    logger.warning(f"Target monitor {target_monitor} not found, falling back to primary")
                    # Fallback to primary monitor
                    screenshot = ImageGrab.grab()
                    screenshot_data = self._process_screenshot(screenshot, f'monitor_{target_monitor}')
                    if screenshot_data:
                        screenshot_data_list.append(screenshot_data)
                        
            elif capture_mode == 'all_monitors' and len(self.monitor_info) > 1:
                # Capture each monitor separately
                for monitor_id, monitor_info in self.monitor_info.items():
                    screenshot_data = self.capture_monitor_by_info(monitor_info, monitor_id)
                    if screenshot_data:
                        screenshot_data_list.append(screenshot_data)
            else:
                # Capture entire screen as single image (fallback or single monitor)
                screenshot = ImageGrab.grab()
                screenshot_data = self._process_screenshot(screenshot, 'combined_monitors')
                if screenshot_data:
                    screenshot_data_list.append(screenshot_data)
                    
        except Exception as e:
            logger.error(f"Screenshot capture error: {e}")
            
        return screenshot_data_list

    def capture_monitor_by_info(self, monitor_info: Dict[str, Any], monitor_id: str) -> Optional[Dict[str, Any]]:
        """Capture screenshot from specific monitor using monitor info."""
        try:
            # Define the bounding box for this monitor
            bbox = (
                monitor_info['x'],
                monitor_info['y'],
                monitor_info['x'] + monitor_info['width'],
                monitor_info['y'] + monitor_info['height']
            )
            
            # Capture the specific monitor area
            screenshot = ImageGrab.grab(bbox=bbox)
            
            return self._process_screenshot(screenshot, monitor_id)
            
        except Exception as e:
            logger.error(f"Error capturing monitor {monitor_id}: {e}")
            return None

    def _process_screenshot(self, screenshot: Image.Image, monitor_id: str) -> Optional[Dict[str, Any]]:
        """Process a screenshot image and return formatted data."""
        try:
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
                'original_height': original_height,
                'monitor_id': monitor_id
            }

        except Exception as e:
            logger.error(f"Screenshot processing error for {monitor_id}: {e}")
            return None

    async def capture_single_screenshot(self):
        """Capture and send a single screenshot."""
        logger.info("Capturing single screenshot")
        screenshot_data_list = self.capture_screenshot()
        for screenshot_data in screenshot_data_list:
            if screenshot_data:
                frame_data = {
                    'image_data': screenshot_data['image_data'],
                    'width': screenshot_data['width'],
                    'height': screenshot_data['height'],
                    'original_width': screenshot_data['original_width'],
                    'original_height': screenshot_data['original_height'],
                    'monitor_id': screenshot_data.get('monitor_id', 'unknown'),
                    'is_single': True
                }
                await self.frame_queue.put(frame_data)

    async def send_frame(self, image_data: str, width: int, height: int, original_width: int, original_height: int, is_single: bool = False, monitor_id: str = 'unknown'):
        """Send a frame to the server."""
        message = {
            'type': 'frame_data',
            'frameData': image_data,
            'frameNumber': self.frame_count,
            'timestamp': time.time(),
            'isSingle': is_single,
            'width': width,
            'height': height,
            'monitorId': monitor_id,
            'metadata': {
                'clientId': self.client_id,
                'clientType': 'desktop',
                'config': self.capture_config,
                'dataSize': len(image_data),
                'dimensions': {
                    'width': width,
                    'height': height,
                    'original_width': original_width,
                    'original_height': original_height
                },
                'monitor_info': self.monitor_info.get(monitor_id, {})
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
    parser.add_argument('--monitor-index', 
                       type=int,
                       default=0,
                       help='Monitor index to capture (0 for primary, 1 for secondary, etc.)')
    parser.add_argument('--desktop-id', 
                       help='Desktop instance ID this client belongs to')
    parser.add_argument('--screen-id', 
                       help='Screen ID within the desktop instance')
    parser.add_argument('--fps', 
                       type=int,
                       default=30,
                       help='Capture frame rate (frames per second)')
    parser.add_argument('--quality', 
                       type=int,
                       default=80,
                       help='JPEG quality (1-100)')
    parser.add_argument('--scale', 
                       type=float,
                       default=1.0,
                       help='Scale factor for captured images')
    parser.add_argument('--log-level', 
                       choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'], 
                       default='INFO',
                       help='Logging level')

    args = parser.parse_args()

    # Set logging level
    logging.getLogger().setLevel(getattr(logging, args.log_level))

    # Create and run client
    client = DesktopCaptureClient(args.server_url, args.client_id)
    
    # Configure capture settings from command line arguments
    if args.fps:
        client.capture_config['fps'] = args.fps
    if args.quality:
        client.capture_config['quality'] = args.quality
    if args.scale:
        client.capture_config['scale'] = args.scale
    
    # Set specific monitor capture mode if monitor index is specified
    if args.monitor_index is not None:
        client.capture_config['capture_mode'] = 'specific_monitor'
        client.capture_config['target_monitor'] = args.monitor_index
    
    # Store desktop and screen IDs for identification
    client.desktop_id = args.desktop_id
    client.screen_id = args.screen_id
    
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
        logger.info("Starting Desktop Capture Client...")
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
        logger.info("Shutting down client...")
        await client.disconnect()
        logger.info("Desktop Capture Client stopped")

if __name__ == '__main__':
    asyncio.run(main())