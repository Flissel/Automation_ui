"""User interaction tools for the Handoff MCP server.

Phase 1.2: implements the 3 user-interaction tools that the documentation
promised but the server never registered:

  - handoff_notify         — fire-and-forget notification to the Vibemind UI
  - handoff_clarify        — ask the user a question, returns a clarify_id
  - handoff_clarify_check  — poll for the answer

The clarify state is held in a small SQLite table inside `data/clarify.db`
so the value survives MCP server restarts and is queryable from any process
(e.g. a Vibemind UI handler that POSTs the answer back via FastAPI).

Notification delivery uses two known transports:
  1. The Clawdbot gateway endpoint at http://localhost:18789/plugins/automation-ui/results
     (same path that handle_clawdbot_report_findings already uses)
  2. The Automation_ui FastAPI clawdbot router at /api/clawdbot/notify
Both fail-soft — if neither responds, the notification is still recorded in
SQLite under the clarify_id so the user can pick it up out-of-band.

Frontend integration is intentionally NOT enforced here. A Vibemind UI
handler that wants to support clarify just needs to POST
`{"clarify_id": "...", "answer": "..."}` to a backend route that calls
`record_clarify_answer(clarify_id, answer)`. Adding that route is a
follow-up task; today the answer can also be inserted directly via SQL.
"""

from __future__ import annotations

import asyncio
import json
import logging
import sqlite3
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# ─── SQLite store ────────────────────────────────────────────────────────────

_DB_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "clarify.db"
_DB_PATH.parent.mkdir(parents=True, exist_ok=True)

_SCHEMA = """
CREATE TABLE IF NOT EXISTS clarifies (
    id TEXT PRIMARY KEY,
    question TEXT NOT NULL,
    options_json TEXT,
    answer TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at REAL NOT NULL,
    answered_at REAL,
    timeout_at REAL,
    metadata_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_clarifies_status ON clarifies(status);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    title TEXT,
    message TEXT NOT NULL,
    level TEXT NOT NULL DEFAULT 'info',
    created_at REAL NOT NULL,
    delivered_via TEXT
);
"""


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(str(_DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.executescript(_SCHEMA)
    return conn


def record_clarify_answer(clarify_id: str, answer: str) -> bool:
    """Out-of-band hook used by a future Vibemind UI handler.

    Updates a pending clarify with the user's answer. Returns True if a
    pending row was actually updated.
    """
    with _conn() as c:
        cur = c.execute(
            "UPDATE clarifies SET answer=?, status='answered', answered_at=? "
            "WHERE id=? AND status='pending'",
            (answer, time.time(), clarify_id),
        )
        return cur.rowcount > 0


# ─── Notification transport ──────────────────────────────────────────────────

_VIBEMIND_GATEWAY_URL = "http://localhost:18789/plugins/automation-ui/results"
_CLAWDBOT_NOTIFY_URL = "http://localhost:8007/api/clawdbot/notify"


async def _deliver_notification(
    title: Optional[str],
    message: str,
    level: str,
    metadata: Optional[Dict[str, Any]],
) -> List[str]:
    """Try every transport. Returns the list of transports that succeeded."""
    delivered: List[str] = []

    payload = {
        "title": title,
        "message": message,
        "level": level,
        "metadata": metadata or {},
        "source": "handoff_notify",
    }

    try:
        import httpx  # type: ignore

        async with httpx.AsyncClient(timeout=2.5) as client:
            try:
                resp = await client.post(_VIBEMIND_GATEWAY_URL, json=payload)
                if resp.status_code == 200:
                    delivered.append("vibemind_gateway")
            except Exception as e:
                logger.debug(f"vibemind_gateway delivery failed: {e}")

            try:
                resp = await client.post(
                    _CLAWDBOT_NOTIFY_URL,
                    params={
                        "user_id": "mcp_agent",
                        "platform": "api",
                        "message": (f"{title}\n{message}" if title else message),
                        "notification_type": level,
                    },
                )
                if resp.status_code == 200:
                    delivered.append("clawdbot_notify")
            except Exception as e:
                logger.debug(f"clawdbot_notify delivery failed: {e}")
    except ImportError:
        logger.debug("httpx not installed; notifications recorded only")

    return delivered


# ─── Tool implementations ────────────────────────────────────────────────────


async def handle_notify(
    message: str,
    title: Optional[str] = None,
    level: str = "info",  # info | warning | error | success
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Fire-and-forget notification. Always recorded; transports best-effort."""
    if not message:
        return {"success": False, "error": "message is required"}
    if level not in {"info", "warning", "error", "success"}:
        level = "info"

    notif_id = f"notif_{uuid.uuid4().hex[:12]}"
    now = time.time()

    with _conn() as c:
        c.execute(
            "INSERT INTO notifications (id, title, message, level, created_at, delivered_via) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (notif_id, title, message, level, now, None),
        )

    delivered = await _deliver_notification(title, message, level, metadata)

    if delivered:
        with _conn() as c:
            c.execute(
                "UPDATE notifications SET delivered_via=? WHERE id=?",
                (",".join(delivered), notif_id),
            )

    return {
        "success": True,
        "notification_id": notif_id,
        "delivered_via": delivered,
        "delivered": bool(delivered),
        "level": level,
    }


async def handle_clarify(
    question: str,
    options: Optional[List[str]] = None,
    timeout_seconds: Optional[int] = 300,
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Ask the user a question and return immediately with a clarify_id.

    The actual answer is not blocked on — call handle_clarify_check(id) to
    poll. The Vibemind UI is responsible for surfacing the question and
    POSTing the answer back via record_clarify_answer().
    """
    if not question:
        return {"success": False, "error": "question is required"}

    clarify_id = f"clarify_{uuid.uuid4().hex[:12]}"
    now = time.time()
    timeout_at = now + timeout_seconds if timeout_seconds else None

    with _conn() as c:
        c.execute(
            "INSERT INTO clarifies (id, question, options_json, status, created_at, timeout_at, metadata_json) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                clarify_id,
                question,
                json.dumps(options) if options else None,
                "pending",
                now,
                timeout_at,
                json.dumps(metadata) if metadata else None,
            ),
        )

    # Pipe the question through handoff_notify so it actually reaches the UI.
    notify_msg = f"[Clarify {clarify_id}] {question}"
    if options:
        notify_msg += f"\nOptions: {', '.join(options)}"
    await _deliver_notification(
        title="Clarify needed",
        message=notify_msg,
        level="info",
        metadata={"clarify_id": clarify_id, "options": options or []},
    )

    return {
        "success": True,
        "clarify_id": clarify_id,
        "status": "pending",
        "question": question,
        "options": options or [],
        "timeout_at": timeout_at,
    }


async def handle_clarify_check(clarify_id: str) -> Dict[str, Any]:
    """Look up a clarify by id. Returns its current status."""
    if not clarify_id:
        return {"success": False, "error": "clarify_id is required"}

    with _conn() as c:
        row = c.execute("SELECT * FROM clarifies WHERE id=?", (clarify_id,)).fetchone()

    if not row:
        return {"success": False, "error": f"unknown clarify_id: {clarify_id}"}

    # Auto-expire if past timeout.
    status = row["status"]
    if status == "pending" and row["timeout_at"] and time.time() > row["timeout_at"]:
        with _conn() as c:
            c.execute("UPDATE clarifies SET status='timeout' WHERE id=?", (clarify_id,))
        status = "timeout"

    return {
        "success": True,
        "clarify_id": clarify_id,
        "status": status,
        "question": row["question"],
        "options": json.loads(row["options_json"]) if row["options_json"] else [],
        "answer": row["answer"],
        "created_at": row["created_at"],
        "answered_at": row["answered_at"],
        "timeout_at": row["timeout_at"],
    }


# ─── Phase: 4-way-split public API (sync façade) ─────────────────────────────
# The split MCP entrypoints (messenger-mcp, document-mcp) import three names
# from this module by their PUBLIC, sync, blocking contract:
#     handoff_clarify, handoff_clarify_check, handoff_approval_request
# The underlying implementations above are async (handle_clarify/_check). These
# thin façades give the entrypoints the exact name + signature they expect and
# run the coroutine on a private loop so they stay callable from a sync dispatch
# dict without an already-running event loop. `handoff_approval_request` is the
# one genuinely new primitive: a blocking yes/no gate built on the same SQLite
# clarify store (a clarify with options ["Approve","Decline"], polled to a
# decision), so approval correctness shares one source of truth with clarify.


def _run_coro(coro):
    """Run a coroutine to completion from sync code on a private loop.

    The split entrypoints call these from a `_SYNC` dispatch dict — i.e. NOT
    from inside the stdio event loop's running coroutine, so a fresh loop is
    safe and avoids 're-entrant loop' errors.
    """
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


def handoff_clarify(
    question: str,
    options: Optional[List[str]] = None,
    form_schema: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Sync façade over handle_clarify for the split entrypoints.

    `form_schema` is accepted for entrypoint-signature compatibility and folded
    into metadata (the async impl has no dedicated form_schema param).
    """
    meta = {"form_schema": form_schema} if form_schema else None
    return _run_coro(handle_clarify(question=question, options=options, metadata=meta))


def handoff_clarify_check(clarify_id: str) -> Dict[str, Any]:
    """Sync façade over handle_clarify_check."""
    return _run_coro(handle_clarify_check(clarify_id=clarify_id))


def handoff_approval_request(
    action: str,
    reason: Optional[str] = None,
    timeout_seconds: int = 60,
    default_on_timeout: str = "approved",
) -> Dict[str, Any]:
    """Blocking human-in-the-loop approval gate (new primitive for the split).

    Files an Approve/Decline clarify, surfaces it via the same notification
    transports, then polls clarify.db until answered or timed out. Returns
    ``{"decision": "approved"|"declined", ...}``. On timeout it falls back to
    ``default_on_timeout`` (fail-open "approved" during the LAN/transition
    phase; document-mcp flips this to "declined" once an approval bot exists).

    The answer is written out-of-band into clarify.db (status='answered',
    answer carries the choice) by record_clarify_answer() — e.g. the FastAPI
    clarify form route or the Telegram callback poller. We read the same row,
    so HTTP click and MCP poll agree without a shared process.
    """
    if not action:
        return {"success": False, "error": "action is required", "decision": "declined"}

    question = f"Approve: {action}" + (f"\nReason: {reason}" if reason else "")
    started = _run_coro(
        handle_clarify(
            question=question,
            options=["Approve", "Decline"],
            timeout_seconds=int(timeout_seconds) if timeout_seconds else None,
            metadata={"kind": "approval", "action": action, "reason": reason},
        )
    )
    if not started.get("success"):
        return {**started, "decision": "declined"}

    clarify_id = started["clarify_id"]
    deadline = time.time() + (int(timeout_seconds) if timeout_seconds else 60)

    # Poll the shared store. _needs the answer to encode the choice; we accept
    # either a raw "Approve"/"Decline" string or a JSON {"_choice": "..."} blob
    # (the Telegram callback poller writes the latter — see split memory).
    while time.time() < deadline:
        checked = _run_coro(handle_clarify_check(clarify_id))
        status = checked.get("status")
        if status == "answered":
            raw = (checked.get("answer") or "").strip()
            choice = raw
            if raw.startswith("{"):
                try:
                    choice = (json.loads(raw) or {}).get("_choice", raw)
                except Exception:
                    choice = raw
            approved = str(choice).strip().lower().startswith("approv")
            return {
                "success": True,
                "decision": "approved" if approved else "declined",
                "clarify_id": clarify_id,
                "answer": choice,
            }
        if status in ("timeout", "expired"):
            break
        time.sleep(1.5)

    # Timed out (or auto-expired) → fail-open / fail-safe per caller policy.
    decision = "approved" if str(default_on_timeout).lower().startswith("approv") else "declined"
    return {
        "success": True,
        "decision": decision,
        "clarify_id": clarify_id,
        "timed_out": True,
        "default_on_timeout": default_on_timeout,
    }
