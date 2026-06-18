"""
messenger-mcp — VibeMind "Kanäle + Human-in-the-loop"-MCP-Server.

Thin stdio entrypoint over the shared handler library ``mcp_server_handoff``.
Exposes the 11 messaging / human-interaction tools (Clawdbot send + contacts +
status + browser helpers + report, and the clarify/approval primitives) PLUS a
new unified ``send_to_channel`` tool that routes over the same Clawdbot bridge
(:8007) to any connected platform.

The clarify/approval primitives live in ``agents.handoff.clarify_notify`` — a
standalone module (SQLite clarify.db + Telegram Bot API + the :8008 form
server). document-mcp imports the SAME module directly for its in-tool
approval, so approval correctness is independent of which server process runs.

Part of the 4-way split (see plans/pure-wishing-starlight.md).

Usage:  python mcp_server_messenger.py
"""

import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from mcp.server import Server  # noqa: E402
from mcp.server.stdio import stdio_server  # noqa: E402
from mcp.types import Tool, TextContent  # noqa: E402

import mcp_server_handoff as H  # noqa: E402
# Standalone, Server-independent primitives (same module document-mcp uses).
from agents.handoff.clarify_notify import (  # noqa: E402
    handoff_clarify as _clarify,
    handoff_clarify_check as _clarify_check,
    handoff_approval_request as _approve,
)

SERVER_NAME = "messenger"

_PLATFORMS = ["whatsapp", "telegram", "discord", "signal", "imessage", "email"]

# Async Clawdbot handlers (mirror call_tool signatures).
_ASYNC = {
    "clawdbot_send_message": lambda a: H.handle_clawdbot_send_message(
        recipient=a.get("recipient", ""), message=a.get("message", ""),
        platform=a.get("platform")),
    "clawdbot_get_contacts": lambda a: H.handle_clawdbot_get_contacts(
        query=a.get("query"), limit=a.get("limit", 10)),
    "clawdbot_get_status": lambda a: H.handle_clawdbot_get_status(),
    "clawdbot_get_variables": lambda a: H.handle_clawdbot_get_variables(
        include_templates=a.get("include_templates", True)),
    "clawdbot_browser_open": lambda a: H.handle_clawdbot_browser_open(
        url=a.get("url", "")),
    "clawdbot_browser_search": lambda a: H.handle_clawdbot_browser_search(
        query=a.get("query", "")),
    "clawdbot_browser_read_page": lambda a: H.handle_clawdbot_browser_read_page(),
    "clawdbot_report_findings": lambda a: H.handle_clawdbot_report_findings(
        findings=a.get("findings", ""), recipient=a.get("recipient"),
        platform=a.get("platform"), title=a.get("title")),
    # send_to_channel: unified front-door over the Clawdbot bridge. `channel`
    # is the recipient/contact name; platform optional (auto-detect if absent).
    "send_to_channel": lambda a: H.handle_clawdbot_send_message(
        recipient=a.get("channel", a.get("recipient", "")),
        message=a.get("message", ""), platform=a.get("platform")),
}

# Synchronous human-in-the-loop primitives.
_SYNC = {
    "handoff_clarify": lambda a: _clarify(
        question=a.get("question", ""), options=a.get("options"),
        form_schema=a.get("form_schema")),
    "handoff_clarify_check": lambda a: _clarify_check(
        clarify_id=a.get("clarify_id", "")),
    "handoff_approval_request": lambda a: _approve(
        action=a.get("action", ""), reason=a.get("reason"),
        timeout_seconds=int(a.get("timeout_seconds", 60)),
        default_on_timeout=a.get("default_on_timeout", "approved")),
}

# Reuse existing schemas for the 11 known tools; define send_to_channel inline.
_KNOWN = (set(_ASYNC) | set(_SYNC)) - {"send_to_channel"}
TOOLS = [t for t in H.TOOLS if t.name in _KNOWN]
TOOLS.append(Tool(
    name="send_to_channel",
    description=(
        "Send a message to a contact/channel on any connected platform "
        "(WhatsApp, Telegram, Discord, Signal, iMessage, email) via the "
        "Clawdbot bridge. Unified front-door — prefer this over the raw "
        "clawdbot_send_message for outbound notifications."
    ),
    inputSchema={
        "type": "object",
        "properties": {
            "channel": {"type": "string",
                        "description": "Contact/channel name (recipient)."},
            "message": {"type": "string", "description": "Message text."},
            "platform": {"type": "string", "enum": _PLATFORMS,
                         "description": "Optional; auto-detected if omitted."},
        },
        "required": ["channel", "message"],
    },
))

server = Server(SERVER_NAME)


@server.list_tools()
async def list_tools():
    return TOOLS


@server.call_tool()
async def call_tool(name: str, arguments: dict):
    a = arguments or {}
    try:
        if name in _ASYNC:
            result = await _ASYNC[name](a)
        elif name in _SYNC:
            result = _SYNC[name](a)
        else:
            result = {"error": f"Unknown tool: {name}"}
        return [TextContent(type="text", text=json.dumps(result, indent=2))]
    except Exception as e:
        return [TextContent(type="text", text=json.dumps({"error": str(e)}))]


async def main():
    async with stdio_server() as (read, write):
        await server.run(read, write, server.create_initialization_options())


if __name__ == "__main__":
    asyncio.run(main())
