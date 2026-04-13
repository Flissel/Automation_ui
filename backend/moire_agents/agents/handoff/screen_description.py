"""Rich screen description tools for the Handoff MCP server.

Phase 4.2: 6 MCP tools that let an agent understand the screen WITHOUT
interpreting pixels. Designed against the "blind user" benchmark — given
a black screen, can the agent still navigate by asking these tools?

Tools
=====

  - handoff_describe_screen     — full state composite
  - handoff_describe_focus      — currently focused element details
  - handoff_get_window_tree     — visible windows with bounds + process
  - handoff_get_selection       — what the user has selected
  - handoff_get_cursor_context  — cursor position with surrounding text
  - handoff_list_actionable     — clickable / typeable elements

Data sources
============

Primary: `uiautomation` (Windows UIA) — exposes the actual control tree
with names, types, bounds, supported actions. Fast and structurally
correct.

Fallbacks:
  - `agents.handoff.window_focus` for visible-window enumeration via Win32
  - `psutil` for process names by PID
  - `pyautogui` for cursor position
  - existing `agents.subagents.vision_subagent.ScreenRegion` /
    `DEFAULT_REGION_BOUNDS` for region segmentation

If neither uiautomation nor the Win32 helpers are available, every tool
returns `{available: false, reason: ...}` so the MCP stays usable.
"""

from __future__ import annotations

import asyncio
import logging
import sys
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


# ─── Lazy imports ────────────────────────────────────────────────────────────


def _try_uia():
    try:
        import uiautomation  # type: ignore

        return uiautomation
    except Exception as e:
        logger.debug(f"uiautomation unavailable: {e}")
        return None


def _try_psutil():
    try:
        import psutil  # type: ignore

        return psutil
    except Exception:
        return None


def _try_pyautogui():
    try:
        import pyautogui  # type: ignore

        return pyautogui
    except Exception:
        return None


def _try_window_focus():
    try:
        from agents.handoff import window_focus  # type: ignore

        return window_focus
    except Exception as e:
        logger.debug(f"window_focus unavailable: {e}")
        return None


def _try_screen_regions():
    try:
        from agents.subagents.vision_subagent import (  # type: ignore
            DEFAULT_REGION_BOUNDS, ScreenRegion)

        return ScreenRegion, DEFAULT_REGION_BOUNDS
    except Exception as e:
        logger.debug(f"vision_subagent regions unavailable: {e}")
        return None, None


# ─── Helpers ─────────────────────────────────────────────────────────────────


def _process_name_for_pid(pid: Optional[int]) -> Optional[str]:
    if pid is None:
        return None
    psutil = _try_psutil()
    if psutil is None:
        return None
    try:
        return psutil.Process(pid).name()
    except Exception:
        return None


def _uia_rect_to_dict(rect) -> Dict[str, int]:
    """Convert a UIA Rect to a plain bounds dict."""
    return {
        "left": int(getattr(rect, "left", 0)),
        "top": int(getattr(rect, "top", 0)),
        "right": int(getattr(rect, "right", 0)),
        "bottom": int(getattr(rect, "bottom", 0)),
        "width": int(getattr(rect, "right", 0) - getattr(rect, "left", 0)),
        "height": int(getattr(rect, "bottom", 0) - getattr(rect, "top", 0)),
    }


def _uia_describe_control(ctrl) -> Dict[str, Any]:
    """Describe a single uiautomation control as a flat dict."""
    info: Dict[str, Any] = {}
    try:
        info["name"] = ctrl.Name or ""
    except Exception:
        info["name"] = ""
    try:
        info["control_type"] = ctrl.ControlTypeName
    except Exception:
        info["control_type"] = "Unknown"
    try:
        info["class_name"] = ctrl.ClassName or ""
    except Exception:
        info["class_name"] = ""
    try:
        info["automation_id"] = ctrl.AutomationId or ""
    except Exception:
        info["automation_id"] = ""
    try:
        info["bounds"] = _uia_rect_to_dict(ctrl.BoundingRectangle)
    except Exception:
        info["bounds"] = None
    try:
        info["is_enabled"] = bool(ctrl.IsEnabled)
    except Exception:
        info["is_enabled"] = None
    try:
        info["is_keyboard_focusable"] = bool(ctrl.IsKeyboardFocusable)
    except Exception:
        info["is_keyboard_focusable"] = None

    # Discover supported patterns (== "actions").
    actions: List[str] = []
    for pattern_name, attr in [
        ("Invoke", "GetInvokePattern"),
        ("Toggle", "GetTogglePattern"),
        ("SelectionItem", "GetSelectionItemPattern"),
        ("Value", "GetValuePattern"),
        ("ExpandCollapse", "GetExpandCollapsePattern"),
        ("Scroll", "GetScrollPattern"),
        ("Window", "GetWindowPattern"),
        ("Text", "GetTextPattern"),
    ]:
        try:
            getter = getattr(ctrl, attr, None)
            if getter:
                pat = getter()
                if pat is not None:
                    actions.append(pattern_name)
        except Exception:
            continue
    info["supported_actions"] = actions

    return info


# ─── Tool implementations ────────────────────────────────────────────────────


async def handle_describe_screen(detail: str = "summary") -> Dict[str, Any]:
    """Composite screen description.

    detail='summary': active window + window list + region bounds (no OCR).
    detail='full':    summary + OCR text for every physical monitor.
    detail='deep':    full + vision-model cross-check per monitor, with an
                       agreement_score between OCR and vision text.
    """
    out: Dict[str, Any] = {"success": True, "detail": detail}

    # Active window via window_focus or UIA fallback.
    wf = _try_window_focus()
    if wf is not None:
        try:
            active = await wf.get_active_window()
            out["active_window"] = active
        except Exception as e:
            out["active_window"] = {"success": False, "error": str(e)}
    else:
        out["active_window"] = {"success": False, "error": "window_focus unavailable"}

    # Visible windows.
    if wf is not None:
        try:
            wins = wf.list_visible_windows()
            psutil = _try_psutil()
            if psutil is not None:
                # Enrich with process names where possible.
                import ctypes

                user32 = ctypes.windll.user32
                for w in wins:
                    try:
                        pid = ctypes.c_ulong()
                        user32.GetWindowThreadProcessId(w["hwnd"], ctypes.byref(pid))
                        w["pid"] = pid.value
                        w["process"] = _process_name_for_pid(pid.value)
                    except Exception:
                        pass
            out["all_windows"] = wins
            out["window_count"] = len(wins)
        except Exception as e:
            out["all_windows"] = []
            out["all_windows_error"] = str(e)
    else:
        out["all_windows"] = []

    # Physical monitors via mss — this is the source of truth for where
    # text actually lives on screen. The hardcoded 1920x1080 region table
    # from vision_subagent is only used as a secondary hint.
    physical_monitors: List[Dict[str, Any]] = []
    try:
        import mss  # type: ignore

        with mss.mss() as sct:
            for idx, m in enumerate(sct.monitors[1:]):  # skip virtual combined at [0]
                physical_monitors.append(
                    {
                        "index": idx,
                        "left": m["left"],
                        "top": m["top"],
                        "width": m["width"],
                        "height": m["height"],
                    }
                )
    except Exception as e:
        logger.debug(f"describe_screen: mss enumerate failed: {e}")
    out["monitors"] = physical_monitors
    out["monitor_count"] = len(physical_monitors)

    # Region bounds from vision_subagent (hint only).
    ScreenRegion, DEFAULT_REGION_BOUNDS = _try_screen_regions()
    regions: List[Dict[str, Any]] = []
    if ScreenRegion is not None and DEFAULT_REGION_BOUNDS is not None:
        for region, bounds in DEFAULT_REGION_BOUNDS.items():
            regions.append(
                {
                    "name": region.value,
                    "bounds": {
                        "x": getattr(bounds, "x", 0),
                        "y": getattr(bounds, "y", 0),
                        "width": getattr(bounds, "width", 0),
                        "height": getattr(bounds, "height", 0),
                    },
                }
            )
    out["regions"] = regions

    # Focused element via UIA.
    uia = _try_uia()
    if uia is not None:
        try:
            focused = uia.GetFocusedControl()
            if focused is not None:
                out["focused_element"] = _uia_describe_control(focused)
            else:
                out["focused_element"] = None
        except Exception as e:
            out["focused_element"] = {"error": str(e)}
    else:
        out["focused_element"] = None
        out["focused_element_note"] = "uiautomation not available"

    # Selection (clipboard-based fallback).
    try:
        from agents.handoff.screen_description import \
            handle_get_selection  # noqa: F401  (self-ref OK)

        sel = await handle_get_selection()
        out["selection"] = sel
    except Exception as e:
        out["selection"] = {"error": str(e)}

    # Cursor.
    try:
        cur = await handle_get_cursor_context()
        out["cursor"] = cur
    except Exception as e:
        out["cursor"] = {"error": str(e)}

    # Full / Deep mode: OCR per physical monitor. Deep mode also runs the
    # vision agent for each monitor and computes OCR↔vision agreement.
    # Imports are lazy so we don't pull pyautogui+ocr at module load.
    if detail in ("full", "deep"):
        use_vision = detail == "deep"
        try:
            from mcp_server_handoff import handle_read_screen  # type: ignore

            monitor_texts: List[Dict[str, Any]] = []
            for mon in physical_monitors:
                try:
                    ocr = await handle_read_screen(
                        monitor_id=mon["index"],
                        include_screenshot=False,
                        with_vision=use_vision,
                    )
                    if ocr.get("success"):
                        entry: Dict[str, Any] = {
                            "monitor_index": mon["index"],
                            "bounds": {
                                "left": mon["left"],
                                "top": mon["top"],
                                "width": mon["width"],
                                "height": mon["height"],
                            },
                            "text": ocr.get("text") or "",
                            "text_length": ocr.get("text_length", 0),
                            "ocr_method": ocr.get("ocr_method"),
                            "screenshot_path": ocr.get("screenshot_path"),
                            "tesseract": ocr.get("tesseract"),
                        }
                        if use_vision and "vision" in ocr:
                            entry["vision"] = ocr["vision"]
                        monitor_texts.append(entry)
                except Exception as e:
                    monitor_texts.append(
                        {
                            "monitor_index": mon["index"],
                            "error": str(e),
                        }
                    )
            out["monitor_texts"] = monitor_texts

            # Back-compat: also annotate the hardcoded region list with a
            # preview from monitor 0, so callers that expect the old shape
            # still get something.
            if monitor_texts and monitor_texts[0].get("text"):
                first = monitor_texts[0]["text"]
                for r in regions:
                    r["text_preview"] = first[:300]

            # Deep mode: surface a top-level cross-validation summary so
            # the caller doesn't have to sift through every monitor. The
            # verdict thresholds depend on which scoring method produced
            # the numbers — semantic cosine and token overlap are on
            # different scales.
            if use_vision:
                score_entries: List[Dict[str, Any]] = []
                for mt in monitor_texts:
                    v = mt.get("vision")
                    if not (isinstance(v, dict) and v.get("available")):
                        continue
                    score = v.get("agreement_score")
                    if isinstance(score, (int, float)):
                        score_entries.append(
                            {
                                "score": float(score),
                                "method": v.get("score_method", "unknown"),
                            }
                        )

                if score_entries:
                    scores = [e["score"] for e in score_entries]
                    # If any entry used semantic scoring, use semantic
                    # thresholds for the verdict (stricter, because cosine
                    # of normalized BERT embeddings rarely drops below 0.3
                    # even for unrelated texts).
                    methods = {e["method"] for e in score_entries}
                    uses_semantic = "sentence_transformers" in methods
                    if uses_semantic:
                        consistent_th, partial_th = 0.55, 0.40
                    else:
                        consistent_th, partial_th = 0.40, 0.20

                    out["cross_validation"] = {
                        "agreement_scores": scores,
                        "avg": round(sum(scores) / len(scores), 3),
                        "min": min(scores),
                        "max": max(scores),
                        "score_method": (
                            "sentence_transformers"
                            if uses_semantic
                            else "token_overlap"
                        ),
                        "thresholds": {
                            "consistent": consistent_th,
                            "partial": partial_th,
                        },
                        "verdict": (
                            "consistent"
                            if min(scores) >= consistent_th
                            else (
                                "partial_mismatch"
                                if max(scores) >= partial_th
                                else "strong_mismatch"
                            )
                        ),
                    }
                else:
                    out["cross_validation"] = {
                        "available": False,
                        "reason": "vision agent returned no scored results",
                    }
        except Exception as e:
            out["ocr_error"] = str(e)

    return out


async def handle_describe_focus() -> Dict[str, Any]:
    """Describe the currently focused element via UIA."""
    uia = _try_uia()
    if uia is None:
        # Fallback to window-only info via window_focus.
        wf = _try_window_focus()
        if wf is None:
            return {
                "success": False,
                "error": "uiautomation and window_focus both unavailable",
            }
        active = await wf.get_active_window()
        return {
            "success": True,
            "source": "window_focus",
            "limited": True,
            "active_window": active,
        }

    try:
        focused = uia.GetFocusedControl()
    except Exception as e:
        return {"success": False, "error": f"GetFocusedControl failed: {e}"}

    if focused is None:
        return {"success": True, "available": False, "reason": "no focused control"}

    described = _uia_describe_control(focused)

    # Add parent-window context.
    parent_chain: List[Dict[str, Any]] = []
    try:
        cur = focused.GetParentControl()
        depth = 0
        while cur is not None and depth < 10:
            try:
                parent_chain.append(
                    {
                        "name": cur.Name or "",
                        "control_type": cur.ControlTypeName,
                    }
                )
            except Exception:
                break
            try:
                cur = cur.GetParentControl()
            except Exception:
                break
            depth += 1
    except Exception:
        pass

    return {
        "success": True,
        "source": "uiautomation",
        "element": described,
        "parent_chain": parent_chain,
    }


async def handle_get_window_tree() -> Dict[str, Any]:
    """Hierarchy of visible windows with PID, process, bounds."""
    wf = _try_window_focus()
    if wf is None:
        return {"success": False, "error": "window_focus unavailable"}

    wins = wf.list_visible_windows()
    psutil = _try_psutil()

    import ctypes

    user32 = ctypes.windll.user32

    enriched: List[Dict[str, Any]] = []
    for i, w in enumerate(wins):
        entry: Dict[str, Any] = {
            "hwnd": w.get("hwnd"),
            "title": w.get("title"),
            "z_order": i,  # enumeration order is approximate z-order
            "is_minimized": False,
            "bounds": None,
            "pid": None,
            "process": None,
        }
        try:
            pid = ctypes.c_ulong()
            user32.GetWindowThreadProcessId(w["hwnd"], ctypes.byref(pid))
            entry["pid"] = pid.value
            if psutil is not None:
                entry["process"] = _process_name_for_pid(pid.value)
        except Exception:
            pass

        # Bounds via GetWindowRect.
        try:

            class _RECT(ctypes.Structure):
                _fields_ = [
                    ("left", ctypes.c_long),
                    ("top", ctypes.c_long),
                    ("right", ctypes.c_long),
                    ("bottom", ctypes.c_long),
                ]

            rect = _RECT()
            if user32.GetWindowRect(w["hwnd"], ctypes.byref(rect)):
                entry["bounds"] = {
                    "left": rect.left,
                    "top": rect.top,
                    "right": rect.right,
                    "bottom": rect.bottom,
                    "width": rect.right - rect.left,
                    "height": rect.bottom - rect.top,
                }
        except Exception:
            pass

        try:
            entry["is_minimized"] = bool(user32.IsIconic(w["hwnd"]))
        except Exception:
            pass

        enriched.append(entry)

    return {
        "success": True,
        "count": len(enriched),
        "windows": enriched,
    }


async def handle_get_selection() -> Dict[str, Any]:
    """What the user has currently selected.

    Strategy: read clipboard via pyperclip — this is the only universal
    selection mechanism on Windows without injecting Ctrl+C. Limitation:
    we cannot detect a *fresh* selection vs an old clipboard value, so we
    annotate the result with `source: clipboard` to be honest about it.
    """
    try:
        import pyperclip  # type: ignore

        text = pyperclip.paste()
    except Exception as e:
        return {"success": False, "error": f"pyperclip unavailable: {e}"}

    wf = _try_window_focus()
    source_window = None
    source_app = None
    if wf is not None:
        try:
            active = await wf.get_active_window()
            if active.get("success"):
                source_window = active.get("title")
                source_app = _process_name_for_pid(active.get("pid"))
        except Exception:
            pass

    return {
        "success": True,
        "source": "clipboard",
        "text": text or "",
        "char_count": len(text or ""),
        "source_window": source_window,
        "source_app": source_app,
        "note": "Reading the clipboard cannot guarantee the value is a fresh selection",
    }


async def handle_get_cursor_context() -> Dict[str, Any]:
    """Cursor position + surrounding context (focused element details)."""
    pyautogui = _try_pyautogui()
    if pyautogui is None:
        return {"success": False, "error": "pyautogui unavailable"}

    try:
        x, y = pyautogui.position()
    except Exception as e:
        return {"success": False, "error": f"pyautogui.position failed: {e}"}

    out: Dict[str, Any] = {
        "success": True,
        "screen_x": int(x),
        "screen_y": int(y),
    }

    # Use UIA to find the element under the cursor for richer context.
    uia = _try_uia()
    if uia is not None:
        try:
            ctrl = uia.ControlFromPoint(int(x), int(y))
            if ctrl is not None:
                described = _uia_describe_control(ctrl)
                out["element_under_cursor"] = described
                bounds = described.get("bounds")
                if bounds:
                    out["element_x"] = int(x) - bounds["left"]
                    out["element_y"] = int(y) - bounds["top"]
        except Exception as e:
            out["uia_error"] = str(e)

    return out


# ─── Phase 4.3: Streaming description channel ───────────────────────────────

import hashlib
import time
import uuid

# Map subscription_id → asyncio.Task. Singleton across the process.
_subscriptions: Dict[str, "asyncio.Task"] = {}
_subscription_meta: Dict[str, Dict[str, Any]] = {}


def _screen_signature(state: Dict[str, Any]) -> str:
    """Build a stable hash that changes when the screen meaningfully changes."""
    parts = []
    aw = state.get("active_window") or {}
    parts.append(str(aw.get("title", "")))
    parts.append(str(aw.get("hwnd", "")))
    parts.append(str(state.get("window_count", 0)))
    fe = state.get("focused_element") or {}
    if isinstance(fe, dict):
        parts.append(str(fe.get("name", "")))
        parts.append(str(fe.get("control_type", "")))
    return hashlib.sha1("|".join(parts).encode("utf-8", errors="ignore")).hexdigest()[
        :16
    ]


async def _subscription_loop(subscription_id: str, interval_ms: int) -> None:
    """Background task: poll handle_describe_screen and publish on change."""
    last_sig: Optional[str] = None
    interval = max(0.05, interval_ms / 1000.0)

    # Lazy import — runtime is in agents.handoff.runtime, no cycle here.
    try:
        from agents.handoff.runtime import AgentRuntime  # type: ignore
    except Exception as e:
        logger.warning(f"_subscription_loop: AgentRuntime unavailable ({e})")
        return

    runtime: Optional[Any] = None
    try:
        # We don't construct a fresh runtime here — the MCP server's
        # singleton is fetched lazily by anyone who needs publish_step_event.
        # If we cannot reach it, we still update the meta dict so consumers
        # of the in-process callback list see updates.
        from mcp_server_handoff import _runtime as _shared  # type: ignore

        runtime = _shared
    except Exception:
        runtime = None

    while True:
        try:
            state = await handle_describe_screen(detail="summary")
            sig = _screen_signature(state)

            meta = _subscription_meta.get(subscription_id)
            if meta is None:
                # Subscription was cancelled while we were polling.
                return
            meta["last_seen_at"] = time.time()
            meta["sig"] = sig

            if sig != last_sig:
                meta["change_count"] = meta.get("change_count", 0) + 1
                last_sig = sig

                event_payload = {
                    "subscription_id": subscription_id,
                    "signature": sig,
                    "active_window_title": (state.get("active_window") or {}).get(
                        "title"
                    ),
                    "window_count": state.get("window_count"),
                    "focused_control_type": (
                        (state.get("focused_element") or {}).get("control_type")
                        if isinstance(state.get("focused_element"), dict)
                        else None
                    ),
                    "ts": time.time(),
                }

                # In-process callback path (always recorded).
                meta.setdefault("recent_events", []).append(event_payload)
                meta["recent_events"] = meta["recent_events"][-25:]  # ring buffer

                # Best-effort publish to Redis.
                if runtime is not None and hasattr(runtime, "publish_step_event"):
                    try:
                        await runtime.publish_step_event("screen_change", event_payload)
                    except Exception as e:
                        logger.debug(f"subscription publish failed: {e}")

            await asyncio.sleep(interval)
        except asyncio.CancelledError:
            logger.info(f"subscription {subscription_id} cancelled")
            return
        except Exception as e:
            logger.warning(f"subscription {subscription_id} loop error: {e}")
            await asyncio.sleep(interval)


async def handle_subscribe_screen_changes(
    interval_ms: int = 500,
    subscription_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Start a background task that publishes screen-change events.

    Returns the subscription_id; pass it to handle_unsubscribe_screen_changes
    to stop the loop. Recent events are also exposed inline through
    handle_get_screen_changes(subscription_id).
    """
    sub_id = subscription_id or f"sub_{uuid.uuid4().hex[:10]}"
    if sub_id in _subscriptions and not _subscriptions[sub_id].done():
        return {
            "success": False,
            "error": f"subscription_id {sub_id} already active",
        }

    _subscription_meta[sub_id] = {
        "started_at": time.time(),
        "interval_ms": interval_ms,
        "change_count": 0,
        "recent_events": [],
    }
    task = asyncio.create_task(_subscription_loop(sub_id, interval_ms))
    _subscriptions[sub_id] = task

    return {
        "success": True,
        "subscription_id": sub_id,
        "interval_ms": interval_ms,
    }


async def handle_unsubscribe_screen_changes(subscription_id: str) -> Dict[str, Any]:
    """Stop a previously-started subscription."""
    task = _subscriptions.pop(subscription_id, None)
    meta = _subscription_meta.pop(subscription_id, None)
    if task is None:
        return {
            "success": False,
            "error": f"unknown subscription_id: {subscription_id}",
        }
    task.cancel()
    try:
        await asyncio.wait_for(task, timeout=2.0)
    except (asyncio.CancelledError, asyncio.TimeoutError):
        pass

    return {
        "success": True,
        "subscription_id": subscription_id,
        "change_count": (meta or {}).get("change_count", 0),
    }


async def handle_get_screen_changes(subscription_id: str) -> Dict[str, Any]:
    """Return the recent in-memory events from a subscription (last 25)."""
    meta = _subscription_meta.get(subscription_id)
    if meta is None:
        return {
            "success": False,
            "error": f"unknown subscription_id: {subscription_id}",
        }
    return {
        "success": True,
        "subscription_id": subscription_id,
        "change_count": meta.get("change_count", 0),
        "events": list(meta.get("recent_events", [])),
        "last_seen_at": meta.get("last_seen_at"),
    }


# ─── Phase 4.4: UIA text extraction (better than OCR for native apps) ───────


def _uia_walk_text(
    ctrl,
    depth: int = 0,
    max_depth: int = 12,
    out: Optional[List[Dict[str, Any]]] = None,
    visited: Optional[Any] = None,
    limit: int = 4000,
) -> List[Dict[str, Any]]:
    """Walk a UIA control tree and collect every text-bearing node.

    Returns a flat list of {depth, control_type, name|value|text} dicts.
    Caps the traversal at `limit` entries to keep the cost bounded.
    """
    if out is None:
        out = []
    if visited is None:
        visited = set()
    if len(out) >= limit or depth > max_depth:
        return out
    try:
        rt_id = getattr(ctrl, "_runtimeId", None)
        if rt_id is not None:
            rt_id = tuple(rt_id)
            if rt_id in visited:
                return out
            visited.add(rt_id)
    except Exception:
        pass
    try:
        name = (ctrl.Name or "").strip()
        ctype = ctrl.ControlTypeName
    except Exception:
        return out
    if name:
        out.append({"depth": depth, "kind": ctype, "text": name[:240]})

    # Value pattern → EditControl content, ComboBox selection, etc.
    try:
        vp = ctrl.GetValuePattern()
        if vp is not None:
            val = (vp.Value or "").strip()
            if val and val != name:
                out.append(
                    {"depth": depth, "kind": f"{ctype}.Value", "text": val[:600]}
                )
    except Exception:
        pass

    # Text pattern → DocumentRange body (Chrome page, Word body, etc.)
    try:
        tp = ctrl.GetTextPattern()
        if tp is not None:
            try:
                doc_range = tp.DocumentRange
                txt = doc_range.GetText(3000) if doc_range else ""
                txt = (txt or "").strip()
                if txt and txt != name:
                    out.append(
                        {"depth": depth, "kind": f"{ctype}.Text", "text": txt[:2000]}
                    )
            except Exception:
                pass
    except Exception:
        pass

    try:
        children = ctrl.GetChildren()
    except Exception:
        children = []
    for c in children:
        if len(out) >= limit:
            break
        _uia_walk_text(c, depth + 1, max_depth, out, visited, limit)
    return out


def _window_monitor_overlap(win_bounds: Dict[str, int], mon: Dict[str, int]) -> int:
    """Return the area of overlap between a window rect and a monitor rect."""
    if not win_bounds:
        return 0
    w_left = win_bounds.get("left", 0)
    w_top = win_bounds.get("top", 0)
    w_right = win_bounds.get("right", w_left + win_bounds.get("width", 0))
    w_bottom = win_bounds.get("bottom", w_top + win_bounds.get("height", 0))
    m_left = mon["left"]
    m_top = mon["top"]
    m_right = m_left + mon["width"]
    m_bottom = m_top + mon["height"]
    ox = max(0, min(w_right, m_right) - max(w_left, m_left))
    oy = max(0, min(w_bottom, m_bottom) - max(w_top, m_top))
    return ox * oy


async def extract_uia_text_for_monitor(monitor_id: int = 0) -> Dict[str, Any]:
    """Gather UIA text from every visible window that overlaps a monitor.

    Pure Python — no pixel capture needed. Returns structured text per
    window plus a flat concatenated body for downstream matching.
    """
    uia = _try_uia()
    if uia is None:
        return {"success": False, "error": "uiautomation unavailable"}

    # Get monitor bounds from mss.
    try:
        import mss  # type: ignore

        with mss.mss() as sct:
            physical = sct.monitors[1:]
            if not physical or monitor_id >= len(physical):
                return {
                    "success": False,
                    "error": f"monitor_id {monitor_id} out of range",
                }
            mon = physical[monitor_id]
    except Exception as e:
        return {"success": False, "error": f"mss failed: {e}"}

    # Get all visible windows with their bounds.
    wf = _try_window_focus()
    if wf is None:
        return {"success": False, "error": "window_focus unavailable"}

    import ctypes

    user32 = ctypes.windll.user32

    class _RECT(ctypes.Structure):
        _fields_ = [
            ("left", ctypes.c_long),
            ("top", ctypes.c_long),
            ("right", ctypes.c_long),
            ("bottom", ctypes.c_long),
        ]

    all_windows = wf.list_visible_windows()
    windows_on_monitor: List[Dict[str, Any]] = []
    for w in all_windows:
        rect = _RECT()
        if not user32.GetWindowRect(w["hwnd"], ctypes.byref(rect)):
            continue
        bounds = {
            "left": rect.left,
            "top": rect.top,
            "right": rect.right,
            "bottom": rect.bottom,
            "width": rect.right - rect.left,
            "height": rect.bottom - rect.top,
        }
        if user32.IsIconic(w["hwnd"]):
            continue  # skip minimized
        overlap = _window_monitor_overlap(bounds, mon)
        if overlap > 0:
            windows_on_monitor.append(
                {
                    "hwnd": w["hwnd"],
                    "title": w["title"],
                    "bounds": bounds,
                    "overlap_area": overlap,
                }
            )
    # Sort by overlap area descending so the most visible window is first.
    windows_on_monitor.sort(key=lambda x: x["overlap_area"], reverse=True)

    # Walk UIA tree for each window; cap per-window cost.
    per_window: List[Dict[str, Any]] = []
    total_chars = 0
    combined_body: List[str] = []
    for w in windows_on_monitor[:6]:  # top 6 windows only
        try:
            ctrl = uia.ControlFromHandle(w["hwnd"])
            if ctrl is None:
                continue
            entries = _uia_walk_text(ctrl, limit=800)
        except Exception as e:
            logger.debug(f"UIA walk for {w['title']!r} failed: {e}")
            continue
        window_chars = sum(len(e["text"]) for e in entries)
        total_chars += window_chars
        per_window.append(
            {
                "hwnd": w["hwnd"],
                "title": w["title"],
                "entry_count": len(entries),
                "char_count": window_chars,
                "entries": entries[:120],  # cap for response size
            }
        )
        combined_body.append(f"=== {w['title']} ===")
        for e in entries:
            combined_body.append(e["text"])

    return {
        "success": True,
        "monitor_id": monitor_id,
        "monitor_bounds": mon,
        "window_count": len(per_window),
        "total_chars": total_chars,
        "text": "\n".join(combined_body),
        "per_window": per_window,
    }


async def handle_list_actionable(
    window_hwnd: Optional[int] = None,
    max_elements: int = 100,
) -> Dict[str, Any]:
    """Walk the UIA tree of the active (or specified) window and list actionable controls."""
    uia = _try_uia()
    if uia is None:
        return {"success": False, "error": "uiautomation unavailable"}

    actionable_types = {
        "ButtonControl",
        "HyperlinkControl",
        "MenuItemControl",
        "EditControl",
        "ComboBoxControl",
        "CheckBoxControl",
        "RadioButtonControl",
        "ListItemControl",
        "TabItemControl",
        "TreeItemControl",
        "SliderControl",
        "SpinnerControl",
    }

    try:
        if window_hwnd:
            root = uia.ControlFromHandle(window_hwnd)
        else:
            root = uia.GetForegroundControl()
    except Exception as e:
        return {"success": False, "error": f"could not resolve window: {e}"}

    if root is None:
        return {"success": False, "error": "no root control"}

    found: List[Dict[str, Any]] = []
    stack = [root]
    visited = 0
    max_visit = 2000  # safety cap

    while stack and len(found) < max_elements and visited < max_visit:
        node = stack.pop()
        visited += 1
        try:
            ctype = node.ControlTypeName
        except Exception:
            continue
        if ctype in actionable_types:
            found.append(_uia_describe_control(node))
        try:
            children = node.GetChildren()
            for c in children:
                stack.append(c)
        except Exception:
            continue

    return {
        "success": True,
        "count": len(found),
        "visited": visited,
        "elements": found,
    }
