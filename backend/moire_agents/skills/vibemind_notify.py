"""
VibeMind Notifier — sends a message to VibeMind's Game Console chat
via Electron's Chrome DevTools Protocol (CDP) port 9223.

Usage:
    python skills/vibemind_notify.py "Your message here"

How it works:
    1. Connects to CDP at http://localhost:9223
    2. Finds the VibeMind renderer page
    3. Calls window.vibemind.sendChatMessage(text) via JS evaluation
    4. Returns the agent's response

Requires VibeMind Electron app to be running (npm start in electron-app/).
"""

import argparse
import asyncio
import io
import json
import sys
from typing import Optional

# Force UTF-8 output on Windows
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

try:
    import aiohttp
except ImportError:
    print("ERROR: aiohttp not installed. Run: pip install aiohttp", file=sys.stderr)
    sys.exit(1)


CDP_HOST = "http://localhost:9223"
TIMEOUT = 30  # seconds to wait for response


async def get_vibemind_target(session: aiohttp.ClientSession) -> Optional[dict]:
    """Find the VibeMind main renderer page via CDP."""
    try:
        async with session.get(
            f"{CDP_HOST}/json", timeout=aiohttp.ClientTimeout(total=5)
        ) as resp:
            if resp.status != 200:
                return None
            targets = await resp.json()
    except Exception as e:
        print(f"ERROR: Cannot connect to CDP at {CDP_HOST}: {e}", file=sys.stderr)
        print("Is VibeMind running? (cd electron-app && npm start)", file=sys.stderr)
        return None

    pages = [t for t in targets if t.get("type") == "page"]

    # 1. Prefer the VibeMind main Multiverse page (has window.vibemind.sendChatMessage)
    for target in pages:
        title = target.get("title", "")
        if "Multiverse" in title or "VibeMind" in title:
            return target

    # 2. Prefer index.html pages that are not devtools/rowboat/dist
    for target in pages:
        url = target.get("url", "")
        if "devtools" not in url.lower() and "rowboat" not in url.lower():
            return target

    # 3. Any non-devtools page
    for target in pages:
        url = target.get("url", "")
        if "devtools" not in url.lower():
            return target

    return pages[0] if pages else None


async def cdp_send(ws, method: str, params: dict = None, id: int = 1) -> dict:
    """Send a CDP command and wait for its response."""
    cmd = {"id": id, "method": method}
    if params:
        cmd["params"] = params
    await ws.send_str(json.dumps(cmd))

    async for msg in ws:
        if msg.type == aiohttp.WSMsgType.TEXT:
            data = json.loads(msg.data)
            if data.get("id") == id:
                return data
        elif msg.type in (aiohttp.WSMsgType.ERROR, aiohttp.WSMsgType.CLOSE):
            raise ConnectionError(f"WebSocket closed: {msg}")
    return {}


async def send_to_vibemind(message: str, notify_only: bool = False) -> dict:
    """
    Send message to VibeMind.

    notify_only=True: just display in game console (no AI response needed)
    notify_only=False: send through process_intent (Rachel responds)
    """
    async with aiohttp.ClientSession() as session:
        target = await get_vibemind_target(session)
        if not target:
            return {"success": False, "error": "No VibeMind page found in CDP"}

        ws_url = target.get("webSocketDebuggerUrl")
        if not ws_url:
            return {"success": False, "error": "No WebSocket URL for target"}

        print(f"Connecting to: {target.get('title', 'unknown')}")

        async with session.ws_connect(
            ws_url, timeout=aiohttp.ClientTimeout(total=TIMEOUT)
        ) as ws:
            await cdp_send(ws, "Runtime.enable", id=1)

            escaped = json.dumps(message)

            if notify_only:
                # Inject directly into game console UI — no AI response needed
                js_code = f"""
(async () => {{
    try {{
        // Make game console visible
        const gc = document.getElementById('game-console');
        if (gc && gc.classList.contains('hidden')) {{
            gc.classList.remove('hidden');
            const voicePanel = document.getElementById('voice-panel');
            if (voicePanel) voicePanel.style.bottom = '90px';
        }}
        // Add message as agent notification
        if (window.multiverseApp && window.multiverseApp.addGcMessage) {{
            window.multiverseApp.addGcMessage({escaped}, 'agent');
            return {{success: true, message: 'Notification displayed'}};
        }}
        // Fallback: direct DOM injection
        const container = document.getElementById('gc-messages');
        if (container) {{
            const div = document.createElement('div');
            div.className = 'gc-msg gc-agent';
            div.textContent = {escaped};
            container.appendChild(div);
            return {{success: true, message: 'Notification injected to DOM'}};
        }}
        return {{success: false, error: 'Game console not found'}};
    }} catch(e) {{
        return {{success: false, error: e.message}};
    }}
}})()
"""
                result = await cdp_send(
                    ws,
                    "Runtime.evaluate",
                    {
                        "expression": js_code,
                        "awaitPromise": True,
                        "returnByValue": True,
                        "timeout": 5000,
                    },
                    id=2,
                )
            else:
                # Full process_intent path (Rachel responds, may timeout)
                js_code = f"""
(async () => {{
    if (!window.vibemind || !window.vibemind.sendChatMessage) {{
        return {{success: false, error: 'window.vibemind.sendChatMessage not available'}};
    }}
    // Show user message immediately
    if (window.multiverseApp && window.multiverseApp.addGcMessage) {{
        const gc = document.getElementById('game-console');
        if (gc && gc.classList.contains('hidden')) {{
            gc.classList.remove('hidden');
            const vp = document.getElementById('voice-panel');
            if (vp) vp.style.bottom = '90px';
        }}
        window.multiverseApp.addGcMessage({escaped}, 'user');
    }}
    try {{
        const result = await window.vibemind.sendChatMessage({escaped});
        return result;
    }} catch(e) {{
        return {{success: false, error: e.message}};
    }}
}})()
"""
                result = await cdp_send(
                    ws,
                    "Runtime.evaluate",
                    {
                        "expression": js_code,
                        "awaitPromise": True,
                        "returnByValue": True,
                        "timeout": TIMEOUT * 1000,
                    },
                    id=2,
                )

            if "error" in result:
                return {"success": False, "error": str(result["error"])}

            value = result.get("result", {}).get("result", {}).get("value")
            if value is None:
                exc = result.get("result", {}).get("exceptionDetails", {})
                return {"success": False, "error": str(exc) if exc else "No response"}

            return (
                value
                if isinstance(value, dict)
                else {"success": True, "message": str(value)}
            )


async def main():
    parser = argparse.ArgumentParser(description="Send a note to VibeMind Game Console")
    parser.add_argument(
        "message", nargs="?", help="Message to send (reads from stdin if not provided)"
    )
    parser.add_argument(
        "--cdp-port", type=int, default=9223, help="Electron CDP port (default: 9223)"
    )
    parser.add_argument(
        "--notify-only",
        action="store_true",
        help="Display notification only (no AI response, instant)",
    )
    args = parser.parse_args()

    global CDP_HOST
    CDP_HOST = f"http://localhost:{args.cdp_port}"

    if args.message:
        message = args.message
    else:
        # Read from stdin
        print("Reading message from stdin (Ctrl+D when done):", file=sys.stderr)
        message = sys.stdin.read().strip()

    if not message:
        print("ERROR: No message provided", file=sys.stderr)
        sys.exit(1)

    print(f"Sending to VibeMind: {message[:100]}{'...' if len(message) > 100 else ''}")
    result = await send_to_vibemind(message, notify_only=args.notify_only)

    print(f"\nResult: {json.dumps(result, indent=2, ensure_ascii=False)}")

    if not result.get("success", True):
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
