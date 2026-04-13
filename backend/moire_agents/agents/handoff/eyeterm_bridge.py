"""eyeTerm collaborative POI bridge for the Handoff MCP server.

Phase 4.1: 5 MCP tools that let the agent ask the user, via eye-tracking,
to point at a region on the screen.

eyeTerm itself runs as a separate process under
`vibemind-os/spaces/desktop/eyeterm/` and is NOT part of Automation_ui.
This module talks to it through:

  1. Automation_ui's FastAPI status proxy at http://localhost:8007/api/eyeterm/*
  2. The eyeTerm process directly at http://localhost:8099/* (MJPEG + future
     /gaze, /dwell-wait, /calibrate endpoints)

Both transports are best-effort: every tool returns
`{available: false, reason: ...}` if eyeTerm is not running, so the MCP
server stays usable in environments without an eyeTerm subsystem.

The eyeTerm endpoints `/gaze`, `/dwell-wait`, `/calibrate` referenced below
are NOT YET implemented in vibemind-os/spaces/desktop/eyeterm/. Adding them
is a separate work item — see project memory `eyeterm_architecture`.
Until then the corresponding MCP tools return a structured "endpoint
missing" error so the agent can degrade gracefully.

Tools
=====

  - handoff_eyeterm_status         — is eyeTerm running / calibrated?
  - handoff_eyeterm_get_gaze       — current gaze (x, y, confidence)
  - handoff_eyeterm_dwell_request  — ask user to dwell on a region
  - handoff_eyeterm_calibrate      — kick off the GA calibration loop
  - handoff_collaborative_select   — top-level POI tool, click or gaze mode
"""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

# Endpoint base URLs.
_AUTOMATION_API_BASE = "http://localhost:8007/api/eyeterm"
_EYETERM_DIRECT_BASE = "http://localhost:8099"


# ─── Helpers ────────────────────────────────────────────────────────────────


async def _httpx_or_none():
    try:
        import httpx  # type: ignore

        return httpx
    except ImportError:
        return None


async def _try_get(url: str, timeout: float = 2.0) -> Optional[Dict[str, Any]]:
    """GET with full failure tolerance. Returns parsed JSON or None."""
    httpx = await _httpx_or_none()
    if httpx is None:
        return None
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                try:
                    return resp.json()
                except Exception:
                    return {"_text": resp.text[:500]}
            return {"_status": resp.status_code, "_text": resp.text[:500]}
    except Exception as e:
        logger.debug(f"_try_get {url} failed: {e}")
        return None


async def _try_post(
    url: str, json_body: Optional[Dict[str, Any]] = None, timeout: float = 5.0
) -> Optional[Dict[str, Any]]:
    httpx = await _httpx_or_none()
    if httpx is None:
        return None
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(url, json=json_body or {})
            if resp.status_code == 200:
                try:
                    return resp.json()
                except Exception:
                    return {"_text": resp.text[:500]}
            return {"_status": resp.status_code, "_text": resp.text[:500]}
    except Exception as e:
        logger.debug(f"_try_post {url} failed: {e}")
        return None


# ─── Tool implementations ────────────────────────────────────────────────────


def _is_real_state(payload: Optional[Dict[str, Any]]) -> bool:
    """A state payload is "real" only if it has eyeTerm's expected keys."""
    if not payload:
        return False
    if "_status" in payload or "_text" in payload:
        return False
    return any(k in payload for k in ("running", "state", "cursor_enabled"))


async def handle_eyeterm_status() -> Dict[str, Any]:
    """Return eyeTerm's current state. Used to check availability before asking."""
    proxy_state = await _try_get(f"{_AUTOMATION_API_BASE}/status", timeout=1.5)
    direct_state = await _try_get(f"{_EYETERM_DIRECT_BASE}/status", timeout=1.0)

    state: Optional[Dict[str, Any]] = None
    if _is_real_state(proxy_state):
        state = proxy_state
    elif _is_real_state(direct_state):
        state = direct_state

    if state is None:
        return {
            "success": True,
            "available": False,
            "reason": "neither /api/eyeterm/status nor :8099/status returned a valid state",
            "running": False,
            "proxy_probe": proxy_state,
            "direct_probe": direct_state,
        }

    return {
        "success": True,
        "available": True,
        "running": bool(state.get("running")),
        "state": state.get("state", "unknown"),
        "cursor_enabled": bool(state.get("cursor_enabled")),
        "stream_port": state.get("stream_port", 8099),
        "calibrated": state.get("calibrated"),  # may be None until eyeTerm exposes it
        "gaze_quality": state.get("gaze_quality"),
        "raw": state,
    }


async def handle_eyeterm_get_gaze() -> Dict[str, Any]:
    """Return the current gaze estimate {x, y, confidence}.

    Targets the planned eyeTerm endpoint :8099/gaze. Until that endpoint
    exists, this tool returns a structured "endpoint missing" payload so
    the caller can fall back to a click-based collaborative_select.
    """
    data = await _try_get(f"{_EYETERM_DIRECT_BASE}/gaze", timeout=1.0)
    if data is None:
        return {
            "success": True,
            "available": False,
            "reason": "eyeTerm /gaze endpoint not reachable",
        }
    if "_status" in data:
        return {
            "success": True,
            "available": False,
            "reason": f"eyeTerm /gaze returned HTTP {data['_status']}",
            "next_step": "implement /gaze in vibemind-os/spaces/desktop/eyeterm/stream/",
        }
    return {
        "success": True,
        "available": True,
        "gaze": data,
    }


async def handle_eyeterm_dwell_request(
    prompt: str,
    dwell_ms: int = 2000,
    timeout_ms: int = 15000,
    confidence_threshold: float = 0.6,
) -> Dict[str, Any]:
    """Ask the user to look at the target for dwell_ms, return the dwelled point.

    The implementation polls /gaze every 100ms and checks for a "stationary
    cluster" (variance below a threshold) of length dwell_ms. The notification
    that prompts the user is sent through clarify_notify.handle_notify.
    """
    # Step 1 — make sure eyeTerm is alive at all.
    status = await handle_eyeterm_status()
    if not status.get("available") or not status.get("running"):
        return {
            "success": True,
            "available": False,
            "reason": status.get("reason", "eyeTerm not running"),
            "fallback": "use handoff_collaborative_select(mode='click')",
        }

    # Step 2 — surface the prompt to the user via the existing notify pipeline.
    try:
        from agents.handoff.clarify_notify import handle_notify

        await handle_notify(
            message=prompt,
            title="eyeTerm dwell request",
            level="info",
            metadata={"dwell_ms": dwell_ms, "timeout_ms": timeout_ms},
        )
    except Exception as e:
        logger.debug(f"dwell_request notify failed: {e}")

    # Step 3 — poll /gaze.
    deadline = time.monotonic() + (timeout_ms / 1000.0)
    samples: list = []
    last_x: Optional[float] = None
    last_y: Optional[float] = None
    cluster_started_at: Optional[float] = None
    pixel_threshold = 50  # px

    while time.monotonic() < deadline:
        gaze_resp = await handle_eyeterm_get_gaze()
        if not gaze_resp.get("available"):
            return {
                "success": True,
                "available": False,
                "reason": "gaze stream unavailable mid-request",
                "fallback": "use handoff_collaborative_select(mode='click')",
            }

        g = gaze_resp.get("gaze") or {}
        gx = g.get("x")
        gy = g.get("y")
        gc = float(g.get("confidence", 0))

        if gx is None or gy is None or gc < confidence_threshold:
            cluster_started_at = None
            await asyncio.sleep(0.1)
            continue

        if (
            last_x is None
            or abs(gx - last_x) > pixel_threshold
            or abs(gy - last_y) > pixel_threshold
        ):
            cluster_started_at = time.monotonic()
            samples = [(gx, gy)]
        else:
            samples.append((gx, gy))
            if cluster_started_at is None:
                cluster_started_at = time.monotonic()
            if (time.monotonic() - cluster_started_at) * 1000 >= dwell_ms:
                # Average the cluster for the final report.
                avg_x = sum(p[0] for p in samples) / len(samples)
                avg_y = sum(p[1] for p in samples) / len(samples)
                return {
                    "success": True,
                    "available": True,
                    "x": int(avg_x),
                    "y": int(avg_y),
                    "confidence": gc,
                    "samples": len(samples),
                    "dwelled_for_ms": int(
                        (time.monotonic() - cluster_started_at) * 1000
                    ),
                }

        last_x = gx
        last_y = gy
        await asyncio.sleep(0.1)

    return {
        "success": True,
        "available": True,
        "timed_out": True,
        "reason": f"no stable dwell within {timeout_ms}ms",
    }


async def handle_eyeterm_calibrate() -> Dict[str, Any]:
    """Trigger eyeTerm's GA calibration loop."""
    data = await _try_post(f"{_EYETERM_DIRECT_BASE}/calibrate", timeout=30.0)
    if data is None:
        return {
            "success": True,
            "available": False,
            "reason": "eyeTerm /calibrate endpoint not reachable",
            "next_step": "implement /calibrate in vibemind-os/spaces/desktop/eyeterm/cursor/",
        }
    if "_status" in data:
        return {
            "success": True,
            "available": False,
            "reason": f"eyeTerm /calibrate returned HTTP {data['_status']}",
        }
    return {"success": True, "available": True, "calibration": data}


async def handle_collaborative_select(
    question: str,
    mode: str = "click",  # click | gaze
    timeout_seconds: int = 30,
) -> Dict[str, Any]:
    """High-level POI tool: ask the user where, return coordinates.

    mode='gaze'  — delegate to handle_eyeterm_dwell_request.
    mode='click' — set a global mouse hook via pynput, surface a notify,
                   then wait for the next click event up to timeout_seconds.

    If gaze mode is requested but eyeTerm is unavailable, automatically
    falls back to click mode so the agent always gets *some* answer.
    """
    if mode == "gaze":
        gaze_result = await handle_eyeterm_dwell_request(
            prompt=question,
            dwell_ms=1500,
            timeout_ms=timeout_seconds * 1000,
        )
        if gaze_result.get("available") and gaze_result.get("x") is not None:
            return {
                "success": True,
                "mode": "gaze",
                "x": gaze_result["x"],
                "y": gaze_result["y"],
                "confidence": gaze_result.get("confidence"),
                "source": "eyeterm_dwell",
            }
        # Fall through to click mode.
        logger.info("collaborative_select: gaze unavailable, falling back to click")

    # Click mode — pynput global mouse listener.
    try:
        from pynput import mouse  # type: ignore
    except ImportError:
        return {
            "success": False,
            "error": "pynput not installed",
            "hint": "pip install pynput",
        }

    try:
        from agents.handoff.clarify_notify import handle_notify

        await handle_notify(
            message=question + "\n\n(Click anywhere on the screen to mark the spot.)",
            title="Collaborative select",
            level="info",
        )
    except Exception:
        pass

    captured: Dict[str, Any] = {"x": None, "y": None}
    done = asyncio.Event()
    loop = asyncio.get_running_loop()

    def on_click(x, y, button, pressed):
        if pressed:
            captured["x"] = int(x)
            captured["y"] = int(y)
            captured["button"] = str(button)
            loop.call_soon_threadsafe(done.set)
            return False  # stop listener

    listener = mouse.Listener(on_click=on_click)
    listener.start()
    try:
        await asyncio.wait_for(done.wait(), timeout=timeout_seconds)
    except asyncio.TimeoutError:
        listener.stop()
        return {
            "success": True,
            "mode": "click",
            "timed_out": True,
            "reason": f"no click within {timeout_seconds}s",
        }
    listener.stop()

    return {
        "success": True,
        "mode": "click",
        "x": captured["x"],
        "y": captured["y"],
        "button": captured.get("button"),
        "source": "pynput",
    }
