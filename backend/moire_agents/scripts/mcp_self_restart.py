"""MCP Self-Restart Script v3

Workflow (user has already typed /mcp, the panel is visible):
  1. Scan for "desktop-automation" + its status (Connected/Disconnected)
  2. Click on the desktop-automation entry
  3. Wait for detail panel → find and click "Reconnect"
  4. Wait until MCP tools are available again (poll loop)
  5. Close panel, restore chat focus
  6. Insert "continue" message into chat

Usage:
  python scripts/mcp_self_restart.py [--timeout 30]
"""

import argparse
import os
import sys
import time

import mss as mss_mod
import numpy
import pyautogui
import pyperclip
from PIL import Image
from rapidocr_onnxruntime import RapidOCR

ocr = RapidOCR()


# ─── UIA-based element finding (much more reliable than OCR) ─────────────


def uia_walk_find(search_text: str, max_depth: int = 12, click: bool = False):
    """Generalized UIA tree walk — finds ANY control containing search_text.

    Unlike ButtonControl(Name=...) which only matches exact type+name,
    this walks the entire tree and checks Name on every control. Works
    for Electron/Chromium apps where buttons are CustomControl, GroupControl,
    HyperlinkControl, etc.

    Returns (name, cx, cy) or None. If click=True, clicks it too.
    """
    try:
        import uiautomation as uia

        uia.SetGlobalSearchTimeout(2)

        # Start from the DESKTOP root and find VS Code by title.
        # GetForegroundControl() fails in background processes.
        root = uia.GetRootControl()
        vscode = None
        try:
            vscode = root.WindowControl(searchDepth=3, SubName="Visual Studio Code")
        except Exception:
            pass
        if not vscode:
            try:
                vscode = root.WindowControl(searchDepth=3, SubName="Vibemind")
            except Exception:
                pass
        if not vscode:
            vscode = uia.GetForegroundControl() or root

        search_lc = search_text.lower()
        stack = [(vscode, 0)]
        visited = 0

        while stack and visited < 3000:
            node, depth = stack.pop()
            visited += 1
            if depth > max_depth:
                continue

            try:
                name = (node.Name or "").strip()
            except Exception:
                continue

            if name and search_lc == name.lower():
                try:
                    rect = node.BoundingRectangle
                    if rect:
                        cx = int((rect.left + rect.right) / 2)
                        cy = int((rect.top + rect.bottom) / 2)
                        if cx > 0 and cy > 0:
                            ctype = ""
                            try:
                                ctype = node.ControlTypeName
                            except Exception:
                                pass
                            safe = name[:40].encode("ascii", "replace").decode()
                            print(f"  -> UIA found '{safe}' [{ctype}] at ({cx}, {cy})")
                            if click:
                                pyautogui.click(cx, cy)
                            return (name, cx, cy)
                except Exception:
                    pass

            try:
                for child in node.GetChildren():
                    stack.append((child, depth + 1))
            except Exception:
                pass

        print(f"  UIA walk: '{search_text}' not found ({visited} nodes checked)")
    except Exception as e:
        print(f"  UIA walk error: {e}")
    return None


# ─── OCR fallback (used only if UIA fails) ───────────────────────────────


def scan_region(x, y, w, h):
    """OCR a screen region. Returns [(text, global_cx, global_cy, conf), ...]"""
    with mss_mod.mss() as sct:
        raw = sct.grab({"left": x, "top": y, "width": w, "height": h})
    img = Image.frombytes("RGB", raw.size, raw.bgra, "raw", "BGRX")
    result, _ = ocr(numpy.array(img))
    targets = []
    for poly, text, conf in result or []:
        xs = [p[0] for p in poly]
        ys = [p[1] for p in poly]
        cx = int(sum(xs) / len(xs)) + x
        cy = int(sum(ys) / len(ys)) + y
        targets.append((text, cx, cy, conf))
    return targets


def get_monitors():
    with mss_mod.mss() as sct:
        return sct.monitors[1:]


def scan_all_monitors():
    all_targets = []
    for mon in get_monitors():
        targets = scan_region(mon["left"], mon["top"], mon["width"], mon["height"])
        all_targets.extend(targets)
    return all_targets


def mcp_is_available():
    """Check if the MCP server is responding by importing and probing."""
    try:
        # Quick check: can we import and call handle_status?
        sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        os.environ.setdefault("TRANSFORMERS_NO_JAX", "1")
        os.environ.setdefault("USE_JAX", "0")
        os.environ.setdefault("USE_FLAX", "0")
        import asyncio

        import mcp_server_handoff as m

        result = asyncio.run(m.handle_status())
        return result.get("runtime") is not None
    except Exception:
        return False


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--timeout", type=int, default=30)
    parser.add_argument(
        "--server",
        type=str,
        default="desktop-automation",
        help="MCP server name as shown in /mcp panel",
    )
    args = parser.parse_args()

    print(f"MCP Self-Restart v4 — server: {args.server}")
    print("=" * 40)

    # Step 0: Type /mcp and wait for the panel to appear.
    # Two modes:
    #   A) MCP handoff_action already queued "/mcp" → just wait for it
    #   B) Script types "/mcp" itself via pyautogui (fallback)
    skip_type = os.environ.get("MCP_RESTART_SKIP_TYPE", "")
    initial_wait = int(os.environ.get("MCP_RESTART_INITIAL_WAIT", "8"))

    if not skip_type:
        print("\n[0/5] Typing /mcp into chat...")
        # Focus Claude Code chat first
        pyautogui.hotkey("ctrl", "escape")
        time.sleep(0.5)
        pyautogui.hotkey("ctrl", "escape")
        time.sleep(0.5)
        pyperclip.copy("/mcp")
        pyautogui.hotkey("ctrl", "v")
        time.sleep(0.3)
        pyautogui.press("enter")
        print(f"  Waiting {initial_wait}s for panel...")
    else:
        print(f"\n[0/5] /mcp already queued, waiting {initial_wait}s...")

    time.sleep(initial_wait)

    # Step 1: Find "desktop-automation" in the /mcp panel.
    # Strategy: UIA first (exact, reliable), OCR fallback.
    server_name = args.server
    print(f"\n[1/5] Finding '{server_name}' (UIA -> OCR)...")
    da_pos = None
    for attempt in range(5):
        result = uia_walk_find(server_name)
        if result:
            da_pos = (result[1], result[2])
        if da_pos:
            print(f"  UIA found at {da_pos}")
            break
        # OCR fallback — scan all monitors.
        targets = scan_all_monitors()
        for text, cx, cy, conf in targets:
            if text.strip().lower() == server_name.lower() and len(text) < 40:
                da_pos = (cx, cy)
                print(f"  OCR found at {da_pos}")
                break
        if da_pos:
            break
        print(f"  Attempt {attempt+1}/5 — not found, waiting 3s...")
        time.sleep(3)

    if not da_pos:
        print("  ERROR: 'desktop-automation' not found.")
        sys.exit(1)

    # Step 2: Click on desktop-automation entry.
    print(f"\n[2/5] Clicking {server_name} at {da_pos}...")
    pyautogui.click(da_pos[0], da_pos[1])
    time.sleep(1.5)

    # Step 3: Find and click "Reconnect" button.
    # Strategy: UIA first (Button control), OCR fallback.
    print("\n[3/5] Finding 'Reconnect' button (UIA -> OCR)...")
    reconnect_clicked = False

    # UIA: generalized tree walk — any control type with name "Reconnect".
    if uia_walk_find("Reconnect", click=True):
        reconnect_clicked = True
    elif uia_walk_find("Restart", click=True):
        reconnect_clicked = True

    # OCR fallback.
    if not reconnect_clicked:
        print("  UIA failed, trying OCR...")
        targets = scan_all_monitors()
        for text, cx, cy, conf in targets:
            stripped = text.strip()
            if stripped.lower() in ("reconnect", "restart"):
                safe = stripped[:30].encode("ascii", "replace").decode()
                print(f"  -> OCR Click '{safe}' at ({cx}, {cy})")
                pyautogui.click(cx, cy)
                reconnect_clicked = True
                break

    if not reconnect_clicked:
        print("  ERROR: 'Reconnect' button not found via UIA or OCR")
        sys.exit(1)

    # Step 4: Wait for MCP to come back
    print(f"\n[4/5] Waiting for MCP reconnect (max {args.timeout}s)...")
    deadline = time.time() + args.timeout
    while time.time() < deadline:
        time.sleep(2)
        if mcp_is_available():
            print("  MCP is back!")
            break
        print("  ... still waiting")
    else:
        print("  Timeout — MCP may still be starting")

    # Step 5: Close the MCP panel properly
    print("\n[5/5] Closing MCP panel...")

    # First try clicking "Back to list" if we're in the detail view
    back = uia_walk_find("Back to list", click=True)
    if not back:
        # OCR fallback for "Back to list"
        targets = scan_all_monitors()
        for text, cx, cy, conf in targets:
            if "back to list" in text.strip().lower() and len(text) < 30:
                print(f"  -> OCR Click 'Back to list' at ({cx}, {cy})")
                pyautogui.click(cx, cy)
                break
    time.sleep(0.5)

    # Multiple Escape presses to close all layers
    for _ in range(4):
        pyautogui.press("escape")
        time.sleep(0.2)
    time.sleep(0.3)

    # Click directly on the chat input area to dismiss any overlay.
    # Scan for "ctrl esc" or "Message input" text which marks the input field.
    targets = scan_all_monitors()
    input_clicked = False
    for text, cx, cy, conf in targets:
        if "ctrl esc" in text.lower() or "message input" in text.lower():
            print(f"  -> Clicking chat input at ({cx}, {cy})")
            pyautogui.click(cx, cy)
            input_clicked = True
            break
    if not input_clicked:
        # Fallback: Ctrl+Escape to toggle Claude focus
        pyautogui.hotkey("ctrl", "escape")
        time.sleep(0.3)
        pyautogui.hotkey("ctrl", "escape")
    time.sleep(0.5)

    # Insert handback message
    print("  Inserting handback message...")
    pyperclip.copy(f"MCP {server_name} restarted. Continue where you left off.")
    pyautogui.hotkey("ctrl", "v")
    time.sleep(0.3)
    pyautogui.press("enter")

    print("\nDone!")


if __name__ == "__main__":
    main()
