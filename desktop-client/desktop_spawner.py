#!/usr/bin/env python3
"""
Desktop Spawner Service
Manages multiple desktop capture client instances dynamically.
Each instance captures a specific monitor and connects with a unique client ID.
"""

import asyncio
import subprocess
import sys
import os
import json
import logging
import signal
import time
from typing import Dict, List, Optional
import threading
import websockets
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DesktopSpawner:
    def __init__(self, server_url: str = "ws://localhost:8084"):
        self.server_url = server_url
        self.websocket: Optional[websockets.WebSocketServerProtocol] = None
        self.running = False
        self.spawned_processes: Dict[str, subprocess.Popen] = {}
        self.desktop_instances: Dict[str, Dict] = {}
        
        # Get the directory where this script is located
        self.script_dir = Path(__file__).parent
        self.capture_client_path = self.script_dir / "desktop_capture_client.py"
        
        if not self.capture_client_path.exists():
            raise FileNotFoundError(f"Desktop capture client not found at: {self.capture_client_path}")

    async def connect(self):
        """Connect to the WebSocket server as a spawner service."""
        try:
            logger.info(f"Connecting to {self.server_url}")
            self.websocket = await websockets.connect(self.server_url)
            self.running = True
            
            # Send handshake
            await self.send_message({
                'type': 'handshake',
                'clientInfo': {
                    'clientType': 'desktop_spawner',
                    'clientId': f'spawner_{int(time.time())}',
                    'capabilities': ['desktop_spawning', 'process_management', 'multi_instance']
                },
                'timestamp': time.time()
            })
            
            logger.info("Connected to WebSocket server as desktop spawner")
            
            # Handle incoming messages
            await self.handle_messages()
            
        except Exception as e:
            logger.error(f"Connection error: {e}")
            await self.disconnect()

    async def disconnect(self):
        """Disconnect and cleanup all spawned processes."""
        logger.info("Disconnecting desktop spawner...")
        self.running = False
        
        # Terminate all spawned processes
        for process_id, process in self.spawned_processes.items():
            try:
                logger.info(f"Terminating process {process_id}")
                process.terminate()
                # Wait a bit for graceful shutdown
                try:
                    process.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    logger.warning(f"Force killing process {process_id}")
                    process.kill()
            except Exception as e:
                logger.error(f"Error terminating process {process_id}: {e}")
        
        self.spawned_processes.clear()
        self.desktop_instances.clear()
        
        if self.websocket:
            try:
                await self.websocket.close()
            except Exception as e:
                logger.warning(f"Error closing WebSocket: {e}")
        
        logger.info("Desktop spawner disconnected")

    async def send_message(self, message: Dict):
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

    async def process_message(self, data: Dict):
        """Process individual messages from the server."""
        message_type = data.get('type')
        logger.info(f"Received message: {message_type}")

        if message_type == 'create_desktop_instance':
            await self.create_desktop_instance(data)
        elif message_type == 'remove_desktop_instance':
            await self.remove_desktop_instance(data)
        elif message_type == 'start_desktop_instance':
            await self.start_desktop_instance(data)
        elif message_type == 'stop_desktop_instance':
            await self.stop_desktop_instance(data)
        elif message_type == 'list_desktop_instances':
            await self.list_desktop_instances()
        elif message_type == 'ping':
            await self.send_message({
                'type': 'pong',
                'timestamp': time.time()
            })
        else:
            logger.warning(f"Unknown message type: {message_type}")

    async def create_desktop_instance(self, data: Dict):
        """Create a new desktop instance with multiple screen capture clients."""
        desktop_id = data.get('desktopId')
        config = data.get('config', {})
        screens = config.get('screens', [])
        capture_config = config.get('captureConfig', {})
        
        if not desktop_id:
            logger.error("No desktop ID provided for instance creation")
            return
        
        logger.info(f"Creating desktop instance: {desktop_id}")
        
        try:
            # Store desktop instance info
            self.desktop_instances[desktop_id] = {
                'id': desktop_id,
                'screens': screens,
                'config': capture_config,
                'created': time.time(),
                'status': 'created',
                'processes': {}
            }
            
            # Spawn capture clients for each screen
            for screen in screens:
                screen_id = screen.get('screenId')
                monitor_index = screen.get('monitorIndex', 0)
                screen_name = screen.get('name', f'Screen {monitor_index + 1}')
                
                client_id = f"{desktop_id}_{screen_id}"
                
                # Prepare command to spawn desktop capture client
                cmd = [
                    sys.executable,
                    str(self.capture_client_path),
                    "--server-url", self.server_url,
                    "--client-id", client_id,
                    "--monitor-index", str(monitor_index),
                    "--desktop-id", desktop_id,
                    "--screen-id", screen_id
                ]
                
                # Add capture configuration
                if capture_config.get('fps'):
                    cmd.extend(["--fps", str(capture_config['fps'])])
                if capture_config.get('quality'):
                    cmd.extend(["--quality", str(capture_config['quality'])])
                if capture_config.get('scale'):
                    cmd.extend(["--scale", str(capture_config['scale'])])
                
                logger.info(f"Spawning capture client: {client_id} for monitor {monitor_index}")
                
                # Spawn the process
                process = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0
                )
                
                # Store process reference
                process_key = f"{desktop_id}_{screen_id}"
                self.spawned_processes[process_key] = process
                self.desktop_instances[desktop_id]['processes'][screen_id] = {
                    'process': process,
                    'client_id': client_id,
                    'monitor_index': monitor_index,
                    'status': 'starting'
                }
                
                logger.info(f"Spawned process {process.pid} for {client_id}")
            
            # Notify server that instance was created
            await self.send_message({
                'type': 'desktop_instance_status',
                'desktopId': desktop_id,
                'status': 'created',
                'screens': len(screens),
                'timestamp': time.time()
            })
            
            logger.info(f"Desktop instance {desktop_id} created with {len(screens)} screens")
            
        except Exception as e:
            logger.error(f"Error creating desktop instance {desktop_id}: {e}")
            await self.send_message({
                'type': 'desktop_instance_error',
                'desktopId': desktop_id,
                'error': str(e),
                'timestamp': time.time()
            })

    async def remove_desktop_instance(self, data: Dict):
        """Remove a desktop instance and terminate its processes."""
        desktop_id = data.get('desktopId')
        
        if not desktop_id or desktop_id not in self.desktop_instances:
            logger.warning(f"Desktop instance {desktop_id} not found")
            return
        
        logger.info(f"Removing desktop instance: {desktop_id}")
        
        try:
            instance = self.desktop_instances[desktop_id]
            
            # Terminate all processes for this instance
            for screen_id, screen_info in instance['processes'].items():
                process = screen_info['process']
                process_key = f"{desktop_id}_{screen_id}"
                
                try:
                    logger.info(f"Terminating process for {screen_info['client_id']}")
                    process.terminate()
                    
                    # Wait for graceful shutdown
                    try:
                        process.wait(timeout=3)
                    except subprocess.TimeoutExpired:
                        logger.warning(f"Force killing process for {screen_info['client_id']}")
                        process.kill()
                    
                    # Remove from spawned processes
                    if process_key in self.spawned_processes:
                        del self.spawned_processes[process_key]
                        
                except Exception as e:
                    logger.error(f"Error terminating process for {screen_info['client_id']}: {e}")
            
            # Remove instance
            del self.desktop_instances[desktop_id]
            
            # Notify server
            await self.send_message({
                'type': 'desktop_instance_status',
                'desktopId': desktop_id,
                'status': 'removed',
                'timestamp': time.time()
            })
            
            logger.info(f"Desktop instance {desktop_id} removed")
            
        except Exception as e:
            logger.error(f"Error removing desktop instance {desktop_id}: {e}")

    async def start_desktop_instance(self, data: Dict):
        """Start streaming for a desktop instance."""
        desktop_id = data.get('desktopId')
        
        if desktop_id not in self.desktop_instances:
            logger.warning(f"Desktop instance {desktop_id} not found")
            return
        
        logger.info(f"Starting desktop instance: {desktop_id}")
        
        # Update status
        self.desktop_instances[desktop_id]['status'] = 'streaming'
        
        # Notify server
        await self.send_message({
            'type': 'desktop_instance_status',
            'desktopId': desktop_id,
            'status': 'streaming',
            'timestamp': time.time()
        })

    async def stop_desktop_instance(self, data: Dict):
        """Stop streaming for a desktop instance."""
        desktop_id = data.get('desktopId')
        
        if desktop_id not in self.desktop_instances:
            logger.warning(f"Desktop instance {desktop_id} not found")
            return
        
        logger.info(f"Stopping desktop instance: {desktop_id}")
        
        # Update status
        self.desktop_instances[desktop_id]['status'] = 'stopped'
        
        # Notify server
        await self.send_message({
            'type': 'desktop_instance_status',
            'desktopId': desktop_id,
            'status': 'stopped',
            'timestamp': time.time()
        })

    async def list_desktop_instances(self):
        """Send list of current desktop instances to server."""
        instances = []
        for desktop_id, instance in self.desktop_instances.items():
            instances.append({
                'id': desktop_id,
                'screens': len(instance['screens']),
                'status': instance['status'],
                'created': instance['created']
            })
        
        await self.send_message({
            'type': 'desktop_instances_list',
            'instances': instances,
            'timestamp': time.time()
        })

    def cleanup_dead_processes(self):
        """Clean up any dead processes."""
        dead_processes = []
        
        for process_key, process in self.spawned_processes.items():
            if process.poll() is not None:  # Process has terminated
                dead_processes.append(process_key)
                logger.warning(f"Process {process_key} has died (exit code: {process.returncode})")
        
        for process_key in dead_processes:
            del self.spawned_processes[process_key]
            
            # Also update desktop instances
            for desktop_id, instance in self.desktop_instances.items():
                for screen_id, screen_info in instance['processes'].items():
                    if f"{desktop_id}_{screen_id}" == process_key:
                        screen_info['status'] = 'dead'

async def main():
    """Main function to run the desktop spawner."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Desktop Spawner Service')
    parser.add_argument('--server-url', default='ws://localhost:8084',
                       help='WebSocket server URL')
    
    args = parser.parse_args()
    
    spawner = DesktopSpawner(args.server_url)
    
    # Handle shutdown signals
    def signal_handler(signum, frame):
        logger.info(f"Received signal {signum}, shutting down...")
        asyncio.create_task(spawner.disconnect())
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        # Start cleanup task
        async def cleanup_task():
            while spawner.running:
                spawner.cleanup_dead_processes()
                await asyncio.sleep(10)  # Check every 10 seconds
        
        # Run spawner and cleanup task concurrently
        await asyncio.gather(
            spawner.connect(),
            cleanup_task()
        )
        
    except KeyboardInterrupt:
        logger.info("Keyboard interrupt received")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
    finally:
        await spawner.disconnect()

if __name__ == "__main__":
    asyncio.run(main())