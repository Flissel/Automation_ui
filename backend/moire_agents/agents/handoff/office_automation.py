"""Direct Office automation via COM for the Handoff MCP server.

Replaces fragile keyboard simulation (Clipboard → Ctrl+V → Tab → hope)
with direct win32com.client calls. Zero race conditions, zero character
loss, guaranteed correct cell placement.

Tools
=====

  - handoff_excel_fill    — write cells, formulas, formatting in one call
  - handoff_word_write    — write paragraphs with headings, bold, italic
  - handoff_office_save   — save the active Office document
  - handoff_office_read   — read cell values / document text back

Architecture
============

Uses late-bound COM (win32com.client.Dispatch) so no typelib generation
is needed. Each call gets (or creates) the running Office instance via
GetActiveObject / Dispatch, operates on the active document/workbook,
and returns a structured result.

All operations are synchronous from COM's perspective but wrapped in
asyncio.to_thread so the MCP event loop stays responsive.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


# ─── COM helpers ─────────────────────────────────────────────────────────────


def _get_excel():
    """Get running Excel instance or None."""
    try:
        import win32com.client  # type: ignore

        return win32com.client.GetActiveObject("Excel.Application")
    except Exception:
        try:
            import win32com.client

            return win32com.client.Dispatch("Excel.Application")
        except Exception as e:
            logger.debug(f"Excel COM unavailable: {e}")
            return None


def _get_word():
    """Get running Word instance or None."""
    try:
        import win32com.client  # type: ignore

        return win32com.client.GetActiveObject("Word.Application")
    except Exception:
        try:
            import win32com.client

            return win32com.client.Dispatch("Word.Application")
        except Exception as e:
            logger.debug(f"Word COM unavailable: {e}")
            return None


# ─── Excel ───────────────────────────────────────────────────────────────────


def _excel_fill_sync(
    cells: List[Dict[str, Any]],
    auto_fit: bool = True,
    sheet_name: Optional[str] = None,
) -> Dict[str, Any]:
    """Synchronous Excel fill via COM. Called in a thread."""
    xl = _get_excel()
    if xl is None:
        return {"success": False, "error": "Excel not running"}

    try:
        wb = xl.ActiveWorkbook
        if wb is None:
            return {"success": False, "error": "No active workbook"}

        if sheet_name:
            try:
                ws = wb.Sheets(sheet_name)
            except Exception:
                return {"success": False, "error": f"Sheet '{sheet_name}' not found"}
        else:
            ws = wb.ActiveSheet

        filled = 0
        for cell_spec in cells:
            ref = cell_spec.get("ref")  # e.g. "A1", "B2:D2"
            if not ref:
                continue

            rng = ws.Range(ref)

            # Value or formula.
            if "formula" in cell_spec:
                # FormulaLocal accepts localized function names (e.g. SUMME
                # for German Excel). Falls back to Formula (English names)
                # if FormulaLocal is not available.
                try:
                    rng.FormulaLocal = cell_spec["formula"]
                except Exception:
                    rng.Formula = cell_spec["formula"]
            elif "value" in cell_spec:
                rng.Value = cell_spec["value"]

            # Formatting.
            if cell_spec.get("bold") is not None:
                rng.Font.Bold = bool(cell_spec["bold"])
            if cell_spec.get("italic") is not None:
                rng.Font.Italic = bool(cell_spec["italic"])
            if cell_spec.get("font_size"):
                rng.Font.Size = int(cell_spec["font_size"])
            if cell_spec.get("font_color"):
                # Expect RGB int or hex string.
                color = cell_spec["font_color"]
                if isinstance(color, str) and color.startswith("#"):
                    r = int(color[1:3], 16)
                    g = int(color[3:5], 16)
                    b = int(color[5:7], 16)
                    color = r + (g << 8) + (b << 16)
                rng.Font.Color = int(color)
            if cell_spec.get("bg_color"):
                color = cell_spec["bg_color"]
                if isinstance(color, str) and color.startswith("#"):
                    r = int(color[1:3], 16)
                    g = int(color[3:5], 16)
                    b = int(color[5:7], 16)
                    color = r + (g << 8) + (b << 16)
                rng.Interior.Color = int(color)
            if cell_spec.get("number_format"):
                rng.NumberFormat = cell_spec["number_format"]
            if cell_spec.get("align"):
                align_map = {
                    "left": -4131,  # xlLeft
                    "center": -4108,  # xlCenter
                    "right": -4152,  # xlRight
                }
                rng.HorizontalAlignment = align_map.get(cell_spec["align"], -4131)
            if cell_spec.get("border"):
                # Simple all-borders.
                for edge in range(7, 13):  # xlEdgeLeft..xlInsideHorizontal
                    try:
                        rng.Borders(edge).LineStyle = 1  # xlContinuous
                    except Exception:
                        pass

            filled += 1

        # Auto-fit columns.
        if auto_fit:
            ws.UsedRange.Columns.AutoFit()

        return {
            "success": True,
            "filled": filled,
            "sheet": ws.Name,
            "workbook": wb.Name,
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


async def handle_excel_fill(
    cells: List[Dict[str, Any]],
    auto_fit: bool = True,
    sheet_name: Optional[str] = None,
) -> Dict[str, Any]:
    """Fill Excel cells directly via COM. Each cell spec:

    {
      "ref": "A1",              # required — cell reference
      "value": "Phase",         # text/number value
      "formula": "=SUMME(...)", # OR a formula (mutually exclusive with value)
      "bold": true,             # optional formatting
      "italic": true,
      "font_size": 14,
      "font_color": "#FF0000",
      "bg_color": "#4472C4",
      "number_format": "#,##0",
      "align": "center",
      "border": true
    }

    One call replaces 60+ fragile keyboard actions. Zero race conditions.
    """
    if not cells:
        return {"success": False, "error": "cells list is empty"}
    return await asyncio.to_thread(_excel_fill_sync, cells, auto_fit, sheet_name)


def _excel_read_sync(
    range_ref: str,
    sheet_name: Optional[str] = None,
) -> Dict[str, Any]:
    """Read Excel cell values back."""
    xl = _get_excel()
    if xl is None:
        return {"success": False, "error": "Excel not running"}
    try:
        wb = xl.ActiveWorkbook
        if wb is None:
            return {"success": False, "error": "No active workbook"}
        ws = wb.Sheets(sheet_name) if sheet_name else wb.ActiveSheet
        rng = ws.Range(range_ref)
        val = rng.Value
        # Convert COM tuples to lists for JSON.
        if isinstance(val, tuple):
            val = [list(row) if isinstance(row, tuple) else row for row in val]
        return {
            "success": True,
            "ref": range_ref,
            "value": val,
            "sheet": ws.Name,
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


async def handle_excel_read(
    range_ref: str,
    sheet_name: Optional[str] = None,
) -> Dict[str, Any]:
    """Read cell values from Excel. range_ref can be 'A1' or 'A1:E8'."""
    return await asyncio.to_thread(_excel_read_sync, range_ref, sheet_name)


# ─── Word ────────────────────────────────────────────────────────────────────


def _word_write_sync(
    paragraphs: List[Dict[str, Any]],
    clear_first: bool = False,
) -> Dict[str, Any]:
    """Synchronous Word write via COM."""
    wd = _get_word()
    if wd is None:
        return {"success": False, "error": "Word not running"}

    try:
        doc = wd.ActiveDocument
        if doc is None:
            return {"success": False, "error": "No active document"}

        if clear_first:
            doc.Content.Delete()

        written = 0
        for para_spec in paragraphs:
            text = para_spec.get("text", "")
            style = para_spec.get("style")  # e.g. "Heading 1", "Normal"
            bold = para_spec.get("bold")
            italic = para_spec.get("italic")
            align = para_spec.get("align")  # "left", "center", "right"
            font_size = para_spec.get("font_size")

            # Add a new paragraph at the end.
            rng = doc.Content
            rng.Collapse(0)  # wdCollapseEnd
            rng.InsertAfter(text + "\n")

            # Select just the inserted paragraph.
            # The last paragraph in the document is what we just added.
            new_para = doc.Paragraphs(doc.Paragraphs.Count)
            para_rng = new_para.Range

            if style:
                try:
                    para_rng.Style = style
                except Exception as e:
                    logger.debug(f"Style '{style}' failed: {e}")

            if bold is not None:
                para_rng.Font.Bold = bool(bold)
            if italic is not None:
                para_rng.Font.Italic = bool(italic)
            if font_size:
                para_rng.Font.Size = int(font_size)
            if align:
                align_map = {
                    "left": 0,  # wdAlignParagraphLeft
                    "center": 1,  # wdAlignParagraphCenter
                    "right": 2,  # wdAlignParagraphRight
                }
                new_para.Alignment = align_map.get(align, 0)

            written += 1

        return {
            "success": True,
            "written": written,
            "document": doc.Name,
            "total_paragraphs": doc.Paragraphs.Count,
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


async def handle_word_write(
    paragraphs: List[Dict[str, Any]],
    clear_first: bool = False,
) -> Dict[str, Any]:
    """Write paragraphs to Word directly via COM. Each paragraph spec:

    {
      "text": "Der kleine Roboter",
      "style": "Heading 1",      # Word style name (language-dependent!)
      "bold": true,
      "italic": true,
      "align": "center",
      "font_size": 14
    }

    Style names depend on Word's UI language. German: "Überschrift 1",
    English: "Heading 1". Use describe_screen to check the active language.
    """
    if not paragraphs:
        return {"success": False, "error": "paragraphs list is empty"}
    return await asyncio.to_thread(_word_write_sync, paragraphs, clear_first)


# ─── Save (works for both Excel and Word) ───────────────────────────────────


def _office_save_sync(app: str = "auto") -> Dict[str, Any]:
    """Save the active document/workbook."""
    saved = []

    if app in ("auto", "excel"):
        xl = _get_excel()
        if xl and xl.ActiveWorkbook:
            try:
                xl.ActiveWorkbook.Save()
                saved.append({"app": "excel", "name": xl.ActiveWorkbook.Name})
            except Exception as e:
                return {"success": False, "error": f"Excel save failed: {e}"}

    if app in ("auto", "word"):
        wd = _get_word()
        if wd and wd.ActiveDocument:
            try:
                wd.ActiveDocument.Save()
                saved.append({"app": "word", "name": wd.ActiveDocument.Name})
            except Exception as e:
                return {"success": False, "error": f"Word save failed: {e}"}

    if not saved:
        return {"success": False, "error": "No active Office document found"}
    return {"success": True, "saved": saved}


async def handle_office_save(app: str = "auto") -> Dict[str, Any]:
    """Save the active Office document. app='auto'|'excel'|'word'."""
    return await asyncio.to_thread(_office_save_sync, app)
