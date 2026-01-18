#!/usr/bin/env python3
"""
TRAE Unity AI - Desktop Client Agent
Captures desktop screens and streams to the TRAE platform via WebSocket
"""

import asyncio
import base64
import json
import sys
import time
from datetime import datetime
from io import BytesIO
from typing import Any, Dict, Optional

import mss
import mss.tools
import websockets
from PIL import Image


class DesktopStreamClient:
    def __init__(
        self,
        websocket_url: str,
        client_id: str,
        fps: int = 10,
        quality: int = 75,
        scale: float = 1.0,
    ):
        """
        Initialize Desktop Stream Client

        Args:
            websocket_url: WebSocket URL of the Edge Function
            client_id: Unique identifier for this desktop client
            fps: Frames per second to stream
            quality: JPEG quality (1-100)
            scale: Scale factor for frames (0.5 = 50% size)
        """
        self.websocket_url = websocket_url
        self.client_id = client_id
        self.fps = fps
        self.quality = quality
        self.scale = scale
        self.frame_interval = 1.0 / fps

        self.ws: Optional[websockets.WebSocketClientProtocol] = None
        self.capturing = False
        self.frame_number = 0
        self.sct = mss.mss()
        self.monitors = self.sct.monitors[1:]  # Exclude the "all monitors" entry

    async def connect(self):
        """Connect to WebSocket server"""
        url = f"{self.websocket_url}?client_type=desktop&client_id={self.client_id}"
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Connecting to {url}")

        try:
            self.ws = await websockets.connect(url, ping_interval=20, ping_timeout=10)
            print(f"[{datetime.now().strftime('%H:%M:%S')}] ✓ Connected successfully")

            # Send handshake
            await self.send_handshake()

            # Start message handler and capture tasks
            await asyncio.gather(
                self.message_handler(), self.capture_loop(), return_exceptions=True
            )

        except Exception as e:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] ✗ Connection error: {e}")
            raise

    async def send_handshake(self):
        """Send handshake message to server"""
        monitor_ids = [f"monitor_{i}" for i in range(len(self.monitors))]

        handshake = {
            "type": "handshake",
            "clientInfo": {
                "name": self.client_id,
                "monitors": monitor_ids,
                "capabilities": ["screen_capture", "multi_monitor"],
            },
        }

        await self.ws.send(json.dumps(handshake))
        print(
            f"[{datetime.now().strftime('%H:%M:%S')}] → Handshake sent ({len(self.monitors)} monitors)"
        )

    async def message_handler(self):
        """Handle incoming messages from server"""
        try:
            async for message in self.ws:
                try:
                    data = json.loads(message)
                    msg_type = data.get("type")

                    if msg_type == "start_capture":
                        monitor_id = data.get("monitorId", "monitor_0")
                        print(
                            f"[{datetime.now().strftime('%H:%M:%S')}] ▶ Start capture requested for {monitor_id}"
                        )
                        self.capturing = True

                    elif msg_type == "stop_capture":
                        print(
                            f"[{datetime.now().strftime('%H:%M:%S')}] ⏸ Stop capture requested"
                        )
                        self.capturing = False

                    elif msg_type == "request_screenshot":
                        desktop_id = data.get("desktopClientId", self.client_id)
                        monitor_id = data.get("monitorId", 0)
                        print(
                            f"[{datetime.now().strftime('%H:%M:%S')}] 📸 Screenshot requested for monitor {monitor_id}"
                        )
                        await self.send_screenshot(monitor_id)

                    elif msg_type == "config_update":
                        self.update_config(data.get("config", {}))

                except json.JSONDecodeError:
                    print(
                        f"[{datetime.now().strftime('%H:%M:%S')}] ✗ Invalid JSON received"
                    )

        except websockets.exceptions.ConnectionClosed:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] ✗ Connection closed")
        except Exception as e:
            print(
                f"[{datetime.now().strftime('%H:%M:%S')}] ✗ Message handler error: {e}"
            )

    async def capture_loop(self):
        """Main capture loop - sends frames at specified FPS"""
        print(
            f"[{datetime.now().strftime('%H:%M:%S')}] 🎥 Capture loop started ({self.fps} FPS)"
        )

        while True:
            try:
                if self.capturing and self.ws and not self.ws.closed:
                    # Capture all monitors
                    for monitor_id, monitor in enumerate(self.monitors):
                        await self.capture_and_send_frame(monitor_id, monitor)

                await asyncio.sleep(self.frame_interval)

            except Exception as e:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] ✗ Capture error: {e}")
                await asyncio.sleep(1)

    async def capture_and_send_frame(self, monitor_id: int, monitor: Dict[str, Any]):
        """Capture and send a single frame"""
        try:
            # Capture screenshot
            screenshot = self.sct.grab(monitor)
            img = Image.frombytes("RGB", screenshot.size, screenshot.rgb)

            # Scale if needed
            if self.scale != 1.0:
                new_size = (int(img.width * self.scale), int(img.height * self.scale))
                img = img.resize(new_size, Image.Resampling.LANCZOS)

            # Convert to JPEG
            buffer = BytesIO()
            img.save(buffer, format="JPEG", quality=self.quality, optimize=True)
            frame_data = base64.b64encode(buffer.getvalue()).decode("utf-8")

            # Send frame
            frame_message = {
                "type": "frame_data",
                "desktopClientId": self.client_id,
                "monitorId": f"monitor_{monitor_id}",
                "frameData": frame_data,
                "frameNumber": self.frame_number,
                "timestamp": datetime.now().isoformat(),
                "metadata": {
                    "width": img.width,
                    "height": img.height,
                    "format": "jpeg",
                    "clientId": self.client_id,
                },
            }

            await self.ws.send(json.dumps(frame_message))
            self.frame_number += 1

            if self.frame_number % (self.fps * 5) == 0:  # Log every 5 seconds
                print(
                    f"[{datetime.now().strftime('%H:%M:%S')}] 📡 Streaming... (frame #{self.frame_number})"
                )

        except Exception as e:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] ✗ Frame capture error: {e}")

    async def send_screenshot(self, monitor_id: int = 0):
        """Send a single screenshot"""
        if monitor_id >= len(self.monitors):
            monitor_id = 0

        monitor = self.monitors[monitor_id]
        screenshot = self.sct.grab(monitor)
        img = Image.frombytes("RGB", screenshot.size, screenshot.rgb)

        # Convert to JPEG
        buffer = BytesIO()
        img.save(buffer, format="JPEG", quality=self.quality)
        frame_data = base64.b64encode(buffer.getvalue()).decode("utf-8")

        # Send screenshot
        screenshot_message = {
            "type": "screenshot",
            "desktopClientId": self.client_id,
            "frameData": frame_data,
            "timestamp": datetime.now().isoformat(),
            "metadata": {
                "width": img.width,
                "height": img.height,
                "format": "jpeg",
                "monitorId": monitor_id,
                "clientId": self.client_id,
            },
        }

        await self.ws.send(json.dumps(screenshot_message))
        print(f"[{datetime.now().strftime('%H:%M:%S')}] 📸 Screenshot sent")

    def update_config(self, config: Dict[str, Any]):
        """Update streaming configuration"""
        if "fps" in config:
            self.fps = config["fps"]
            self.frame_interval = 1.0 / self.fps
            print(
                f"[{datetime.now().strftime('%H:%M:%S')}] ⚙ FPS updated to {self.fps}"
            )

        if "quality" in config:
            self.quality = config["quality"]
            print(
                f"[{datetime.now().strftime('%H:%M:%S')}] ⚙ Quality updated to {self.quality}"
            )

        if "scale" in config:
            self.scale = config["scale"]
            print(
                f"[{datetime.now().strftime('%H:%M:%S')}] ⚙ Scale updated to {self.scale}"
            )


async def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description="TRAE Unity AI - Desktop Client Agent")
    parser.add_argument(
        "--client-id",
        type=str,
        default="desktop_001",
        help="Unique client ID (e.g., desktop_003)",
    )
    parser.add_argument(
        "--fps", type=int, default=10, help="Frames per second (default: 10)"
    )
    parser.add_argument(
        "--quality", type=int, default=75, help="JPEG quality 1-100 (default: 75)"
    )
    parser.add_argument(
        "--scale",
        type=float,
        default=1.0,
        help="Scale factor for frames (default: 1.0)",
    )
    parser.add_argument(
        "--url",
        type=str,
        default="wss://dgzreelowtzquljhxskq.supabase.co/functions/v1/live-desktop-stream",
        help="WebSocket URL",
    )

    args = parser.parse_args()

    print("=" * 60)
    print("TRAE Unity AI - Desktop Client Agent")
    print("=" * 60)
    print(f"Client ID: {args.client_id}")
    print(f"FPS: {args.fps} | Quality: {args.quality}% | Scale: {args.scale}x")
    print(f"WebSocket: {args.url}")
    print("=" * 60)

    client = DesktopStreamClient(
        websocket_url=args.url,
        client_id=args.client_id,
        fps=args.fps,
        quality=args.quality,
        scale=args.scale,
    )

    try:
        await client.connect()
    except KeyboardInterrupt:
        print(f"\n[{datetime.now().strftime('%H:%M:%S')}] 🛑 Stopped by user")
    except Exception as e:
        print(f"\n[{datetime.now().strftime('%H:%M:%S')}] ✗ Fatal error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
