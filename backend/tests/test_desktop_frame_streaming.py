#!/usr/bin/env python3
"""
Test desktop frame streaming with fixed message format
"""
import asyncio
import websockets
import json
import base64
from io import BytesIO
from PIL import Image

async def test_desktop_frame_streaming():
    print("=== Testing Desktop Frame Streaming ===")
    uri = "ws://localhost:8007/ws/live-desktop"
    
    try:
        print(f"Connecting to: {uri}")
        async with websockets.connect(uri) as websocket:
            print("✅ Connected to WebSocket")
            
            # Send test ping to start streaming
            await websocket.send(json.dumps({"type": "ping"}))
            print("📤 Sent ping to start streaming")
            
            frame_count = 0
            max_frames = 3  # Test first 3 frames
            
            async for message in websocket:
                try:
                    data = json.loads(message)
                    msg_type = data.get("type", "unknown")
                    
                    if msg_type == "welcome":
                        print(f"📥 Received welcome: {data}")
                        
                    elif msg_type == "desktop_frame":
                        frame_count += 1
                        print(f"📥 Received desktop_frame #{frame_count}")
                        
                        # Verify message structure
                        if "data" in data and "image" in data["data"]:
                            image_data = data["data"]["image"]
                            resolution = data["data"].get("resolution", {})
                            
                            print(f"   Image data length: {len(image_data)}")
                            print(f"   Resolution: {resolution}")
                            print(f"   Timestamp: {data.get('timestamp')}")
                            print(f"   Format: {data.get('format')}")
                            print(f"   Size bytes: {data.get('size_bytes')}")
                            
                            # Verify it's a proper base64 data URL
                            if image_data.startswith("data:image/png;base64,"):
                                print("   ✅ Correct data URL format")
                                
                                # Try to decode the image
                                try:
                                    base64_data = image_data.split(",")[1]
                                    image_bytes = base64.b64decode(base64_data)
                                    image = Image.open(BytesIO(image_bytes))
                                    print(f"   ✅ Successfully decoded image: {image.size}")
                                except Exception as e:
                                    print(f"   ❌ Failed to decode image: {e}")
                            else:
                                print(f"   ❌ Wrong image format: {image_data[:50]}...")
                        else:
                            print(f"   ❌ Missing data.image in message structure")
                            print(f"   Message keys: {list(data.keys())}")
                            
                        if frame_count >= max_frames:
                            print(f"✅ Successfully received {frame_count} desktop frames")
                            break
                            
                    else:
                        print(f"📥 Received {msg_type}: {data}")
                        
                except json.JSONDecodeError as e:
                    print(f"❌ JSON decode error: {e}")
                except Exception as e:
                    print(f"❌ Message processing error: {e}")
                    
    except Exception as e:
        print(f"❌ WebSocket connection error: {e}")
        return False
        
    return True

if __name__ == "__main__":
    success = asyncio.run(test_desktop_frame_streaming())
    print(f"\nTest result: {'✅ SUCCESS' if success else '❌ FAILED'}")