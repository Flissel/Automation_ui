#!/usr/bin/env python3
"""
Multi-Monitor Desktop Capture Client for TRAE Unity AI Platform
Captures screenshots from all connected monitors and streams them to the WebSocket server.

Requirements:
- pip install websockets pillow pynput pyautogui screeninfo

Usage:
python multi_monitor_capture_client.py --server-url ws://localhost:8084
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
from screeninfo import get_monitors
from permission_handler import PermissionHandler

# Configure logging with clear formatting for debugging
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class MultiMonitorDesktopCaptureClient:
    """
    Enhanced desktop capture client that supports multiple monitors.
    Follows TRAE Unity AI Platform naming conventions and coding standards.
    """
    
    def __init__(self, server_url: str, client_id: Optional[str] = None):
        """
        Initialize the multi-monitor desktop capture client.
        
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
            'fps': 10,
            'quality': 80,
            'scale': 1.0,
            'format': 'jpeg',
            'capture_mode': 'all_monitors',  # 'all_monitors', 'primary_only', 'secondary_only'
            'combine_monitors': False,  # Whether to combine all monitors into single image
            # Enhanced inactive monitor detection settings
            'disable_inactive_detection': True,  # TEMPORARILY DISABLED - Set to True to disable black screen detection
            'dark_pixel_threshold': 30,  # RGB sum threshold for dark pixels
            'inactive_threshold': 99.5,  # Percentage threshold for inactive detection (increased from 98%)
            'force_capture_all': True,  # TEMPORARILY ENABLED - Force capture even if monitor appears inactive
            'debug_monitor_activity': True  # Enable detailed logging for monitor activity
        }
        
        # Monitor detection and management
        self.monitors = []
        self.monitor_info = {}
        self.frame_count = 0
        self.capture_thread: Optional[threading.Thread] = None
        self.running = False
        self.frame_queue = None  # Will be initialized as asyncio.Queue
        self.loop = None
        
        # Initialize permission handler for secure access control
        self.permission_handler = PermissionHandler()
        self.permission_handler.set_permission_callback(self.send_permission_response_sync)
        
        # Initialize monitor detection
        self._detect_monitors()

    def _detect_monitors(self):
        """
        Detect all connected monitors and store their information.
        Enhanced with unique identification and better monitor distinction.
        Follows TRAE Unity AI Platform standards for clear debugging.
        """
        try:
            self.monitors = get_monitors()
            self.monitor_info = {}
            
            logger.info(f"🖥️ Detected {len(self.monitors)} monitor(s):")
            
            # Sort monitors by position to ensure consistent ordering
            sorted_monitors = sorted(self.monitors, key=lambda m: (m.x, m.y))
            
            for i, monitor in enumerate(sorted_monitors):
                monitor_id = f"monitor_{i}"
                
                # Enhanced monitor identification
                monitor_name = getattr(monitor, 'name', f'\\.\DISPLAY{i+1}')
                is_primary = getattr(monitor, 'is_primary', False) or (monitor.x == 0 and monitor.y == 0)
                
                # Create unique monitor signature for better identification
                monitor_signature = f"{monitor.width}x{monitor.height}@{monitor.x},{monitor.y}"
                
                self.monitor_info[monitor_id] = {
                    'index': i,
                    'name': monitor_name,
                    'x': monitor.x,
                    'y': monitor.y,
                    'width': monitor.width,
                    'height': monitor.height,
                    'is_primary': is_primary,
                    'signature': monitor_signature,
                    'position_type': self._get_monitor_position_type(monitor.x, monitor.y, i),
                    'device_name': monitor_name
                }
                
                # Enhanced logging with position information
                position_info = self.monitor_info[monitor_id]['position_type']
                logger.info(f"  🖥️ {monitor_id}: {monitor.width}x{monitor.height} at ({monitor.x}, {monitor.y})")
                logger.info(f"     📍 Position: {position_info}")
                logger.info(f"     🏷️ Device: {monitor_name}")
                logger.info(f"     🎯 Primary: {'✅ YES' if is_primary else '❌ NO'}")
                logger.info(f"     🔑 Signature: {monitor_signature}")
                
        except Exception as e:
            logger.error(f"❌ Error detecting monitors: {e}")
            # Fallback to single monitor
            self.monitors = []
            self.monitor_info = {
                'monitor_0': {
                    'index': 0,
                    'name': 'Primary Monitor (Fallback)',
                    'x': 0,
                    'y': 0,
                    'width': 1920,
                    'height': 1080,
                    'is_primary': True,
                    'signature': '1920x1080@0,0',
                    'position_type': 'Primary (Left)',
                    'device_name': '\\.\DISPLAY1'
                }
            }
            logger.warning("⚠️ Using fallback single monitor configuration")

    def _get_monitor_position_type(self, x: int, y: int, index: int) -> str:
        """
        Determine the position type of a monitor for better identification.
        """
        if x == 0 and y == 0:
            return "Primary (Left)"
        elif x > 0 and y == 0:
            return "Secondary (Right)"
        elif x < 0 and y == 0:
            return "Secondary (Left)"
        elif y > 0:
            return f"Secondary (Below, Index {index})"
        elif y < 0:
            return f"Secondary (Above, Index {index})"
        else:
            return f"Secondary (Custom Position, Index {index})"

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
            
            logger.info(f"Connected as multi-monitor desktop client: {self.client_id}")
            
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

    async def disconnect(self):
        """
        Disconnect from the WebSocket server with proper cleanup.
        Follows TRAE Unity AI Platform cleanup standards.
        """
        logger.info("Initiating multi-monitor client disconnect...")
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
                    'timestamp': time.time(),
                    'client_type': 'multi_monitor_desktop'
                })
                await asyncio.sleep(0.1)  # Brief delay to ensure message is sent
            except Exception as e:
                logger.warning(f"Could not send disconnect message: {e}")
            
            try:
                await self.websocket.close()
                logger.info("WebSocket connection closed")
            except Exception as e:
                logger.warning(f"Error closing WebSocket: {e}")
        
        logger.info("Multi-monitor client disconnect completed")

    async def send_capabilities(self):
        """
        Send enhanced client capabilities including monitor information.
        Follows TRAE Unity AI Platform capability reporting standards.
        """
        capabilities = {
            'type': 'handshake',
            'timestamp': time.time(),
            'client_type': 'multi_monitor_capture',
            'client_id': self.client_id,
            'clientInfo': {
                'clientType': 'multi_monitor_desktop_capture',
                'clientId': self.client_id,
                'version': '2.0.0',
                'capabilities': [
                    'desktop_stream', 
                    'screen_capture', 
                    'multi_monitor_capture',
                    'mouse_control', 
                    'keyboard_control'
                ],
                'screen_capture': True,
                'multiple_monitors': True,
                'monitor_count': len(self.monitors) if self.monitors else 1,
                'monitor_info': self.monitor_info,
                'mouse_control': True,
                'keyboard_control': True,
                'file_operations': True,
                'supported_formats': ['jpeg', 'png'],
                'compression_levels': [1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
                'capture_modes': ['all_monitors', 'primary_only', 'secondary_only', 'combined']
            },
            'capabilities': {
                'multi_monitor': True,
                'monitor_count': len(self.monitor_info),
                'monitors': {
                    monitor_id: {
                        'name': info['name'],
                        'device_name': info['device_name'],
                        'resolution': f"{info['width']}x{info['height']}",
                        'position': f"({info['x']}, {info['y']})",
                        'position_type': info['position_type'],
                        'is_primary': info['is_primary'],
                        'signature': info['signature'],
                        'index': info['index']
                    }
                    for monitor_id, info in self.monitor_info.items()
                }
            }
        }
        
        await self.send_message(capabilities)
        logger.info(f"Sent handshake with multi-monitor capabilities ({len(self.monitors)} monitors)")

    async def wait_for_handshake_ack(self):
        """
        Wait for handshake acknowledgment from the server.
        Enhanced with better error handling following TRAE standards.
        """
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
        """
        Send a message to the server with error handling.
        Follows TRAE Unity AI Platform messaging standards.
        """
        if self.websocket:
            try:
                await self.websocket.send(json.dumps(message))
            except Exception as e:
                logger.error(f"Error sending message: {e}")

    async def handle_messages(self):
        """
        Handle incoming messages from the server.
        Enhanced with multi-monitor specific message handling.
        """
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
        """
        Process individual messages from the server.
        Enhanced with multi-monitor specific commands.
        """
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
            
        elif message_type == 'config_update':
            config = data.get('config', {})
            self.update_config(config)
            
        elif message_type == 'capture_screenshot':
            monitor_id = data.get('monitor_id', 'all')
            await self.capture_single_screenshot(monitor_id)
            
        elif message_type == 'switch_monitor':
            monitor_id = data.get('monitor_id', 'all')
            await self.switch_monitor_capture(monitor_id)
            
        elif message_type == 'ping':
            await self.send_message({
                'type': 'pong',
                'timestamp': time.time()
            })
            
        elif message_type == 'request_permission':
            await self.handle_permission_request(data)
            
        elif message_type == 'check_permission':
            await self.handle_permission_check(data)
            
        elif message_type == 'revoke_permission':
            await self.handle_permission_revocation(data)
            
        else:
            logger.warning(f"Unknown message type: {message_type}")

    async def start_capture(self, config: Dict[str, Any]):
        """
        Start continuous multi-monitor screen capture.
        Enhanced to support different capture modes.
        """
        if self.is_capturing:
            logger.warning("Capture already running")
            return

        # Update configuration
        self.capture_config.update(config)
        self.is_capturing = True
        self.frame_count = 0

        logger.info(f"Starting multi-monitor capture with config: {self.capture_config}")

        # Send status update
        await self.send_message({
            'type': 'stream_status',
            'streaming': True,
            'config': self.capture_config,
            'monitor_info': self.monitor_info,
            'timestamp': time.time()
        })

        # Start capture in separate thread to avoid blocking
        self.capture_thread = threading.Thread(target=self.capture_loop)
        self.capture_thread.daemon = True
        self.capture_thread.start()

    async def stop_capture(self):
        """
        Stop continuous screen capture.
        Enhanced with better cleanup for multi-monitor setup.
        """
        if not self.is_capturing:
            logger.warning("Capture not running")
            return

        self.is_capturing = False
        logger.info("Stopping multi-monitor capture")

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
        """
        Update capture configuration.
        Enhanced to handle multi-monitor specific settings.
        """
        self.capture_config.update(config)
        logger.info(f"Updated multi-monitor config: {self.capture_config}")

    async def switch_monitor_capture(self, monitor_id: str):
        """
        Switch capture to specific monitor or all monitors.
        New method for multi-monitor control.
        """
        if monitor_id == 'all':
            self.capture_config['capture_mode'] = 'all_monitors'
        elif monitor_id in self.monitor_info:
            self.capture_config['capture_mode'] = monitor_id
        else:
            logger.warning(f"Unknown monitor ID: {monitor_id}")
            return
            
        logger.info(f"Switched capture mode to: {self.capture_config['capture_mode']}")
        
        # Send status update
        await self.send_message({
            'type': 'monitor_switched',
            'monitor_id': monitor_id,
            'capture_mode': self.capture_config['capture_mode'],
            'timestamp': time.time()
        })

    async def process_frame_queue(self):
        """
        Process frames from the queue and send them via WebSocket.
        Enhanced to handle multi-monitor frame data.
        """
        while self.running:
            try:
                # Get frame from queue with timeout using asyncio
                frame_data = await asyncio.wait_for(self.frame_queue.get(), timeout=0.1)
                if frame_data:
                    await self.send_frame(frame_data)
                    self.frame_queue.task_done()
            except asyncio.TimeoutError:
                # No frames in queue, continue
                continue
            except Exception as e:
                logger.error(f"Frame processing error: {e}")
                await asyncio.sleep(0.1)

    def capture_loop(self):
        """
        Main capture loop for multi-monitor setup.
        Enhanced to capture from multiple monitors based on configuration.
        """
        fps = self.capture_config.get('fps', 10)
        frame_interval = 1.0 / fps

        logger.info(f"Starting multi-monitor capture loop at {fps} FPS")

        while self.is_capturing and self.running:
            try:
                start_time = time.time()
                
                # Capture screenshots based on mode
                capture_mode = self.capture_config.get('capture_mode', 'all_monitors')
                
                if capture_mode == 'all_monitors':
                    screenshot_data_list = self.capture_all_monitors()
                elif capture_mode == 'primary_only':
                    screenshot_data_list = self.capture_primary_monitor()
                elif capture_mode.startswith('monitor_'):
                    screenshot_data_list = self.capture_specific_monitor(capture_mode)
                else:
                    screenshot_data_list = self.capture_all_monitors()
                
                # Process captured screenshots
                for screenshot_data in screenshot_data_list:
                    if screenshot_data:
                        # Add frame to queue for async processing
                        if self.loop and self.frame_queue:
                            future = asyncio.run_coroutine_threadsafe(
                                self.frame_queue.put(screenshot_data), 
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
                logger.error(f"Multi-monitor capture loop error: {e}")
                time.sleep(0.1)  # Brief pause before retrying

        logger.info("Multi-monitor capture loop ended")

    def capture_all_monitors(self) -> List[Dict[str, Any]]:
        """
        Capture screenshots from all monitors.
        Returns list of screenshot data for each monitor.
        """
        screenshot_data_list = []
        
        try:
            if self.capture_config.get('combine_monitors', False):
                # Capture all monitors as one combined image
                screenshot = ImageGrab.grab()
                screenshot_data = self._process_screenshot(screenshot, 'combined_monitors')
                if screenshot_data:
                    screenshot_data_list.append(screenshot_data)
            else:
                # Capture each monitor separately
                for monitor_id, monitor_info in self.monitor_info.items():
                    screenshot_data = self.capture_monitor_by_info(monitor_info, monitor_id)
                    if screenshot_data:
                        screenshot_data_list.append(screenshot_data)
                        
        except Exception as e:
            logger.error(f"Error capturing all monitors: {e}")
            
        return screenshot_data_list

    def capture_primary_monitor(self) -> List[Dict[str, Any]]:
        """
        Capture screenshot from primary monitor only.
        """
        screenshot_data_list = []
        
        try:
            # Find primary monitor
            primary_monitor = None
            primary_monitor_id = None
            
            for monitor_id, monitor_info in self.monitor_info.items():
                if monitor_info.get('is_primary', False):
                    primary_monitor = monitor_info
                    primary_monitor_id = monitor_id
                    break
            
            if primary_monitor:
                screenshot_data = self.capture_monitor_by_info(primary_monitor, primary_monitor_id)
                if screenshot_data:
                    screenshot_data_list.append(screenshot_data)
            else:
                logger.warning("No primary monitor found, falling back to full screen capture")
                screenshot = ImageGrab.grab()
                screenshot_data = self._process_screenshot(screenshot, 'primary_fallback')
                if screenshot_data:
                    screenshot_data_list.append(screenshot_data)
                    
        except Exception as e:
            logger.error(f"Error capturing primary monitor: {e}")
            
        return screenshot_data_list

    def capture_specific_monitor(self, monitor_id: str) -> List[Dict[str, Any]]:
        """
        Capture screenshot from specific monitor.
        """
        screenshot_data_list = []
        
        try:
            if monitor_id in self.monitor_info:
                monitor_info = self.monitor_info[monitor_id]
                screenshot_data = self.capture_monitor_by_info(monitor_info, monitor_id)
                if screenshot_data:
                    screenshot_data_list.append(screenshot_data)
            else:
                logger.warning(f"Monitor {monitor_id} not found")
                
        except Exception as e:
            logger.error(f"Error capturing monitor {monitor_id}: {e}")
            
        return screenshot_data_list

    def capture_monitor_by_info(self, monitor_info: Dict[str, Any], monitor_id: str) -> Optional[Dict[str, Any]]:
        """
        Capture screenshot from specific monitor using monitor info.
        Enhanced with black screen detection and fallback handling.
        """
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
            
            # Check if the captured image is mostly black (inactive monitor)
            if self._is_monitor_inactive(screenshot):
                logger.warning(f"Monitor {monitor_id} appears to be inactive (black screen)")
                
                # Create a placeholder image with monitor info
                screenshot = self._create_placeholder_image(monitor_info, monitor_id)
            
            return self._process_screenshot(screenshot, monitor_id)
            
        except Exception as e:
            logger.error(f"Error capturing monitor {monitor_id}: {e}")
            return None

    def _is_monitor_inactive(self, screenshot: Image.Image) -> bool:
        """
        Check if a screenshot is mostly black (indicating inactive monitor).
        Enhanced with configurable thresholds and debug options.
        """
        try:
            # Check if inactive detection is disabled via config
            if self.capture_config.get('disable_inactive_detection', False):
                if self.capture_config.get('debug_monitor_activity', False):
                    logger.info("🔧 Inactive monitor detection is disabled via config")
                return False
            
            # Check if force capture is enabled
            if self.capture_config.get('force_capture_all', False):
                if self.capture_config.get('debug_monitor_activity', False):
                    logger.info("🔧 Force capture enabled - treating all monitors as active")
                return False
            
            # Sample pixels to check for black content
            pixels = list(screenshot.getdata())
            
            # Use different sampling strategies for better detection
            sample_size = min(1000, len(pixels) // 10)  # Sample at least 1000 pixels or 10% of image
            step = max(1, len(pixels) // sample_size)
            sample_pixels = pixels[::step]
            
            # Configurable thresholds
            dark_threshold = self.capture_config.get('dark_pixel_threshold', 30)  # RGB sum threshold
            inactive_percentage = self.capture_config.get('inactive_threshold', 99.5)  # Percentage threshold
            
            # Count pixels that are very dark (sum of RGB < threshold)
            black_pixels = sum(1 for pixel in sample_pixels if sum(pixel[:3]) < dark_threshold)
            total_sampled = len(sample_pixels)
            
            # Calculate black percentage
            black_percentage = (black_pixels / total_sampled) * 100
            
            # Enhanced debug logging
            if self.capture_config.get('debug_monitor_activity', False):
                # Sample some pixel values for debugging
                sample_rgb_values = [f"RGB{pixel[:3]}" for pixel in sample_pixels[:5]]
                logger.info(f"🔍 Monitor Activity Analysis:")
                logger.info(f"   📊 Sampled {total_sampled} pixels (step: {step})")
                logger.info(f"   🎨 Sample RGB values: {', '.join(sample_rgb_values)}")
                logger.info(f"   ⚫ Dark pixels: {black_pixels}/{total_sampled} ({black_percentage:.1f}%)")
                logger.info(f"   🎯 Threshold: {inactive_percentage}% (dark_threshold: {dark_threshold})")
            
            # Consider monitor inactive if more than threshold% of sampled pixels are black
            is_inactive = black_percentage > inactive_percentage
            
            if is_inactive:
                logger.warning(f"🚫 Monitor detected as inactive: {black_percentage:.1f}% dark pixels (threshold: {inactive_percentage}%)")
            else:
                if self.capture_config.get('debug_monitor_activity', False):
                    logger.info(f"✅ Monitor detected as active: {black_percentage:.1f}% dark pixels")
            
            return is_inactive
            
        except Exception as e:
            logger.error(f"❌ Error checking monitor activity: {e}")
            return False

    def _create_placeholder_image(self, monitor_info: Dict[str, Any], monitor_id: str) -> Image.Image:
        """
        Create a placeholder image for inactive monitors.
        Enhanced with monitor information display and debug logging.
        """
        try:
            width = monitor_info['width']
            height = monitor_info['height']
            monitor_name = monitor_info.get('name', 'Unknown Monitor')
            
            # Enhanced debug logging
            if self.capture_config.get('debug_monitor_activity', False):
                logger.info(f"🖼️ Creating placeholder image for {monitor_name}")
                logger.info(f"   📐 Resolution: {width}x{height}")
                logger.info(f"   💡 Reason: Monitor appears inactive (black screen)")
            
            # Create a dark gray background with subtle pattern
            placeholder = Image.new('RGB', (width, height), (45, 45, 50))
            
            # Add text overlay with monitor information
            from PIL import ImageDraw, ImageFont
            draw = ImageDraw.Draw(placeholder)
            
            try:
                # Try to use a larger font
                font = ImageFont.load_default()
            except:
                font = None
            
            # Monitor info text with enhanced formatting
            text_lines = [
                f"🚫 Monitor: {monitor_id}",
                f"📐 Resolution: {width}x{height}",
                f"📍 Position: ({monitor_info['x']}, {monitor_info['y']})",
                f"⚠️ Status: Inactive/Black Screen",
                "",
                "💡 This monitor appears to be:",
                "   • Turned off",
                "   • Displaying a black screen",
                "   • Not receiving video signal",
                "",
                "🔧 Debug Info:",
                f"   • Monitor ID: {monitor_id}",
                f"   • Monitor Name: {monitor_name}",
                "",
                "🤖 TRAE Unity AI Platform",
                "📺 Multi-Monitor Capture Client"
            ]
            
            # Calculate text position (centered)
            y_offset = height // 6
            line_height = max(25, height // 30)
            
            for i, line in enumerate(text_lines):
                if line:  # Skip empty lines for spacing
                    text_width = draw.textlength(line, font=font) if font else len(line) * 8
                    x_pos = (width - text_width) // 2
                    y_pos = y_offset + (i * line_height)
                    
                    # Use different colors for different types of text
                    if line.startswith('🚫') or line.startswith('⚠️'):
                        text_color = (255, 180, 100)  # Warning orange
                    elif line.startswith('💡') or line.startswith('🔧'):
                        text_color = (100, 200, 255)  # Info blue
                    elif line.startswith('🤖') or line.startswith('📺'):
                        text_color = (150, 255, 150)  # Success green
                    else:
                        text_color = (255, 255, 255)  # Default white
                    
                    # Draw text
                    draw.text((x_pos, y_pos), line, fill=text_color, font=font)
                else:
                    # Add extra spacing for empty lines
                    y_offset += line_height // 2
            
            # Add a subtle border
            border_color = (80, 80, 85)
            draw.rectangle([0, 0, width-1, height-1], outline=border_color, width=2)
            
            logger.info(f"✅ Created placeholder image for inactive monitor {monitor_id} ({monitor_name})")
            return placeholder
            
        except Exception as e:
            logger.error(f"❌ Error creating placeholder image: {e}")
            # Return a simple dark image as fallback
            return Image.new('RGB', (monitor_info['width'], monitor_info['height']), (30, 30, 35))

    def _process_screenshot(self, screenshot: Image.Image, monitor_id: str) -> Optional[Dict[str, Any]]:
        """
        Process a screenshot image and return formatted data.
        Common processing logic for all capture methods.
        """
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
                'monitor_id': monitor_id,
                'is_single': False
            }

        except Exception as e:
            logger.error(f"Screenshot processing error for {monitor_id}: {e}")
            return None

    async def capture_single_screenshot(self, monitor_id: str = 'all'):
        """
        Capture and send a single screenshot from specified monitor(s).
        Enhanced to support monitor selection.
        """
        logger.info(f"Capturing single screenshot from {monitor_id}")
        
        if monitor_id == 'all':
            screenshot_data_list = self.capture_all_monitors()
        elif monitor_id == 'primary':
            screenshot_data_list = self.capture_primary_monitor()
        elif monitor_id.startswith('monitor_'):
            screenshot_data_list = self.capture_specific_monitor(monitor_id)
        else:
            logger.warning(f"Unknown monitor ID: {monitor_id}, defaulting to all monitors")
            screenshot_data_list = self.capture_all_monitors()
        
        # Add all screenshots to queue
        for screenshot_data in screenshot_data_list:
            if screenshot_data:
                screenshot_data['is_single'] = True
                await self.frame_queue.put(screenshot_data)

    async def send_frame(self, frame_data: Dict[str, Any]):
        """
        Send a frame to the server.
        Enhanced with multi-monitor metadata.
        """
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
                'clientType': 'multi_monitor_desktop',
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

    async def handle_permission_request(self, data: Dict[str, Any]):
        """Handle incoming permission request from web client."""
        try:
            web_client_id = data.get('web_client_id')
            permission_type = data.get('permission_type')
            request_id = data.get('request_id')
            
            logger.info(f"Received permission request from {web_client_id} for {permission_type}")
            
            # Use permission handler to process the request
            if self.permission_handler:
                self.permission_handler.handle_permission_request(
                    web_client_id, permission_type, request_id
                )
            else:
                logger.error("Permission handler not initialized")
                # Send denial response
                await self.send_permission_response(request_id, False, "Permission handler not available")
                
        except Exception as e:
            logger.error(f"Error handling permission request: {e}")
            if 'request_id' in data:
                await self.send_permission_response(data['request_id'], False, f"Error: {str(e)}")

    async def handle_permission_check(self, data: Dict[str, Any]):
        """Handle permission status check request."""
        try:
            web_client_id = data.get('web_client_id')
            permission_type = data.get('permission_type')
            
            logger.info(f"Checking permission for {web_client_id} - {permission_type}")
            
            # Check permission status
            if self.permission_handler:
                has_permission = self.permission_handler.check_permission(web_client_id, permission_type)
                
                # Send permission status response
                await self.send_message({
                    'type': 'permission_status',
                    'web_client_id': web_client_id,
                    'permission_type': permission_type,
                    'has_permission': has_permission,
                    'desktop_client_id': self.client_id,
                    'timestamp': time.time()
                })
            else:
                logger.error("Permission handler not initialized")
                
        except Exception as e:
            logger.error(f"Error checking permission: {e}")

    async def handle_permission_revocation(self, data: Dict[str, Any]):
        """Handle permission revocation request."""
        try:
            web_client_id = data.get('web_client_id')
            permission_type = data.get('permission_type')
            
            logger.info(f"Revoking permission for {web_client_id} - {permission_type}")
            
            # Revoke permission
            if self.permission_handler:
                self.permission_handler.revoke_permission(web_client_id, permission_type)
                
                # Send revocation confirmation
                await self.send_message({
                    'type': 'permission_revoked',
                    'web_client_id': web_client_id,
                    'permission_type': permission_type,
                    'desktop_client_id': self.client_id,
                    'timestamp': time.time()
                })
            else:
                logger.error("Permission handler not initialized")
                
        except Exception as e:
            logger.error(f"Error revoking permission: {e}")

    async def send_permission_response(self, request_id: str, granted: bool, reason: str = ""):
        """Send permission response back to server."""
        try:
            response = {
                'type': 'permission_response',
                'request_id': request_id,
                'granted': granted,
                'reason': reason,
                'desktop_client_id': self.client_id,
                'timestamp': time.time()
            }
            
            await self.send_message(response)
            logger.info(f"Sent permission response: {granted} for request {request_id}")
            
        except Exception as e:
            logger.error(f"Error sending permission response: {e}")

    def send_permission_response_sync(self, request_id: str, granted: bool, reason: str = ""):
        """Synchronous wrapper for permission response callback."""
        if self.loop:
            asyncio.run_coroutine_threadsafe(
                self.send_permission_response(request_id, granted, reason),
                self.loop
            )

async def main():
    """
    Main function following TRAE Unity AI Platform standards.
    Enhanced with multi-monitor specific arguments.
    """
    parser = argparse.ArgumentParser(description='Multi-Monitor Desktop Capture Client for TRAE Unity AI Platform')
    parser.add_argument('--server-url', 
                       default='ws://localhost:8084',
                       help='WebSocket server URL')
    parser.add_argument('--client-id', 
                       help='Optional client ID (will generate if not provided)')
    parser.add_argument('--log-level', 
                       choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'], 
                       default='INFO',
                       help='Logging level')
    parser.add_argument('--capture-mode',
                       choices=['all_monitors', 'primary_only', 'secondary_only'],
                       default='all_monitors',
                       help='Initial capture mode')
    parser.add_argument('--combine-monitors',
                       action='store_true',
                       help='Combine all monitors into single image')
    parser.add_argument('--disable-inactive-detection',
                       action='store_true',
                       help='Disable inactive monitor detection (show raw capture even if black)')

    args = parser.parse_args()

    # Set logging level
    logging.getLogger().setLevel(getattr(logging, args.log_level))

    # Create and run client
    client = MultiMonitorDesktopCaptureClient(args.server_url, args.client_id)
    
    # Apply initial configuration
    client.capture_config['capture_mode'] = args.capture_mode
    client.capture_config['combine_monitors'] = args.combine_monitors
    client.capture_config['disable_inactive_detection'] = args.disable_inactive_detection
    
    if args.disable_inactive_detection:
        logger.info("🔧 Inactive monitor detection DISABLED - showing raw capture from all monitors")
    
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
        logger.info("Starting Multi-Monitor Desktop Capture Client...")
        logger.info(f"Server URL: {args.server_url}")
        logger.info(f"Client ID: {client.client_id}")
        logger.info(f"Capture Mode: {args.capture_mode}")
        logger.info(f"Combine Monitors: {args.combine_monitors}")
        
        await client.connect()
        
        # Keep the client running until interrupted
        while client.running and client.websocket and not client.websocket.closed:
            await asyncio.sleep(1)
        
    except KeyboardInterrupt:
        logger.info("Received interrupt signal")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
    finally:
        logger.info("Shutting down multi-monitor client...")
        await client.disconnect()
        logger.info("Multi-Monitor Desktop Capture Client stopped")

if __name__ == '__main__':
    asyncio.run(main())