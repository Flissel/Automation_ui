"""MCP Bridge Router - Connects Automation_ui frontend with Moire MCP handlers.

Phase 0.2 cleanup: previously this router tried to import handlers from a
non-existent `mcp_tools/MoireTracker_v2/python/mcp_server_handoff.py`,
silently failed with ImportError, and returned 503 for every endpoint.

Now it imports directly from the in-tree
`backend/moire_agents/mcp_server_handoff.py`. Endpoints whose backend handler
is implemented are wired through. Endpoints whose handler is *not yet* in
mcp_server_handoff.py return 501 Not Implemented with a clear `next_step`
hint, instead of failing silently.

After Phase 1 of the MCP overhaul (file/system + doc tools), the 501 endpoints
will be re-pointed to the new handlers without changing this file's structure.
"""

import logging
import os
import sys
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# Make backend/moire_agents/ importable so we can pull handlers from
# mcp_server_handoff.py directly. The path mirrors what mcp_server_handoff.py
# itself does for its sibling-package imports. From this file
# (backend/app/routers/mcp_bridge.py) the moire_agents root is two levels up.
_MOIRE_AGENTS_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "moire_agents")
)
if os.path.isdir(_MOIRE_AGENTS_ROOT) and _MOIRE_AGENTS_ROOT not in sys.path:
    sys.path.insert(0, _MOIRE_AGENTS_ROOT)

router = APIRouter()


# ─── Request models ──────────────────────────────────────────────────────────


class ClickRequest(BaseModel):
    x: int
    y: int
    button: str = "left"


class TypeRequest(BaseModel):
    text: str
    interval: float = 0.0


class ShellRequest(BaseModel):
    command: str
    timeout: int = 30
    shell: str = "auto"


class FindElementRequest(BaseModel):
    text: Optional[str] = None
    element_type: Optional[str] = None
    near_text: Optional[str] = None


class ScrollRequest(BaseModel):
    direction: str = "down"
    amount: int = 3
    x: Optional[int] = None
    y: Optional[int] = None


class DocScanRequest(BaseModel):
    max_pages: int = 20
    scroll_amount: int = 800
    detect_structure: bool = True


class DocEditRequest(BaseModel):
    document_id: str
    page: int
    section_index: int
    new_text: str
    operation: str = "replace"


# ─── Handler resolution ──────────────────────────────────────────────────────

# Map endpoint name → (handler_callable, status). status is "ready" if the
# handler exists and "missing" if Phase 1 still needs to add it.
_handler_registry: Dict[str, Dict[str, Any]] = {}
_load_error: Optional[str] = None


def _load_handlers() -> None:
    """Import what we can from mcp_server_handoff and record availability."""
    global _load_error

    try:
        import mcp_server_handoff as mcp  # type: ignore
    except Exception as e:  # pragma: no cover - explicit error capture
        _load_error = f"failed to import mcp_server_handoff: {e}"
        logger.error(_load_error)
        return

    # Endpoints whose handler ALREADY exists in mcp_server_handoff.py.
    available = {
        "read_screen": getattr(mcp, "handle_read_screen", None),
        "scroll": getattr(mcp, "handle_scroll", None),
        # /click and /type go through the generic action handler with
        # action_type="click"/"type". The bridge wraps that translation.
        "_action": getattr(mcp, "handle_action", None),
        # /find-element delegates to the validation team via handle_validate.
        "_validate": getattr(mcp, "handle_validate", None),
    }

    for name, fn in available.items():
        if fn is not None:
            _handler_registry[name] = {"fn": fn, "status": "ready"}

    # Endpoints whose handler is planned for Phase 1 (file/system + doc tools).
    pending = {
        "shell": "handle_shell (Phase 1.3 file_system_tools.py)",
        "find_element": "handle_find_element (Phase 1.4 smart elements)",
        "scroll_to": "handle_scroll_to (Phase 1.4 smart elements)",
        "doc_scan": "handle_doc_scan (Phase 1.5 document_tools.py)",
        "doc_edit": "handle_doc_edit (Phase 1.5 document_tools.py)",
        "doc_apply": "handle_doc_apply (Phase 1.5 document_tools.py)",
        "doc_export": "handle_doc_export (Phase 1.5 document_tools.py)",
    }
    for name, hint in pending.items():
        # Prefer a real handler if one already exists; otherwise mark as missing.
        fn = getattr(mcp, f"handle_{name}", None)
        if fn is not None:
            _handler_registry[name] = {"fn": fn, "status": "ready"}
        else:
            _handler_registry[name] = {"fn": None, "status": "missing", "hint": hint}


_load_handlers()


def _resolve(name: str):
    entry = _handler_registry.get(name)
    if not entry:
        raise HTTPException(
            status_code=503,
            detail={"error": "MCP handlers not loaded", "load_error": _load_error},
        )
    if entry["status"] != "ready":
        raise HTTPException(
            status_code=501,
            detail={
                "error": f"Handler '{name}' not implemented yet",
                "next_step": entry.get("hint", ""),
            },
        )
    return entry["fn"]


# ─── Desktop automation endpoints ────────────────────────────────────────────


@router.post("/click")
async def mcp_click(req: ClickRequest):
    """Execute a click action via the generic handle_action handler."""
    fn = _resolve("_action")
    return await fn(action_type="click", params={"x": req.x, "y": req.y})


@router.post("/type")
async def mcp_type(req: TypeRequest):
    """Type text via the generic handle_action handler."""
    fn = _resolve("_action")
    return await fn(action_type="type", params={"text": req.text})


@router.post("/shell")
async def mcp_shell(req: ShellRequest):
    """Execute a shell command. Implemented by Phase 1.3."""
    fn = _resolve("shell")
    return await fn(command=req.command, timeout=req.timeout, shell=req.shell)


@router.post("/find-element")
async def mcp_find_element(req: FindElementRequest):
    """Find a UI element. Falls back to handle_validate until Phase 1.4 ships."""
    # Prefer dedicated handle_find_element when Phase 1.4 lands.
    if _handler_registry.get("find_element", {}).get("status") == "ready":
        fn = _handler_registry["find_element"]["fn"]
        return await fn(
            text=req.text,
            element_type=req.element_type,
            near_text=req.near_text,
        )
    # Fallback: use the validation team to locate the element by its text.
    validate = _resolve("_validate")
    target = req.text or req.near_text or ""
    if not target:
        raise HTTPException(status_code=400, detail="text or near_text is required")
    return await validate(target=target)


@router.post("/scroll")
async def mcp_scroll(req: ScrollRequest):
    """Scroll the mouse wheel."""
    fn = _resolve("scroll")
    return await fn(direction=req.direction, amount=req.amount, x=req.x, y=req.y)


@router.post("/scroll-to")
async def mcp_scroll_to(
    target: str,
    element_type: Optional[str] = None,
    then_click: bool = False,
):
    """Scroll until target element is found. Implemented by Phase 1.4."""
    fn = _resolve("scroll_to")
    return await fn(target=target, element_type=element_type, then_click=then_click)


@router.get("/read-screen")
async def mcp_read_screen():
    """Capture screenshot and read text via OCR."""
    fn = _resolve("read_screen")
    return await fn()


# ─── Document scanner endpoints ──────────────────────────────────────────────


@router.post("/doc/scan")
async def mcp_doc_scan(req: DocScanRequest):
    """Scan document and extract structured text. Implemented by Phase 1.5."""
    fn = _resolve("doc_scan")
    return await fn(
        max_pages=req.max_pages,
        scroll_amount=req.scroll_amount,
        detect_structure=req.detect_structure,
    )


@router.post("/doc/edit")
async def mcp_doc_edit(req: DocEditRequest):
    """Edit document section virtually. Implemented by Phase 1.5."""
    fn = _resolve("doc_edit")
    return await fn(
        document_id=req.document_id,
        page=req.page,
        section_index=req.section_index,
        new_text=req.new_text,
        operation=req.operation,
    )


@router.post("/doc/apply/{document_id}")
async def mcp_doc_apply(document_id: str, dry_run: bool = False):
    """Apply virtual edits to real document. Implemented by Phase 1.5."""
    fn = _resolve("doc_apply")
    return await fn(document_id=document_id, dry_run=dry_run)


@router.get("/doc/export/{document_id}")
async def mcp_doc_export(document_id: str, format: str = "json"):
    """Export document structure. Implemented by Phase 1.5."""
    fn = _resolve("doc_export")
    return await fn(document_id=document_id, format=format)


# ─── Health ──────────────────────────────────────────────────────────────────


@router.get("/health")
async def mcp_health():
    """Report which bridge endpoints are wired and which still need Phase 1."""
    if _load_error:
        return {
            "status": "degraded",
            "mcp_available": False,
            "error": _load_error,
            "mcp_path": _MOIRE_AGENTS_ROOT,
        }

    ready = sorted(
        name for name, e in _handler_registry.items() if e["status"] == "ready"
    )
    missing = {
        name: e.get("hint", "")
        for name, e in _handler_registry.items()
        if e["status"] != "ready"
    }
    return {
        "status": "healthy" if not missing else "partial",
        "mcp_available": True,
        "available_handlers": ready,
        "missing_handlers": missing,
        "mcp_path": _MOIRE_AGENTS_ROOT,
    }
