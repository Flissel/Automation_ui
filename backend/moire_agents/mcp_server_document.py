"""
document-mcp — VibeMind "deterministische Datei-Erzeugung"-MCP-Server.

Thin stdio entrypoint over the shared handler library ``mcp_server_handoff``.
Exposes the 7 document tools (xlsx/docx/csv create, xlsx/docx verify, excel
paste, window maximize) with DYNAMIC IN-TOOL APPROVAL baked into the write
tools.

Why dynamic approval (the core fix — see plans/pure-wishing-starlight.md):
    Previously the agent had to call handoff_approval_request itself BEFORE a
    write, then pick the right write tool — and it failed (gpt-5.5 hallucinated
    `shell_exec`, approval orchestration was fragile). Here approval is a
    cross-cutting concern handled INSIDE the write tool: the tool decides from
    the target path whether approval is needed (writes inside vibemind-os/skills/
    are trusted → no approval; anywhere else → request it) and invokes the
    approval primitive internally. The agent just calls
    xlsx_create_from_data(file_path, rows) — it cannot skip approval and cannot
    pick a wrong tool.

The approval primitive is imported directly from agents.handoff.clarify_notify
(standalone module: SQLite clarify.db + Telegram + the :8008 form server), so
no cross-server import is needed. handoff_approval_request BLOCKS while polling;
we run it via asyncio.to_thread so the stdio event loop stays responsive (an
improvement over the monolith, which called it synchronously).

Usage:  python mcp_server_document.py
"""

import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from mcp.server import Server  # noqa: E402
from mcp.server.stdio import stdio_server  # noqa: E402
from mcp.types import TextContent  # noqa: E402

import mcp_server_handoff as H  # noqa: E402
from agents.handoff.clarify_notify import handoff_approval_request  # noqa: E402

SERVER_NAME = "document"

# Trusted root: writes inside vibemind-os/skills/ are skill persistence
# (by-design, no approval). Mirror H._SKILL_LIB_ROOT so the boundary matches
# the monolith's own notion of the skills library.
_SKILLS_ROOT = os.path.normcase(os.path.abspath(H._SKILL_LIB_ROOT))


def _needs_approval(file_path: str) -> bool:
    """True unless the normalized target lives inside the skills/ library.

    Normalization mirrors _xlsx_create_from_data (expandvars+expanduser+abspath)
    so the path the guard checks equals the path that gets written.
    """
    if not file_path:
        return True
    p = os.path.normcase(os.path.abspath(
        os.path.expandvars(os.path.expanduser(file_path))))
    return not p.startswith(_SKILLS_ROOT)


# Fail-safe vs fail-open on approval timeout:
#   - If a dedicated approval bot is configured (APPROVAL_TELEGRAM_BOT_TOKEN),
#     the tap-to-approve works from anywhere, so an unanswered prompt should
#     fail SAFE (declined) — a missed/forged/injected trigger writes nothing.
#   - Without it, the only approval path is the LAN url button; failing safe
#     there would make every off-LAN desktop write hang->decline, so we stay
#     fail-OPEN (approved) as a documented transition state until the callback
#     bot is set up. See plans/pure-wishing-starlight.md (Stufe 2).
_HAS_APPROVAL_BOT = bool(
    os.environ.get("APPROVAL_TELEGRAM_BOT_TOKEN", "").strip()
)
_TIMEOUT_DEFAULT = "declined" if _HAS_APPROVAL_BOT else "approved"
_APPROVAL_TIMEOUT_S = 180 if _HAS_APPROVAL_BOT else 90


async def _maybe_approve(tool_name: str, file_path: str):
    """Return None if cleared to proceed, else an 'aborted' result dict."""
    if not _needs_approval(file_path):
        return None
    decision = await asyncio.to_thread(
        handoff_approval_request,
        action=f"{tool_name}: write {os.path.basename(file_path) or file_path}",
        reason=f"Schreibe Datei nach {file_path}",
        timeout_seconds=_APPROVAL_TIMEOUT_S,
        default_on_timeout=_TIMEOUT_DEFAULT,
    )
    if decision.get("decision") != "approved":
        return {"success": False, "aborted": True,
                "reason": "user declined approval", "decision": decision}
    return None


server = Server(SERVER_NAME)


@server.list_tools()
async def list_tools():
    names = {"xlsx_create_from_data", "docx_create_from_data",
             "csv_create_from_data", "excel_verify_file", "docx_verify_file",
             "excel_paste_table", "window_maximize"}
    return [t for t in H.TOOLS if t.name in names]


@server.call_tool()
async def call_tool(name: str, arguments: dict):
    a = arguments or {}
    try:
        # --- write tools: guarded by dynamic approval ---
        if name == "xlsx_create_from_data":
            aborted = await _maybe_approve(name, a.get("file_path", ""))
            result = aborted or H._xlsx_create_from_data(
                file_path=a.get("file_path", ""),
                rows=a.get("rows"),
                sheet_name=a.get("sheet_name"),
                bold_rows=a.get("bold_rows"),
                auto_width=a.get("auto_width", True),
                overwrite=a.get("overwrite", True),
                sheets=a.get("sheets"),
                cell_styles=a.get("cell_styles"),
                freeze_pane=a.get("freeze_pane"),
            )
        elif name == "docx_create_from_data":
            aborted = await _maybe_approve(name, a.get("file_path", ""))
            result = aborted or H._docx_create_from_data(
                file_path=a.get("file_path", ""),
                blocks=a.get("blocks") or [],
                overwrite=a.get("overwrite", True),
            )
        elif name == "csv_create_from_data":
            aborted = await _maybe_approve(name, a.get("file_path", ""))
            result = aborted or H._csv_create_from_data(
                file_path=a.get("file_path", ""),
                rows=a.get("rows") or [],
                delimiter=a.get("delimiter", ","),
                encoding=a.get("encoding", "utf-8-sig"),
                overwrite=a.get("overwrite", True),
            )
        elif name == "excel_paste_table":
            # Mutates the focused workbook (visible, no file_path) -> always
            # request approval (treated as an out-of-skills write).
            aborted = await _maybe_approve(name, "excel_paste_table")
            result = aborted or H._excel_paste_table(
                rows=a.get("rows") or [],
                start_cell=a.get("start_cell"),
            )
        # --- read-only / benign tools: no approval ---
        elif name == "excel_verify_file":
            result = H._excel_verify_file(
                file_path=a.get("file_path", ""),
                expected_cells=a.get("expected_cells"),
                min_rows=a.get("min_rows"),
                must_contain_text=a.get("must_contain_text"),
            )
        elif name == "docx_verify_file":
            result = H._docx_verify_file(
                file_path=a.get("file_path", ""),
                expected_substrings=a.get("expected_substrings"),
                min_paragraphs=a.get("min_paragraphs"),
                min_tables=a.get("min_tables"),
                expected_table_cells=a.get("expected_table_cells"),
            )
        elif name == "window_maximize":
            result = H._window_maximize(
                title_substring=a.get("title_substring", ""))
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
