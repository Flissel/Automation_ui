"""
perception-mcp — VibeMind "Wahrnehmung / Desktop-Automation"-MCP-Server.

Thin stdio entrypoint over the shared handler library ``mcp_server_handoff``.
Exposes the 19 perception/automation tools: the handoff plan/execute/validate
pipeline, direct UI actions, screen reading, vision analysis, app lifecycle,
the adaptive-skill library (search/list/save) and the Claude-CLI bridge.

This is the slimmed remainder of the former monolithic "desktop-automation"
server after data / document / messenger were split out
(see plans/pure-wishing-starlight.md). It is the only one of the four that
needs the heavy lazy singletons (planning/validation teams, vision agent,
Claude-CLI wrapper, skill indexer) and DPI awareness — both are set up by
importing ``mcp_server_handoff`` (its module head opts into Per-Monitor DPI
awareness and the singletons stay lazy until first use).

Usage:  python mcp_server_perception.py
"""

import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from mcp.server import Server  # noqa: E402
from mcp.server.stdio import stdio_server  # noqa: E402
from mcp.types import TextContent  # noqa: E402

import mcp_server_handoff as H  # noqa: E402  (runs DPI + path bootstrap, no server)

SERVER_NAME = "perception"

# Async handlers: each entry is an async callable(arguments) -> result.
# Signatures mirror mcp_server_handoff.call_tool exactly.
_ASYNC = {
    "handoff_plan": lambda a: H.handle_plan(
        goal=a.get("goal", ""), context=a.get("context")),
    "handoff_execute": lambda a: H.handle_execute(
        plan=a.get("plan", [])),
    "handoff_validate": lambda a: H.handle_validate(
        target=a.get("target", ""), expected_state=a.get("expected_state")),
    "handoff_action": lambda a: H.handle_action(
        action_type=a.get("action_type", ""),
        params=(a.get("params") or {k: v for k, v in a.items() if k != "action_type"})),
    "handoff_status": lambda a: H.handle_status(),
    "handoff_read_screen": lambda a: H.handle_read_screen(
        region=a.get("region"), monitor_id=a.get("monitor_id", 0)),
    "handoff_get_focus": lambda a: H.handle_get_focus(),
    "handoff_scroll": lambda a: H.handle_scroll(
        direction=a.get("direction", "down"), amount=a.get("amount", 3),
        x=a.get("x"), y=a.get("y")),
    "vision_analyze": lambda a: H.handle_vision_analyze(
        prompt=a.get("prompt", ""), mode=a.get("mode", "custom"),
        json_output=a.get("json_output", True), monitor_id=a.get("monitor_id", 0)),
    "claude_cli_run": lambda a: H.handle_claude_run(
        prompt=a.get("prompt", ""), skill=a.get("skill"),
        output_format=a.get("output_format", "text")),
    "claude_cli_skill": lambda a: H.handle_claude_skill(
        skill_name=a.get("skill_name", ""), inputs=a.get("inputs", {}),
        ui_context=a.get("ui_context")),
    "claude_cli_status": lambda a: H.handle_claude_status(),
}

# Synchronous handlers.
_SYNC = {
    "app_launch": lambda a: H._app_launch(
        app_name=a.get("app", ""), args=a.get("args")),
    "app_focus": lambda a: H._app_focus(
        title_substring=a.get("title_substring", "")),
    "app_list_running": lambda a: H._app_list_running(),
    "app_launch_or_focus": lambda a: H._app_launch_or_focus(
        app_name=a.get("app", ""), title_hint=a.get("title_hint"),
        args=a.get("args")),
    "skill_search": lambda a: H._skill_search(
        query=a.get("query", ""), agent=a.get("agent"),
        limit=int(a.get("limit", 5))),
    "skill_list": lambda a: H._skill_list(app=a.get("app")),
    "skill_save_and_index": lambda a: H._skill_save_and_index(
        app=a.get("app", ""), skill_name=a.get("skill_name", ""),
        frontmatter=a.get("frontmatter") or {}, body=a.get("body", "")),
}

_NAMES = set(_ASYNC) | set(_SYNC)
TOOLS = [t for t in H.TOOLS if t.name in _NAMES]

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
