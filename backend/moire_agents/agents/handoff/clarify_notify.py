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
