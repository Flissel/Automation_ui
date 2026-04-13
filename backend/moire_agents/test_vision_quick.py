"""Quick test: screenshot monitor 0, send to openrouter/free for vision analysis."""

import asyncio
import base64
import io
import json
import os
import sys

sys.path.insert(0, ".")
os.chdir(os.path.dirname(os.path.abspath(__file__)))


async def main():
    # Screenshot monitor 0 (first real monitor)
    try:
        import mss

        with mss.mss() as sct:
            monitors = sct.monitors
            print(f"Found {len(monitors)-1} monitor(s)")
            for i, m in enumerate(monitors[1:], 1):
                print(
                    f"  Monitor {i}: {m['width']}x{m['height']} at ({m['left']},{m['top']})"
                )
            mon = monitors[1]  # monitor 0 = first real monitor
            img = sct.grab(mon)
    except Exception as e:
        print(f"mss error: {e}")
        return

    try:
        from PIL import Image

        pil = Image.frombytes("RGB", img.size, img.bgra, "raw", "BGRX")
        # Resize to 1280px wide for reasonable token usage
        w, h = pil.size
        new_w = min(w, 1280)
        new_h = int(h * new_w / w)
        pil = pil.resize((new_w, new_h), Image.LANCZOS)
        buf = io.BytesIO()
        pil.save(buf, format="PNG")
        b64 = base64.b64encode(buf.getvalue()).decode()
        print(f"Screenshot: {new_w}x{new_h}, base64 size: {len(b64)//1024}KB")
    except Exception as e:
        print(f"PIL error: {e}")
        return

    # Use OpenRouter client
    try:
        from core.openrouter_client import OpenRouterClient

        client = OpenRouterClient()
        print(f"API key: {client.api_key[:20]}...")

        print("Sending to vision model (openrouter/free)...")
        response = await client.chat_with_vision(
            prompt="""Analyze this screenshot carefully.
1. Describe what application is visible on screen
2. List all UI elements you can see (buttons, input fields, chat boxes, etc.)
3. For any text input/chat input area, give its approximate pixel coordinates (x, y from top-left)
4. What is the approximate location of any chat input box?

Be specific about positions.""",
            image_data=b64,
            system_prompt="You are a UI analysis expert. Describe what you see on screen and provide pixel coordinates for key UI elements.",
        )
        print(f"\n=== Vision Response ===\nModel: {response.model}\n")
        print(response.content)
        await client.close()
    except Exception as e:
        print(f"OpenRouter error: {e}")
        import traceback

        traceback.print_exc()


asyncio.run(main())
