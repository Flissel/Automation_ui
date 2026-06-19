"""
data-mcp — VibeMind "Daten-Interpretation"-MCP-Server.

Thin stdio entrypoint over the shared handler library ``mcp_server_handoff``.
Exposes the 8 knowledge/data-interpretation tools (Rowboat + Roarboot + the
LLM file-quality evaluator) and nothing else, so an agent that only needs to
read/query/evaluate knowledge isn't handed desktop-automation or messaging
tools it could misuse.

Part of the 4-way split of the former monolithic "desktop-automation" server
(see plans/pure-wishing-starlight.md): data / document / perception / messenger.

Importing ``mcp_server_handoff`` runs its path-bootstrap (sys.path inserts for
``agents.*`` + voice/python) but starts NO server — the monolith guards
``stdio_server()`` behind ``if __name__ == "__main__":``. We reuse its TOOLS
schemas (filtered by name) and its handler functions, so there is one source
of truth for both schema and behavior.

Usage:  python mcp_server_data.py
"""

import asyncio
import json
import os
import sys

# The monolith lives next to this file; ensure its directory is importable
# even if Python's default "script dir on sys.path" ever doesn't apply.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from mcp.server import Server  # noqa: E402
from mcp.server.stdio import stdio_server  # noqa: E402
from mcp.types import TextContent  # noqa: E402

import mcp_server_handoff as H  # noqa: E402  (import runs path-bootstrap, no server)

SERVER_NAME = "data"

# Tool name -> callable(arguments) -> result dict. Mirrors the exact handler
# signatures from mcp_server_handoff.call_tool (lines ~4073-4120). All data
# handlers are synchronous.
_DISPATCH = {
    "rowboat_upload": lambda a: H._rowboat_upload(
        file_path=a.get("file_path", ""),
        title=a.get("title"),
        tags=a.get("tags"),
    ),
    "rowboat_chat": lambda a: H._rowboat_chat(
        message=a.get("message", ""),
        context=a.get("context", "default"),
        conversation_id=a.get("conversation_id"),
        timeout=int(a.get("timeout", 120)),
    ),
    "rowboat_search": lambda a: H._rowboat_search(
        query=a.get("query", ""),
        folder=a.get("folder"),
        limit=int(a.get("limit", 20)),
    ),
    "rowboat_list_folders": lambda a: H._rowboat_list_folders(
        limit=int(a.get("limit", 50)),
    ),
    "roarboot_ask": lambda a: H._roarboot_ask(
        question=a.get("question", ""),
        folder=a.get("folder"),
        max_files=int(a.get("max_files", 10)),
        max_chars_per_file=int(a.get("max_chars_per_file", 4000)),
        model=a.get("model", "gpt-4o-mini"),
        root=a.get("root"),
    ),
    "roarboot_read_knowledge": lambda a: H._roarboot_read_knowledge(
        folder=a.get("folder", ""),
        query=a.get("query"),
        limit=int(a.get("limit", 20)),
        name_pattern=a.get("name_pattern"),
        root=a.get("root"),
    ),
    "roarboot_list_folders": lambda a: H._roarboot_list_folders(
        root=a.get("root"),
    ),
    "file_evaluate": lambda a: H._file_evaluate(
        file_path=a.get("file_path", ""),
        expected_intent=a.get("expected_intent", ""),
        source_data_description=a.get("source_data_description"),
        criteria=a.get("criteria"),
        model=a.get("model", "gpt-4o-mini"),
    ),
}

TOOLS = [t for t in H.TOOLS if t.name in _DISPATCH]

server = Server(SERVER_NAME)


@server.list_tools()
async def list_tools():
    return TOOLS


@server.call_tool()
async def call_tool(name: str, arguments: dict):
    try:
        fn = _DISPATCH.get(name)
        if fn is None:
            result = {"error": f"Unknown tool: {name}"}
        else:
            result = fn(arguments or {})
        return [TextContent(type="text", text=json.dumps(result, indent=2))]
    except Exception as e:  # mirror monolith's error envelope
        return [TextContent(type="text", text=json.dumps({"error": str(e)}))]


async def main():
    async with stdio_server() as (read, write):
        await server.run(read, write, server.create_initialization_options())


if __name__ == "__main__":
    asyncio.run(main())
