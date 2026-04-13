"""VibeMind Direct API Bridge for the Handoff MCP server.

Phase 7: "COM for VibeMind" — the Desktop-Automation MCP gets direct access
to VibeMind's internal Python APIs, bypassing keyboard/mouse simulation.

Architecture:
  Desktop-Automation MCP → vibemind_bridge.py
    ├─ IdeasRepository (SQLite)        → Bubbles/Ideas CRUD
    ├─ IntentOrchestrator              → process_intent()
    ├─ _broadcast_to_electron()        → Electron IPC (UI commands)
    ├─ Brain HTTP API (Port 5000)      → classify/train/stats
    └─ Minibook Client                 → Agent task dispatch

Import Strategy:
  VibeMind's Python modules live under vibemind-os/voice/python/.
  We add that to sys.path (same technique as PatternStore in Phase 0.1).
  All imports are try/except — missing modules return {available: false}.

Tools (8):
  - handoff_vibemind_bubble_create     — Create bubble + broadcast to UI
  - handoff_vibemind_bubble_update     — Update bubble + broadcast
  - handoff_vibemind_bubbles_list      — List/filter bubbles
  - handoff_vibemind_intent            — Route text through process_intent
  - handoff_vibemind_brain             — Brain classify/train/stats
  - handoff_vibemind_ui_command        — Send IPC command to Electron
  - handoff_vibemind_agent_dispatch    — Dispatch task to Minibook agent
  - handoff_vibemind_agents_list       — List active agents/spaces
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# ─── VibeMind Python path setup ─────────────────────────────────────────────

_VIBEMIND_PYTHON = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        "..",
        "..",
        "..",
        "..",
        "..",  # → Vibemind_V1/
        "vibemind-os",
        "voice",
        "python",
    )
)

_VM_PATH_ADDED = False


def _ensure_vibemind_path():
    """Add VibeMind's Python root to sys.path if available."""
    global _VM_PATH_ADDED
    if _VM_PATH_ADDED:
        return
    if os.path.isdir(_VIBEMIND_PYTHON):
        if _VIBEMIND_PYTHON not in sys.path:
            sys.path.insert(0, _VIBEMIND_PYTHON)
        # Also load VibeMind's .env for DB paths etc.
        try:
            from dotenv import load_dotenv

            env_path = os.path.join(_VIBEMIND_PYTHON, "..", ".env")
            if os.path.isfile(env_path):
                load_dotenv(env_path, override=False)
        except Exception:
            pass
        _VM_PATH_ADDED = True
        logger.info(f"VibeMind Python path added: {_VIBEMIND_PYTHON}")
    else:
        logger.warning(f"VibeMind Python not found at: {_VIBEMIND_PYTHON}")


# ─── Lazy imports ────────────────────────────────────────────────────────────


def _get_ideas_repo():
    _ensure_vibemind_path()
    try:
        # IdeasRepository needs CWD to be the VibeMind python root
        # because it locates vibemind.db relative to CWD.
        saved_cwd = os.getcwd()
        try:
            os.chdir(_VIBEMIND_PYTHON)
            from data import IdeasRepository

            return IdeasRepository()
        finally:
            os.chdir(saved_cwd)
    except Exception as e:
        logger.warning(f"IdeasRepository unavailable: {e}")
        return None


def _get_orchestrator():
    _ensure_vibemind_path()
    try:
        from swarm.orchestrator.intent_orchestrator import IntentOrchestrator

        return IntentOrchestrator()
    except Exception as e:
        logger.debug(f"IntentOrchestrator unavailable: {e}")
        return None


def _get_bubble_tools():
    _ensure_vibemind_path()
    try:
        from spaces.ideas.adapted import bubble_tools

        return bubble_tools
    except Exception as e:
        logger.debug(f"bubble_tools unavailable: {e}")
        return None


# ─── HTTP helpers (Brain API, Minibook) ──────────────────────────────────────

_BRAIN_API = "http://localhost:5000/api/cortex"
_MINIBOOK_API = os.getenv("MINIBOOK_URL", "http://localhost:3480")


async def _http_get(url: str, timeout: float = 5.0) -> Optional[Dict]:
    try:
        import httpx

        async with httpx.AsyncClient(timeout=timeout) as c:
            r = await c.get(url)
            return r.json() if r.status_code == 200 else {"_status": r.status_code}
    except Exception as e:
        return None


async def _http_post(url: str, data: Dict, timeout: float = 10.0) -> Optional[Dict]:
    try:
        import httpx

        async with httpx.AsyncClient(timeout=timeout) as c:
            r = await c.post(url, json=data)
            return (
                r.json()
                if r.status_code in (200, 201)
                else {"_status": r.status_code, "_text": r.text[:500]}
            )
    except Exception as e:
        return None


# ─── Electron IPC ────────────────────────────────────────────────────────────


async def _broadcast_to_electron_via_http(message: Dict) -> bool:
    """Send IPC message to VibeMind Electron app.

    Tries multiple paths:
    1. Direct Python IPC (if workspace_tools._electron_send_message is set)
    2. CDP Runtime.evaluate on the Electron renderer (port 9222/9223)
    """
    # Path 1: Direct Python callback (only works if we're in the same process).
    try:
        _ensure_vibemind_path()
        from tools.workspace_tools import _electron_send_message

        if _electron_send_message:
            _electron_send_message(message)
            return True
    except Exception:
        pass

    # Path 2: CDP injection (always works if Electron has --remote-debugging-port).
    for port in [9223, 9222]:
        try:
            import httpx

            # Get the first page target.
            async with httpx.AsyncClient(timeout=2) as c:
                targets = (await c.get(f"http://localhost:{port}/json/list")).json()
            page_targets = [t for t in targets if t.get("type") == "page"]
            if not page_targets:
                continue
            ws_url = page_targets[0].get("webSocketDebuggerUrl")
            if not ws_url:
                continue

            # Send via CDP Runtime.evaluate.
            import websockets

            async with websockets.connect(ws_url) as ws:
                js = f"window.postMessage({json.dumps(message)}, '*');"
                await ws.send(
                    json.dumps(
                        {
                            "id": 1,
                            "method": "Runtime.evaluate",
                            "params": {"expression": js},
                        }
                    )
                )
                resp = json.loads(await asyncio.wait_for(ws.recv(), timeout=3))
                return True
        except Exception as e:
            logger.debug(f"CDP port {port} failed: {e}")
            continue

    return False


# ─── Tool implementations ────────────────────────────────────────────────────


async def handle_vibemind_bubble_create(
    title: str,
    description: str = "",
    tags: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Create a new bubble/idea in VibeMind and broadcast to Electron UI."""
    # Try adapted bubble_tools first (simple API).
    bt = _get_bubble_tools()
    if bt is not None:
        try:
            result_str = bt.create_bubble(title=title, description=description)
            # Broadcast to Electron UI.
            await _broadcast_to_electron_via_http(
                {
                    "type": "node_added",
                    "node": {"title": title, "description": description},
                }
            )
            return {
                "success": True,
                "result": result_str,
                "title": title,
                "broadcast": True,
            }
        except Exception as e:
            logger.debug(f"bubble_tools.create_bubble failed: {e}")

    # Fallback: direct DB insert via IdeasRepository.
    repo = _get_ideas_repo()
    if repo is None:
        return {
            "success": False,
            "error": "VibeMind IdeasRepository unavailable",
            "path": _VIBEMIND_PYTHON,
        }

    try:
        idea = repo.create(title=title, description=description)
        # Broadcast.
        await _broadcast_to_electron_via_http(
            {
                "type": "node_added",
                "node": {
                    "id": str(idea.id) if hasattr(idea, "id") else None,
                    "title": title,
                    "description": description,
                },
            }
        )
        return {
            "success": True,
            "idea_id": idea.id if hasattr(idea, "id") else None,
            "title": title,
            "source": "ideas_repository",
            "broadcast": True,
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


async def handle_vibemind_bubble_update(
    bubble_id: str,
    title: Optional[str] = None,
    description: Optional[str] = None,
    score: Optional[float] = None,
) -> Dict[str, Any]:
    """Update an existing bubble/idea."""
    repo = _get_ideas_repo()
    if repo is None:
        return {"success": False, "error": "IdeasRepository unavailable"}

    try:
        # Build update dict.
        updates: Dict[str, Any] = {}
        if title is not None:
            updates["title"] = title
        if description is not None:
            updates["description"] = description
        if score is not None:
            updates["score"] = score

        if not updates:
            return {"success": False, "error": "no fields to update"}

        # Use repo.update if available, else raw SQL.
        if hasattr(repo, "update"):
            repo.update(bubble_id, **updates)
        else:
            # Fallback: direct SQL.
            from data.database import get_connection

            conn = get_connection()
            set_clause = ", ".join(f"{k}=?" for k in updates)
            conn.execute(
                f"UPDATE ideas SET {set_clause} WHERE id=?",
                list(updates.values()) + [bubble_id],
            )
            conn.commit()

        # Broadcast update.
        await _broadcast_to_electron_via_http(
            {
                "type": "node_updated",
                "node": {"id": bubble_id, **updates},
            }
        )

        return {
            "success": True,
            "bubble_id": bubble_id,
            "updated": list(updates.keys()),
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


async def handle_vibemind_bubbles_list(
    filter_text: Optional[str] = None,
    limit: int = 50,
    parent_id: Optional[str] = None,
) -> Dict[str, Any]:
    """List bubbles/ideas with optional filtering."""
    repo = _get_ideas_repo()
    if repo is None:
        return {"success": False, "error": "IdeasRepository unavailable"}

    try:
        if filter_text and hasattr(repo, "get_by_title_fuzzy"):
            ideas = repo.get_by_title_fuzzy(filter_text)
        elif hasattr(repo, "list"):
            ideas = repo.list()
        elif hasattr(repo, "list_all"):
            ideas = repo.list_all()
        else:
            # Direct SQL fallback.
            from data.database import get_connection

            conn = get_connection()
            conn.row_factory = lambda c, r: dict(
                zip([col[0] for col in c.description], r)
            )
            rows = conn.execute(
                "SELECT * FROM ideas ORDER BY created_at DESC LIMIT ?", (limit,)
            ).fetchall()
            return {"success": True, "count": len(rows), "bubbles": rows}

        # Serialize.
        bubbles = []
        for idea in (ideas or [])[:limit]:
            entry = {}
            for attr in [
                "id",
                "title",
                "description",
                "score",
                "status",
                "parent_id",
                "created_at",
            ]:
                if hasattr(idea, attr):
                    val = getattr(idea, attr)
                    # Convert datetime to string for JSON serialization.
                    if hasattr(val, "isoformat"):
                        val = val.isoformat()
                    entry[attr] = val
            bubbles.append(entry)

        return {
            "success": True,
            "count": len(bubbles),
            "bubbles": bubbles,
            "filter": filter_text,
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


async def handle_vibemind_intent(text: str) -> Dict[str, Any]:
    """Route text through VibeMind's IntentOrchestrator (process_intent)."""
    if not text:
        return {"success": False, "error": "text is required"}

    orch = _get_orchestrator()
    if orch is None:
        return {"success": False, "error": "IntentOrchestrator unavailable"}

    try:
        result = await orch.process_intent(text)
        return {
            "success": True,
            "message": result.response_hint if result else "Keine Antwort",
            "event_type": result.event_type if result else None,
            "error": result.error if result and result.error else None,
            "source": "intent_orchestrator",
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


async def handle_vibemind_brain(
    action: str = "classify",
    text: Optional[str] = None,
    event_type: Optional[str] = None,
) -> Dict[str, Any]:
    """Brain microservice control: classify, train, or get stats."""
    if action == "stats":
        data = await _http_get(f"{_BRAIN_API}/classify/stats")
        if data is None:
            return {"success": False, "error": "Brain API not reachable (port 5000)"}
        return {"success": True, "action": "stats", "data": data}

    if action == "classify":
        if not text:
            return {"success": False, "error": "text required for classify"}
        data = await _http_post(f"{_BRAIN_API}/classify", {"user_text": text})
        if data is None:
            return {"success": False, "error": "Brain API not reachable"}
        return {"success": True, "action": "classify", "text": text, "data": data}

    if action == "train":
        if not text or not event_type:
            return {"success": False, "error": "text AND event_type required for train"}
        data = await _http_post(
            f"{_BRAIN_API}/classify/train",
            {"text": text, "event_type": event_type},
        )
        if data is None:
            return {"success": False, "error": "Brain API not reachable"}
        return {
            "success": True,
            "action": "train",
            "text": text,
            "event_type": event_type,
            "data": data,
        }

    return {"success": False, "error": f"unknown action: {action}"}


async def handle_vibemind_ui_command(
    command: str,
    params: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Send an IPC command to the VibeMind Electron app.

    Known command types (from VibeMind's IPC protocol):
      node_added, node_removed, node_updated, edge_added, edge_deleted,
      space_changed, canvas_refresh, navigate_to_space,
      show_notification, project_created, shuttle_launched, etc.

    This is the "COM for Electron" — direct UI manipulation without
    simulating keyboard/mouse.
    """
    if not command:
        return {"success": False, "error": "command is required"}

    message = {"type": command, **(params or {})}
    delivered = await _broadcast_to_electron_via_http(message)

    return {
        "success": True,
        "delivered": delivered,
        "command": command,
        "params": params,
        "note": (
            "delivered=false means Electron IPC is not reachable (app not running or no CDP port)"
            if not delivered
            else None
        ),
    }


async def handle_vibemind_agent_dispatch(
    task: str,
    agent: Optional[str] = None,
    context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Dispatch a task to a VibeMind agent via Minibook."""
    if not task:
        return {"success": False, "error": "task is required"}

    # Build Minibook task payload.
    payload: Dict[str, Any] = {
        "content": task,
        "metadata": context or {},
    }
    if agent:
        payload["content"] = f"@{agent} {task}"

    result = await _http_post(f"{_MINIBOOK_API}/api/tasks", payload, timeout=15)
    if result is None:
        # Fallback: route via process_intent.
        return await handle_vibemind_intent(task)

    return {
        "success": True,
        "source": "minibook",
        "agent": agent,
        "task": task,
        "result": result,
    }


async def handle_vibemind_agents_list() -> Dict[str, Any]:
    """List VibeMind's 15 domain spaces and their agent status."""
    # Known spaces from CLAUDE.md.
    spaces = [
        {"name": "Bubbles", "stream": "events:tasks:bubbles", "prefix": "bubble.*"},
        {"name": "Ideas", "stream": "events:tasks:ideas", "prefix": "idea.*"},
        {"name": "Coding", "stream": "events:tasks:coding", "prefix": "code.*"},
        {"name": "Desktop", "stream": "events:tasks:desktop", "prefix": "desktop.*"},
        {"name": "Rowboat", "stream": "events:tasks:roarboot", "prefix": "roarboot.*"},
        {"name": "Research", "stream": "events:tasks:zeroclaw", "prefix": "research.*"},
        {"name": "Minibook", "stream": "events:tasks:minibook", "prefix": "minibook.*"},
        {"name": "Schedule", "stream": "events:tasks:schedule", "prefix": "schedule.*"},
        {"name": "N8n", "stream": "events:tasks:n8n", "prefix": "n8n.*"},
        {
            "name": "AgentFarm",
            "stream": "events:tasks:agentfarm",
            "prefix": "agentfarm.*",
        },
        {"name": "Video", "stream": "events:tasks:video", "prefix": "video.*"},
        {
            "name": "MiroFish",
            "stream": "events:tasks:mirofish_pred",
            "prefix": "mirofish.*",
        },
        {"name": "Flowzen", "stream": "via submodule", "prefix": "flowzen.*"},
        {"name": "Brain", "stream": "standalone (port 5000)", "prefix": "brain.*"},
    ]

    # Try to get live status from Minibook.
    minibook_status = await _http_get(f"{_MINIBOOK_API}/api/status", timeout=3)

    # Try Brain status.
    brain_status = await _http_get(f"{_BRAIN_API}/classify/stats", timeout=2)

    return {
        "success": True,
        "spaces": spaces,
        "space_count": len(spaces),
        "minibook": {
            "url": _MINIBOOK_API,
            "reachable": minibook_status is not None,
            "status": minibook_status,
        },
        "brain": {
            "url": _BRAIN_API,
            "reachable": brain_status is not None,
            "stats": brain_status,
        },
    }
