"""Geometry-first OCR for the Handoff MCP server.

Phase 5: implements `handoff_read_screen_geometry` — extracts text WITH
precise pixel positions (polygon bounding-boxes) from any monitor or region.

This closes the critical gap where UIA gives clean text but only per-Control
bounds, and Tesseract gives noisy text with no geometry at all (as used).
PaddleOCR is the primary engine because it delivers:

  - 4-point polygon boxes (dt_polys) — handles rotation/perspective
  - rectangular boxes (rec_boxes) — fast UI overlay
  - per-token confidence scores
  - optional character-level boxes (return_word_box)
  - layout analysis via PP-StructureV3 (blocks: title/text/table/figure/list)

Output follows the Geometry-First JSON schema from the user's OCR research:

  DocumentExtractionResult
    └─ pages[]
         ├─ geometry (coord_space, page_size, origin, direction)
         ├─ tokens[] (text, confidence, polygon, bbox_xyxy)
         ├─ lines[] (text, confidence, polygon, token_ids, reading_order)
         └─ blocks[] (block_type, geometry, line_ids)  [optional]

Fallback chain:  PaddleOCR → Tesseract+hOCR → EasyOCR

Dependencies:
  - paddlepaddle + paddleocr  (primary)
  - pytesseract               (fallback)
  - easyocr                   (fallback)
  All optional — the tool reports which engine succeeded.
"""

from __future__ import annotations

import asyncio
import hashlib
import io
import logging
import os
import time
import uuid
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


# ─── Engine singletons (lazy, heavy init) ────────────────────────────────────

_RAPID_OCR: Any = None
_RAPID_LOAD_FAILED: bool = False
_PADDLE_OCR: Any = None
_PADDLE_LOAD_FAILED: bool = False
_EASYOCR_READER: Any = None
_EASYOCR_LOAD_FAILED: bool = False


def _get_rapid_ocr():
    """RapidOCR: PP-OCRv4 models on ONNX Runtime. No PaddlePaddle needed."""
    global _RAPID_OCR, _RAPID_LOAD_FAILED
    if _RAPID_OCR is not None:
        return _RAPID_OCR
    if _RAPID_LOAD_FAILED:
        return None
    try:
        from rapidocr_onnxruntime import RapidOCR  # type: ignore

        _RAPID_OCR = RapidOCR()
        logger.info("RapidOCR engine loaded (PP-OCRv4 on ONNX Runtime)")
        return _RAPID_OCR
    except Exception as e:
        logger.warning(f"RapidOCR unavailable: {e}")
        _RAPID_LOAD_FAILED = True
        return None


def _get_paddle_ocr():
    global _PADDLE_OCR, _PADDLE_LOAD_FAILED
    if _PADDLE_OCR is not None:
        return _PADDLE_OCR
    if _PADDLE_LOAD_FAILED:
        return None
    try:
        import os as _os

        _os.environ.setdefault("PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK", "True")

        # ── Monkey-patch: disable PIR (new_ir) to bypass the Windows bug ──
        # PaddlePaddle 3.3.1 has a C++ NotImplementedError in the PIR→oneDNN
        # attribute converter. Root cause: PaddleInfer._create (line 485)
        # calls config.enable_new_ir(option.enable_new_ir) — when True, the
        # PIR compiler is activated and crashes. Fix: patch PaddleInfer._create
        # to force enable_new_ir=False on the option before the original runs.
        # Step 1: import and patch BEFORE PaddleOCR touches anything.
        import paddlex.inference.models.common.static_infer as _si_mod

        _PaddleInfer = _si_mod.PaddleInfer

        if not getattr(_PaddleInfer._create, "_pir_patched", False):
            _original_create = _PaddleInfer._create

            def _patched_create(self, *args, **kwargs):
                if hasattr(self, "_option") and hasattr(self._option, "enable_new_ir"):
                    self._option.enable_new_ir = False
                return _original_create(self, *args, **kwargs)

            _PaddleInfer._create = _patched_create
            _PaddleInfer._create._pir_patched = True  # type: ignore
            logger.info(
                "Monkey-patched PaddleInfer._create: PIR disabled (Windows oneDNN bug)"
            )

        # Step 2: now import PaddleOCR — it will use the patched PaddleInfer.
        from paddleocr import PaddleOCR  # type: ignore

        _PADDLE_OCR = PaddleOCR(
            lang="en",
            use_textline_orientation=True,
        )
        logger.info("PaddleOCR engine loaded")
        return _PADDLE_OCR
    except Exception as e:
        logger.warning(f"PaddleOCR unavailable: {e}")
        _PADDLE_LOAD_FAILED = True
        return None


def _get_easyocr():
    global _EASYOCR_READER, _EASYOCR_LOAD_FAILED
    if _EASYOCR_READER is not None:
        return _EASYOCR_READER
    if _EASYOCR_LOAD_FAILED:
        return None
    try:
        import easyocr  # type: ignore

        # Use English-only to avoid triggering a model download for German
        # (the download progress bar crashes on cp1252 terminals on Windows).
        # Detection model (CRAFT) is language-agnostic anyway.
        _EASYOCR_READER = easyocr.Reader(["en"], gpu=True, verbose=False)
        logger.info("EasyOCR reader loaded (English, GPU)")
        return _EASYOCR_READER
    except Exception as e:
        logger.warning(f"EasyOCR unavailable: {e}")
        _EASYOCR_LOAD_FAILED = True
        return None


# ─── Screenshot acquisition (shared with handle_read_screen) ─────────────────


def _capture_monitor_pil(monitor_id: int = 0, region: Optional[Dict[str, int]] = None):
    """Capture a monitor via mss, return a PIL.Image. Same logic as handle_read_screen."""
    from PIL import Image

    try:
        import mss  # type: ignore

        with mss.mss() as sct:
            physical = sct.monitors[1:]
            if region:
                bbox = {
                    "left": int(region.get("x", 0)),
                    "top": int(region.get("y", 0)),
                    "width": int(region.get("width", 800)),
                    "height": int(region.get("height", 600)),
                }
            else:
                if not physical:
                    return None
                idx = max(0, min(monitor_id, len(physical) - 1))
                bbox = physical[idx]
            raw = sct.grab(bbox)
            return Image.frombytes("RGB", raw.size, raw.bgra, "raw", "BGRX")
    except Exception as e:
        logger.debug(f"mss capture failed: {e}")
        import pyautogui  # type: ignore

        return pyautogui.screenshot()


def _pil_to_numpy(img):
    import numpy as np

    return np.array(img)


# ─── Geometry helpers ────────────────────────────────────────────────────────


def _polygon_to_bbox(polygon: List[List[float]]) -> List[float]:
    """Convert 4-point polygon [[x,y],...] to [x_min, y_min, x_max, y_max]."""
    xs = [p[0] for p in polygon]
    ys = [p[1] for p in polygon]
    return [min(xs), min(ys), max(xs), max(ys)]


def _bbox_center(bbox: List[float]) -> Tuple[int, int]:
    """Return (cx, cy) of a bbox [x_min, y_min, x_max, y_max]."""
    return (int((bbox[0] + bbox[2]) / 2), int((bbox[1] + bbox[3]) / 2))


def _make_geometry(
    page_w: int,
    page_h: int,
    polygon: Optional[List[List[float]]] = None,
    bbox: Optional[List[float]] = None,
    coord_space: str = "page_pixels",
) -> Dict[str, Any]:
    """Build a Geometry dict following the JSON schema."""
    geo: Dict[str, Any] = {
        "coord_space": coord_space,
        "units": "px" if coord_space == "page_pixels" else "unit",
        "origin": "top_left",
        "direction": {"x": "right", "y": "down"},
        "page_size": {"width": page_w, "height": page_h},
    }
    if polygon is not None:
        geo["polygon"] = [[round(p[0], 1), round(p[1], 1)] for p in polygon]
        geo["bbox_xyxy"] = [round(v, 1) for v in _polygon_to_bbox(polygon)]
    elif bbox is not None:
        geo["bbox_xyxy"] = [round(v, 1) for v in bbox]
    return geo


def _make_normalized_geometry(
    page_w: int,
    page_h: int,
    polygon: Optional[List[List[float]]] = None,
    bbox: Optional[List[float]] = None,
) -> Dict[str, Any]:
    """Same geometry but in normalized 0..1 coordinates."""
    if polygon:
        norm_poly = [[p[0] / page_w, p[1] / page_h] for p in polygon]
        norm_bbox = _polygon_to_bbox(norm_poly)
    elif bbox:
        norm_poly = None
        norm_bbox = [
            bbox[0] / page_w,
            bbox[1] / page_h,
            bbox[2] / page_w,
            bbox[3] / page_h,
        ]
    else:
        return {}
    return _make_geometry(page_w, page_h, norm_poly, norm_bbox, "page_normalized_0_1")


# ─── Engine-specific extraction ──────────────────────────────────────────────


async def _extract_rapidocr(
    img_np,
    page_w: int,
    page_h: int,
) -> Optional[Dict[str, Any]]:
    """RapidOCR: PP-OCRv4 models on ONNX Runtime. Returns polygon boxes."""
    ocr = _get_rapid_ocr()
    if ocr is None:
        return None

    try:
        result, _elapse = await asyncio.to_thread(ocr, img_np)
    except Exception as e:
        logger.warning(f"RapidOCR extraction failed: {e}")
        return None

    if not result:
        return {"tokens": [], "lines": [], "engine": "rapidocr", "raw_count": 0}

    tokens: List[Dict[str, Any]] = []
    lines: List[Dict[str, Any]] = []

    for idx, (polygon_raw, text, conf) in enumerate(result):
        polygon = [[float(p[0]), float(p[1])] for p in polygon_raw]
        token_id = f"t_{idx}"
        tokens.append(
            {
                "id": token_id,
                "text": str(text),
                "confidence": round(float(conf), 4),
                "geometry": _make_geometry(page_w, page_h, polygon=polygon),
                "geometry_normalized": _make_normalized_geometry(
                    page_w, page_h, polygon=polygon
                ),
            }
        )
        lines.append(
            {
                "id": f"l_{idx}",
                "text": str(text),
                "confidence": round(float(conf), 4),
                "geometry": _make_geometry(page_w, page_h, polygon=polygon),
                "token_ids": [token_id],
                "reading_order": idx,
            }
        )

    return {
        "tokens": tokens,
        "lines": lines,
        "engine": "rapidocr",
        "raw_count": len(result),
    }


async def _extract_paddle(
    img_np,
    page_w: int,
    page_h: int,
    return_char_boxes: bool = False,
) -> Optional[Dict[str, Any]]:
    """Run PaddleOCR and build the DocumentExtractionResult page."""
    ocr = _get_paddle_ocr()
    if ocr is None:
        return None

    try:
        # PaddleOCR 3.4+ uses `predict()` instead of `ocr()`.
        # It returns a list of page results; for numpy arrays, just one.
        if hasattr(ocr, "predict"):
            results = await asyncio.to_thread(ocr.predict, img_np)
        else:
            results = await asyncio.to_thread(ocr.ocr, img_np)
    except Exception as e:
        logger.warning(f"PaddleOCR extraction failed: {e}")
        return None

    # PaddleOCR 3.4 `predict()` returns a list of dicts with 'rec_texts',
    # 'rec_scores', 'dt_polys' etc.  Older versions return list-of-lists
    # of (polygon, (text, conf)).  We handle both shapes.
    tokens: List[Dict[str, Any]] = []
    lines: List[Dict[str, Any]] = []

    if not results:
        return {"tokens": [], "lines": [], "engine": "paddleocr", "raw_count": 0}

    # New API shape (3.4+): results is a list of page-dicts.
    if isinstance(results, list) and results and isinstance(results[0], dict):
        page_dict = results[0]
        rec_texts = page_dict.get("rec_texts") or page_dict.get("rec_text") or []
        rec_scores = page_dict.get("rec_scores") or page_dict.get("rec_score") or []
        dt_polys = page_dict.get("dt_polys") or page_dict.get("input_path") or []
        # dt_polys might be nested ndarray.
        for idx in range(len(rec_texts)):
            text = str(rec_texts[idx])
            conf = float(rec_scores[idx]) if idx < len(rec_scores) else 0.0
            poly = dt_polys[idx] if idx < len(dt_polys) else None
            if poly is not None:
                try:
                    polygon = [[float(p[0]), float(p[1])] for p in poly]
                except Exception:
                    polygon = None
            else:
                polygon = None

            token_id = f"t_{idx}"
            geo = _make_geometry(page_w, page_h, polygon=polygon) if polygon else {}
            geo_norm = (
                _make_normalized_geometry(page_w, page_h, polygon=polygon)
                if polygon
                else {}
            )

            tokens.append(
                {
                    "id": token_id,
                    "text": text,
                    "confidence": round(conf, 4),
                    "geometry": geo,
                    "geometry_normalized": geo_norm,
                }
            )
            lines.append(
                {
                    "id": f"l_{idx}",
                    "text": text,
                    "confidence": round(conf, 4),
                    "geometry": geo,
                    "token_ids": [token_id],
                    "reading_order": idx,
                }
            )

    # Legacy API shape (< 3.4): list of list of (polygon, (text, conf)).
    elif isinstance(results, list) and results and isinstance(results[0], list):
        page_result = results[0]
        for idx, item in enumerate(page_result):
            if not item or len(item) < 2:
                continue
            polygon_raw = item[0]
            text_info = item[1]
            text = (
                text_info[0] if isinstance(text_info, (list, tuple)) else str(text_info)
            )
            conf = (
                float(text_info[1])
                if isinstance(text_info, (list, tuple)) and len(text_info) > 1
                else 0.0
            )
            polygon = [[float(p[0]), float(p[1])] for p in polygon_raw]
            token_id = f"t_{idx}"
            tokens.append(
                {
                    "id": token_id,
                    "text": text,
                    "confidence": round(conf, 4),
                    "geometry": _make_geometry(page_w, page_h, polygon=polygon),
                    "geometry_normalized": _make_normalized_geometry(
                        page_w, page_h, polygon=polygon
                    ),
                }
            )
            lines.append(
                {
                    "id": f"l_{idx}",
                    "text": text,
                    "confidence": round(conf, 4),
                    "geometry": _make_geometry(page_w, page_h, polygon=polygon),
                    "token_ids": [token_id],
                    "reading_order": idx,
                }
            )
    else:
        logger.warning(f"Unexpected PaddleOCR result shape: {type(results)}")
        return None

    return {
        "tokens": tokens,
        "lines": lines,
        "engine": "paddleocr",
        "raw_count": len(tokens),
    }


async def _extract_tesseract_hocr(
    img_np,
    page_w: int,
    page_h: int,
) -> Optional[Dict[str, Any]]:
    """Tesseract with TSV output for word-level boxes (fallback)."""
    try:
        import shutil

        import pytesseract  # type: ignore

        binary = os.getenv("TESSERACT_PATH") or shutil.which("tesseract")
        if not binary:
            # Standard paths
            for p in [r"C:\Program Files\Tesseract-OCR\tesseract.exe"]:
                if os.path.isfile(p):
                    binary = p
                    break
        if not binary:
            return None
        pytesseract.pytesseract.tesseract_cmd = binary
    except ImportError:
        return None

    try:
        from PIL import Image

        if not isinstance(img_np, Image.Image):
            img = Image.fromarray(img_np)
        else:
            img = img_np
        tsv_data = await asyncio.to_thread(
            pytesseract.image_to_data, img, output_type=pytesseract.Output.DICT
        )
    except Exception as e:
        logger.debug(f"tesseract TSV failed: {e}")
        return None

    tokens: List[Dict[str, Any]] = []
    lines: List[Dict[str, Any]] = []
    n = len(tsv_data.get("text", []))

    current_line_tokens: List[str] = []
    current_line_text_parts: List[str] = []
    current_line_bbox: Optional[List[float]] = None
    line_idx = 0
    last_line_num = -1

    for i in range(n):
        text = (tsv_data["text"][i] or "").strip()
        conf = float(tsv_data["conf"][i]) if tsv_data["conf"][i] != -1 else 0.0
        if not text:
            continue

        x = int(tsv_data["left"][i])
        y = int(tsv_data["top"][i])
        w = int(tsv_data["width"][i])
        h = int(tsv_data["height"][i])
        bbox = [x, y, x + w, y + h]
        line_num = tsv_data.get("line_num", [0] * n)[i]

        token_id = f"t_{len(tokens)}"
        tokens.append(
            {
                "id": token_id,
                "text": text,
                "confidence": round(conf / 100.0, 4),  # Tesseract gives 0-100
                "geometry": _make_geometry(page_w, page_h, bbox=bbox),
                "geometry_normalized": _make_normalized_geometry(
                    page_w, page_h, bbox=bbox
                ),
            }
        )

        # Group tokens into lines by line_num.
        if line_num != last_line_num and current_line_tokens:
            lines.append(
                {
                    "id": f"l_{line_idx}",
                    "text": " ".join(current_line_text_parts),
                    "confidence": 0.0,
                    "geometry": _make_geometry(page_w, page_h, bbox=current_line_bbox),
                    "token_ids": list(current_line_tokens),
                    "reading_order": line_idx,
                }
            )
            line_idx += 1
            current_line_tokens = []
            current_line_text_parts = []
            current_line_bbox = None

        current_line_tokens.append(token_id)
        current_line_text_parts.append(text)
        if current_line_bbox is None:
            current_line_bbox = list(bbox)
        else:
            current_line_bbox[0] = min(current_line_bbox[0], bbox[0])
            current_line_bbox[1] = min(current_line_bbox[1], bbox[1])
            current_line_bbox[2] = max(current_line_bbox[2], bbox[2])
            current_line_bbox[3] = max(current_line_bbox[3], bbox[3])
        last_line_num = line_num

    # Flush last line.
    if current_line_tokens:
        lines.append(
            {
                "id": f"l_{line_idx}",
                "text": " ".join(current_line_text_parts),
                "confidence": 0.0,
                "geometry": _make_geometry(page_w, page_h, bbox=current_line_bbox),
                "token_ids": list(current_line_tokens),
                "reading_order": line_idx,
            }
        )

    return {
        "tokens": tokens,
        "lines": lines,
        "engine": "tesseract_tsv",
        "raw_count": len(tokens),
    }


async def _extract_easyocr(
    img_np,
    page_w: int,
    page_h: int,
) -> Optional[Dict[str, Any]]:
    """EasyOCR fallback — returns polygon boxes."""
    reader = _get_easyocr()
    if reader is None:
        return None
    try:
        results = await asyncio.to_thread(reader.readtext, img_np)
    except Exception as e:
        logger.debug(f"EasyOCR failed: {e}")
        return None

    tokens: List[Dict[str, Any]] = []
    lines: List[Dict[str, Any]] = []
    for idx, (polygon_raw, text, conf) in enumerate(results):
        polygon = [[float(p[0]), float(p[1])] for p in polygon_raw]
        token_id = f"t_{idx}"
        tokens.append(
            {
                "id": token_id,
                "text": text,
                "confidence": round(float(conf), 4),
                "geometry": _make_geometry(page_w, page_h, polygon=polygon),
                "geometry_normalized": _make_normalized_geometry(
                    page_w, page_h, polygon=polygon
                ),
            }
        )
        lines.append(
            {
                "id": f"l_{idx}",
                "text": text,
                "confidence": round(float(conf), 4),
                "geometry": _make_geometry(page_w, page_h, polygon=polygon),
                "token_ids": [token_id],
                "reading_order": idx,
            }
        )

    return {
        "tokens": tokens,
        "lines": lines,
        "engine": "easyocr",
        "raw_count": len(results),
    }


# ─── Main tool function ─────────────────────────────────────────────────────


async def handle_read_screen_geometry(
    monitor_id: int = 0,
    region: Optional[Dict[str, int]] = None,
    engine: str = "auto",  # auto | paddleocr | tesseract | easyocr
    return_char_boxes: bool = False,
    include_normalized: bool = True,
    layout_analysis: bool = False,
) -> Dict[str, Any]:
    """Capture a monitor/region and extract text WITH polygon geometry.

    Returns a DocumentExtractionResult following the Geometry-First schema:
    tokens[] and lines[] each carry `geometry` with `polygon` (4-point) and
    `bbox_xyxy` in pixel coordinates, plus optionally `geometry_normalized`
    in 0..1 space.

    The response includes `click_targets[]` — a flat summary of the best
    click-coordinate per detected text region, so the agent can immediately
    use the result for `handoff_action(type='click', params={x, y})`.
    """
    t0 = time.perf_counter()

    # 1. Capture screenshot.
    img = _capture_monitor_pil(monitor_id, region)
    if img is None:
        return {"success": False, "error": "screenshot capture failed"}

    img_np = _pil_to_numpy(img)
    page_w, page_h = img.width, img.height

    # 2. Extract via engine chain.
    extraction: Optional[Dict[str, Any]] = None
    engines_tried: List[str] = []

    # Engine priority for "auto":
    #   RapidOCR (PP-OCRv4 on ONNX Runtime, polygon boxes, best quality)
    #   > EasyOCR (polygon+DL, good quality)
    #   > PaddleOCR (if PaddlePaddle works on this platform)
    #   > Tesseract+TSV (rect boxes only, always available)
    if engine in ("auto", "rapidocr"):
        engines_tried.append("rapidocr")
        extraction = await _extract_rapidocr(img_np, page_w, page_h)

    if extraction is None and engine in ("auto", "easyocr"):
        engines_tried.append("easyocr")
        extraction = await _extract_easyocr(img_np, page_w, page_h)

    if extraction is None and engine in ("auto", "paddleocr"):
        engines_tried.append("paddleocr")
        extraction = await _extract_paddle(img_np, page_w, page_h, return_char_boxes)

    if extraction is None and engine in ("auto", "tesseract"):
        engines_tried.append("tesseract_tsv")
        extraction = await _extract_tesseract_hocr(img_np, page_w, page_h)

    if extraction is None:
        return {
            "success": False,
            "error": f"no OCR engine available (tried: {engines_tried})",
            "engines_tried": engines_tried,
        }

    # 3. Build click_targets summary.
    click_targets: List[Dict[str, Any]] = []
    for token in extraction.get("tokens", []):
        geo = token.get("geometry", {})
        bbox = geo.get("bbox_xyxy")
        if bbox and len(bbox) == 4:
            cx, cy = _bbox_center(bbox)
            # If region was specified, add the offset back to get global coords.
            if region:
                cx += int(region.get("x", 0))
                cy += int(region.get("y", 0))
            click_targets.append(
                {
                    "text": token["text"],
                    "confidence": token["confidence"],
                    "x": cx,
                    "y": cy,
                    "bbox": [round(v) for v in bbox],
                }
            )

    # 4. Full text (concatenated lines in reading order).
    lines = extraction.get("lines", [])
    full_text = "\n".join(
        l["text"] for l in sorted(lines, key=lambda l: l.get("reading_order", 0))
    )

    elapsed_ms = round((time.perf_counter() - t0) * 1000, 1)

    # 5. Build DocumentExtractionResult.
    doc_id = f"geom_{uuid.uuid4().hex[:10]}"
    result: Dict[str, Any] = {
        "success": True,
        "doc_id": doc_id,
        "source": {
            "type": "screenshot",
            "monitor_id": monitor_id,
            "region": region,
        },
        "engine": {
            "ocr_engine": extraction["engine"],
            "engines_tried": engines_tried,
        },
        "page": {
            "page_index": 0,
            "geometry": {
                "coord_space": "page_pixels",
                "units": "px",
                "origin": "top_left",
                "direction": {"x": "right", "y": "down"},
                "page_size": {"width": page_w, "height": page_h},
            },
            "token_count": len(extraction.get("tokens", [])),
            "line_count": len(lines),
            "tokens": extraction.get("tokens", []),
            "lines": lines,
        },
        "text": full_text,
        "text_length": len(full_text),
        "click_targets": click_targets,
        "elapsed_ms": elapsed_ms,
    }

    # Strip normalized geometry if not requested (saves ~40% response size).
    if not include_normalized:
        for t in result["page"]["tokens"]:
            t.pop("geometry_normalized", None)

    return result


# ─── Utility: find text in geometry results ──────────────────────────────────


def find_text_in_geometry(
    geometry_result: Dict[str, Any],
    target_text: str,
    fuzzy: bool = True,
    min_confidence: float = 0.3,
) -> Optional[Dict[str, Any]]:
    """Search click_targets for a text match. Returns the best match or None.

    Used by handle_find_element as a PaddleOCR fallback when UIA finds nothing.
    """
    if not target_text:
        return None
    target_lc = target_text.lower().strip()
    candidates = []
    for ct in geometry_result.get("click_targets", []):
        if ct.get("confidence", 0) < min_confidence:
            continue
        ct_text = (ct.get("text") or "").lower().strip()
        if ct_text == target_lc:
            return ct  # exact match
        if fuzzy and target_lc in ct_text:
            candidates.append((len(ct_text), ct))  # prefer shorter (more precise)
        elif fuzzy and ct_text in target_lc:
            candidates.append((len(ct_text) + 100, ct))

    if candidates:
        candidates.sort(key=lambda x: x[0])
        return candidates[0][1]
    return None
