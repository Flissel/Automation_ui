#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
TRAE Remote Desktop Automation REST API

Provides REST endpoints for remote desktop automation and OCR functionality.
Integrates with the existing FastAPI system.
"""

import asyncio
import base64
import json
import logging
import os
import sys
import time
import traceback
from datetime import datetime
from io import BytesIO
from typing import Any, Dict, List, Optional, Tuple, Union

import cv2
import numpy as np
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from PIL import Image
from pydantic import BaseModel, Field

# Configure logging
logger = logging.getLogger("remote_automation")

# Try to import required packages
try:
    # Lazy import pyautogui to avoid X11 issues during module loading
    pyautogui = None

    def _ensure_pyautogui():
        global pyautogui
        if pyautogui is None:
            try:
                import pyautogui as _pyautogui

                pyautogui = _pyautogui
            except ImportError:
                logger.info("Installing pyautogui package...")
                import subprocess

                subprocess.check_call(
                    [sys.executable, "-m", "pip", "install", "pyautogui"]
                )
                import pyautogui as _pyautogui

                pyautogui = _pyautogui
            except Exception as e:
                logger.warning(f"Failed to import pyautogui: {e}")
                pyautogui = None
        return pyautogui

except ImportError:
    # Handle case where subprocess is not available
    pyautogui = None

    def _ensure_pyautogui():
        return None


try:
    import pytesseract
except ImportError:
    logger.info("Installing pytesseract package...")
    import subprocess

    subprocess.check_call([sys.executable, "-m", "pip", "install", "pytesseract"])
    import pytesseract

# Try to import easyocr (optional)
try:
    import easyocr

    EASYOCR_AVAILABLE = True
except ImportError:
    logger.info("EasyOCR not available. Using Tesseract OCR only.")
    EASYOCR_AVAILABLE = False

# Constants
SCREENSHOT_DIR = os.environ.get("SCREENSHOT_DIR", "desktop_screenshots")
OCR_RESULTS_DIR = os.environ.get("OCR_RESULTS_DIR", "ocr_results")
AUTOMATION_MODE = os.environ.get("AUTOMATION_MODE", "local")
DEFAULT_SCALE = float(os.environ.get("STREAM_SCALE", 0.8))

# Ensure directories exist
os.makedirs(SCREENSHOT_DIR, exist_ok=True)
os.makedirs(OCR_RESULTS_DIR, exist_ok=True)

# Initialize EasyOCR reader if available
easyocr_reader = None
if EASYOCR_AVAILABLE:
    try:
        tesseract_lang = os.environ.get("TESSERACT_LANG", "en")
        easyocr_reader = easyocr.Reader([tesseract_lang])
        logger.info("EasyOCR initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize EasyOCR: {e}")
        easyocr_reader = None

# Configure automation mode
if AUTOMATION_MODE == "docker":
    logger.info("Running in Docker mode with virtual display")
    pyautogui.FAILSAFE = False
    if "DISPLAY" not in os.environ:
        os.environ["DISPLAY"] = ":99"
        logger.warning("DISPLAY environment variable not set, defaulting to :99")
else:
    logger.info("Running in local mode with native display")
    pyautogui.FAILSAFE = True

# Create FastAPI router
router = APIRouter(prefix="/api/automation", tags=["Remote Automation"])


# Pydantic models for request/response validation
class MouseClickRequest(BaseModel):
    """Request model for mouse click operations."""

    x: int = Field(..., description="X coordinate")
    y: int = Field(..., description="Y coordinate")
    button: str = Field("left", description="Mouse button (left, right, middle)")
    clicks: int = Field(1, description="Number of clicks")
    duration: float = Field(0.1, description="Duration of click in seconds")
    scale_coordinates: bool = Field(
        True, description="Whether to scale coordinates based on stream scale factor"
    )


class MouseMoveRequest(BaseModel):
    """Request model for mouse move operations."""

    x: int = Field(..., description="X coordinate")
    y: int = Field(..., description="Y coordinate")
    duration: float = Field(0.1, description="Duration of movement in seconds")
    scale_coordinates: bool = Field(
        True, description="Whether to scale coordinates based on stream scale factor"
    )


class MouseDragRequest(BaseModel):
    """Request model for mouse drag operations."""

    start_x: int = Field(..., description="Start X coordinate")
    start_y: int = Field(..., description="Start Y coordinate")
    end_x: int = Field(..., description="End X coordinate")
    end_y: int = Field(..., description="End Y coordinate")
    button: str = Field("left", description="Mouse button (left, right, middle)")
    duration: float = Field(0.5, description="Duration of drag in seconds")
    scale_coordinates: bool = Field(
        True, description="Whether to scale coordinates based on stream scale factor"
    )


class KeyboardTypeRequest(BaseModel):
    """Request model for keyboard typing operations."""

    text: str = Field(..., description="Text to type")
    interval: float = Field(0.01, description="Interval between keystrokes in seconds")


class KeyboardPressRequest(BaseModel):
    """Request model for keyboard key press operations."""

    key: str = Field(..., description="Key to press (e.g., 'enter', 'tab', 'ctrl')")


class KeyboardHotkeyRequest(BaseModel):
    """Request model for keyboard hotkey operations."""

    keys: List[str] = Field(
        ..., description="List of keys for hotkey combination (e.g., ['ctrl', 'c'])"
    )


class ScreenshotRequest(BaseModel):
    """Request model for screenshot operations."""

    x: Optional[int] = Field(None, description="X coordinate of region (optional)")
    y: Optional[int] = Field(None, description="Y coordinate of region (optional)")
    width: Optional[int] = Field(None, description="Width of region (optional)")
    height: Optional[int] = Field(None, description="Height of region (optional)")
    format: str = Field("png", description="Image format (png or jpeg)")
    quality: int = Field(90, description="JPEG quality (1-100, only for JPEG format)")
    save_file: bool = Field(False, description="Whether to save screenshot to file")
    scale_coordinates: bool = Field(
        True, description="Whether to scale coordinates based on stream scale factor"
    )


class OCRRequest(BaseModel):
    """Request model for OCR operations."""

    x: Optional[int] = Field(None, description="X coordinate of region (optional)")
    y: Optional[int] = Field(None, description="Y coordinate of region (optional)")
    width: Optional[int] = Field(None, description="Width of region (optional)")
    height: Optional[int] = Field(None, description="Height of region (optional)")
    engine: str = Field("tesseract", description="OCR engine (tesseract or easyocr)")
    lang: str = Field("eng", description="Language for OCR")
    save_result: bool = Field(False, description="Whether to save OCR results to file")
    scale_coordinates: bool = Field(
        True, description="Whether to scale coordinates based on stream scale factor"
    )


class AutomationResponse(BaseModel):
    """Standard response model for automation operations."""

    success: bool = Field(..., description="Whether the operation was successful")
    message: str = Field(..., description="Response message")
    data: Optional[Dict[str, Any]] = Field(None, description="Additional response data")
    timestamp: float = Field(..., description="Timestamp of the operation")


def scale_coordinates(
    x: int, y: int, scale_factor: float = DEFAULT_SCALE
) -> Tuple[int, int]:
    """
    Scale coordinates based on the stream scale factor.

    Args:
        x: X coordinate
        y: Y coordinate
        scale_factor: Scale factor to apply

    Returns:
        Tuple of scaled coordinates
    """
    return int(x / scale_factor), int(y / scale_factor)


def create_response(
    success: bool, message: str, data: Optional[Dict[str, Any]] = None
) -> AutomationResponse:
    """
    Create a standardized response.

    Args:
        success: Whether the operation was successful
        message: Response message
        data: Additional response data

    Returns:
        AutomationResponse object
    """
    return AutomationResponse(
        success=success, message=message, data=data or {}, timestamp=time.time()
    )


@router.get("/status", response_model=AutomationResponse)
async def get_automation_status():
    """
    Get the status of the automation service.

    Returns:
        Service status information
    """
    try:
        screen_size = pyautogui.size()

        status_data = {
            "automation_mode": AUTOMATION_MODE,
            "screen_size": {"width": screen_size[0], "height": screen_size[1]},
            "scale_factor": DEFAULT_SCALE,
            "failsafe_enabled": pyautogui.FAILSAFE,
            "easyocr_available": EASYOCR_AVAILABLE,
            "tesseract_available": True,  # Always available if we reach this point
            "display": os.environ.get("DISPLAY", "unknown"),
            "screenshot_dir": SCREENSHOT_DIR,
            "ocr_results_dir": OCR_RESULTS_DIR,
        }

        return create_response(
            success=True, message="Automation service is running", data=status_data
        )

    except Exception as e:
        logger.error(f"Error getting automation status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/mouse/click", response_model=AutomationResponse)
async def mouse_click(request: MouseClickRequest):
    """
    Perform a mouse click operation.

    Args:
        request: Mouse click request parameters

    Returns:
        Result of the click operation
    """
    try:
        x, y = request.x, request.y

        # Scale coordinates if requested
        if request.scale_coordinates:
            x, y = scale_coordinates(x, y)

        # Validate coordinates
        screen_width, screen_height = pyautogui.size()
        if not (0 <= x <= screen_width and 0 <= y <= screen_height):
            raise HTTPException(
                status_code=400,
                detail=f"Coordinates ({x}, {y}) are outside screen bounds ({screen_width}x{screen_height})",
            )

        # Perform click
        pyautogui.click(
            x=x,
            y=y,
            button=request.button,
            clicks=request.clicks,
            duration=request.duration,
        )

        return create_response(
            success=True,
            message=f"Mouse {request.button} click performed at ({x}, {y})",
            data={
                "x": x,
                "y": y,
                "button": request.button,
                "clicks": request.clicks,
                "original_coordinates": {"x": request.x, "y": request.y},
                "scaled": request.scale_coordinates,
            },
        )

    except Exception as e:
        logger.error(f"Error performing mouse click: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/mouse/move", response_model=AutomationResponse)
async def mouse_move(request: MouseMoveRequest):
    """
    Perform a mouse move operation.

    Args:
        request: Mouse move request parameters

    Returns:
        Result of the move operation
    """
    try:
        x, y = request.x, request.y

        # Scale coordinates if requested
        if request.scale_coordinates:
            x, y = scale_coordinates(x, y)

        # Validate coordinates
        screen_width, screen_height = pyautogui.size()
        if not (0 <= x <= screen_width and 0 <= y <= screen_height):
            raise HTTPException(
                status_code=400,
                detail=f"Coordinates ({x}, {y}) are outside screen bounds ({screen_width}x{screen_height})",
            )

        # Perform move
        pyautogui.moveTo(x=x, y=y, duration=request.duration)

        return create_response(
            success=True,
            message=f"Mouse moved to ({x}, {y})",
            data={
                "x": x,
                "y": y,
                "original_coordinates": {"x": request.x, "y": request.y},
                "scaled": request.scale_coordinates,
            },
        )

    except Exception as e:
        logger.error(f"Error performing mouse move: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/mouse/drag", response_model=AutomationResponse)
async def mouse_drag(request: MouseDragRequest):
    """
    Perform a mouse drag operation.

    Args:
        request: Mouse drag request parameters

    Returns:
        Result of the drag operation
    """
    try:
        start_x, start_y = request.start_x, request.start_y
        end_x, end_y = request.end_x, request.end_y

        # Scale coordinates if requested
        if request.scale_coordinates:
            start_x, start_y = scale_coordinates(start_x, start_y)
            end_x, end_y = scale_coordinates(end_x, end_y)

        # Validate coordinates
        screen_width, screen_height = pyautogui.size()
        for x, y in [(start_x, start_y), (end_x, end_y)]:
            if not (0 <= x <= screen_width and 0 <= y <= screen_height):
                raise HTTPException(
                    status_code=400,
                    detail=f"Coordinates ({x}, {y}) are outside screen bounds ({screen_width}x{screen_height})",
                )

        # Perform drag
        pyautogui.moveTo(start_x, start_y)
        pyautogui.dragTo(end_x, end_y, duration=request.duration, button=request.button)

        return create_response(
            success=True,
            message=f"Mouse drag performed from ({start_x}, {start_y}) to ({end_x}, {end_y})",
            data={
                "start": {"x": start_x, "y": start_y},
                "end": {"x": end_x, "y": end_y},
                "button": request.button,
                "original_coordinates": {
                    "start": {"x": request.start_x, "y": request.start_y},
                    "end": {"x": request.end_x, "y": request.end_y},
                },
                "scaled": request.scale_coordinates,
            },
        )

    except Exception as e:
        logger.error(f"Error performing mouse drag: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/keyboard/type", response_model=AutomationResponse)
async def keyboard_type(request: KeyboardTypeRequest):
    """
    Type text using the keyboard.

    Args:
        request: Keyboard type request parameters

    Returns:
        Result of the typing operation
    """
    try:
        # Perform typing
        pyautogui.write(request.text, interval=request.interval)

        return create_response(
            success=True,
            message=f"Text typed: '{request.text[:50]}{'...' if len(request.text) > 50 else ''}",
            data={
                "text": request.text,
                "length": len(request.text),
                "interval": request.interval,
            },
        )

    except Exception as e:
        logger.error(f"Error typing text: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/keyboard/press", response_model=AutomationResponse)
async def keyboard_press(request: KeyboardPressRequest):
    """
    Press a keyboard key.

    Args:
        request: Keyboard press request parameters

    Returns:
        Result of the key press operation
    """
    try:
        # Perform key press
        pyautogui.press(request.key)

        return create_response(
            success=True,
            message=f"Key pressed: '{request.key}'",
            data={"key": request.key},
        )

    except Exception as e:
        logger.error(f"Error pressing key: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/keyboard/hotkey", response_model=AutomationResponse)
async def keyboard_hotkey(request: KeyboardHotkeyRequest):
    """
    Press a keyboard hotkey combination.

    Args:
        request: Keyboard hotkey request parameters

    Returns:
        Result of the hotkey operation
    """
    try:
        # Perform hotkey
        pyautogui.hotkey(*request.keys)

        return create_response(
            success=True,
            message=f"Hotkey pressed: {'+'.join(request.keys)}",
            data={"keys": request.keys},
        )

    except Exception as e:
        logger.error(f"Error pressing hotkey: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/screenshot", response_model=AutomationResponse)
async def take_screenshot(request: ScreenshotRequest):
    """
    Take a screenshot of the desktop or a specific region.

    Args:
        request: Screenshot request parameters

    Returns:
        Screenshot data and information
    """
    try:
        # Take screenshot
        if all(
            v is not None for v in [request.x, request.y, request.width, request.height]
        ):
            # Region screenshot
            x, y, width, height = request.x, request.y, request.width, request.height

            # Scale coordinates if requested
            if request.scale_coordinates:
                x, y = scale_coordinates(x, y)
                width = int(width / DEFAULT_SCALE)
                height = int(height / DEFAULT_SCALE)

            # Validate region
            screen_width, screen_height = pyautogui.size()
            if not (0 <= x <= screen_width and 0 <= y <= screen_height):
                raise HTTPException(
                    status_code=400,
                    detail=f"Region coordinates ({x}, {y}) are outside screen bounds",
                )

            if x + width > screen_width or y + height > screen_height:
                raise HTTPException(
                    status_code=400, detail=f"Region extends outside screen bounds"
                )

            screenshot = pyautogui.screenshot(region=(x, y, width, height))
        else:
            # Full screenshot
            screenshot = pyautogui.screenshot()
            x = y = 0
            width, height = screenshot.size

        # Convert to requested format
        buffer = BytesIO()
        if request.format.lower() == "jpeg":
            screenshot.save(
                buffer, format="JPEG", quality=request.quality, optimize=True
            )
            mime_type = "image/jpeg"
        else:
            screenshot.save(buffer, format="PNG")
            mime_type = "image/png"

        image_data = buffer.getvalue()
        base64_data = base64.b64encode(image_data).decode("utf-8")

        # Save to file if requested
        file_path = None
        if request.save_file:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"screenshot_{timestamp}.{request.format.lower()}"
            file_path = os.path.join(SCREENSHOT_DIR, filename)

            with open(file_path, "wb") as f:
                f.write(image_data)

            logger.info(f"Screenshot saved to {file_path}")

        return create_response(
            success=True,
            message="Screenshot captured successfully",
            data={
                "image_data": base64_data,
                "format": request.format,
                "mime_type": mime_type,
                "size": {"width": width, "height": height},
                "region": (
                    {"x": x, "y": y, "width": width, "height": height}
                    if request.x is not None
                    else None
                ),
                "file_path": file_path,
                "file_size": len(image_data),
                "scaled": request.scale_coordinates,
            },
        )

    except Exception as e:
        logger.error(f"Error taking screenshot: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ocr", response_model=AutomationResponse)
async def perform_ocr(request: OCRRequest):
    """
    Perform OCR text recognition on the desktop or a specific region.

    Args:
        request: OCR request parameters

    Returns:
        OCR results and extracted text
    """
    try:
        # Take screenshot for OCR
        if all(
            v is not None for v in [request.x, request.y, request.width, request.height]
        ):
            # Region OCR
            x, y, width, height = request.x, request.y, request.width, request.height

            # Scale coordinates if requested
            if request.scale_coordinates:
                x, y = scale_coordinates(x, y)
                width = int(width / DEFAULT_SCALE)
                height = int(height / DEFAULT_SCALE)

            # Validate region
            screen_width, screen_height = pyautogui.size()
            if not (0 <= x <= screen_width and 0 <= y <= screen_height):
                raise HTTPException(
                    status_code=400,
                    detail=f"Region coordinates ({x}, {y}) are outside screen bounds",
                )

            screenshot = pyautogui.screenshot(region=(x, y, width, height))
        else:
            # Full screen OCR
            screenshot = pyautogui.screenshot()
            x = y = 0
            width, height = screenshot.size

        # Convert to format needed for OCR
        img_array = np.array(screenshot)

        # Perform OCR based on selected engine
        if request.engine == "easyocr" and easyocr_reader is not None:
            # Use EasyOCR
            results = easyocr_reader.readtext(img_array)

            # Format results
            ocr_results = [
                {
                    "text": result[1],
                    "confidence": float(result[2]),
                    "bbox": [[int(pt[0]), int(pt[1])] for pt in result[0]],
                }
                for result in results
            ]

            # Extract plain text
            text = "\n".join([result[1] for result in results])

        elif request.engine == "tesseract" or easyocr_reader is None:
            # Use Tesseract OCR
            text = pytesseract.image_to_string(img_array, lang=request.lang)

            # Get detailed results including bounding boxes
            try:
                ocr_data = pytesseract.image_to_data(
                    img_array, lang=request.lang, output_type=pytesseract.Output.DICT
                )

                # Format results
                ocr_results = []
                for i in range(len(ocr_data["text"])):
                    if ocr_data["text"][i].strip():
                        ocr_results.append(
                            {
                                "text": ocr_data["text"][i],
                                "confidence": float(ocr_data["conf"][i]),
                                "bbox": [
                                    ocr_data["left"][i],
                                    ocr_data["top"][i],
                                    ocr_data["left"][i] + ocr_data["width"][i],
                                    ocr_data["top"][i] + ocr_data["height"][i],
                                ],
                            }
                        )
            except Exception as e:
                logger.warning(f"Could not get detailed OCR data: {e}")
                ocr_results = [
                    {"text": text, "confidence": 0.0, "bbox": [0, 0, width, height]}
                ]

        else:
            raise HTTPException(
                status_code=400, detail=f"Unknown OCR engine: {request.engine}"
            )

        # Save results if requested
        file_paths = {}
        if request.save_result:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

            # Save image
            img_filename = f"ocr_image_{timestamp}.png"
            img_path = os.path.join(SCREENSHOT_DIR, img_filename)
            screenshot.save(img_path)
            file_paths["image"] = img_path

            # Save text results
            txt_filename = f"ocr_results_{timestamp}.txt"
            txt_path = os.path.join(OCR_RESULTS_DIR, txt_filename)
            with open(txt_path, "w", encoding="utf-8") as f:
                f.write(text)
            file_paths["text"] = txt_path

            # Save JSON results
            json_filename = f"ocr_results_{timestamp}.json"
            json_path = os.path.join(OCR_RESULTS_DIR, json_filename)
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(
                    {
                        "text": text,
                        "results": ocr_results,
                        "engine": request.engine,
                        "lang": request.lang,
                        "region": {"x": x, "y": y, "width": width, "height": height},
                        "timestamp": timestamp,
                    },
                    f,
                    indent=2,
                    ensure_ascii=False,
                )
            file_paths["json"] = json_path

            logger.info(f"OCR results saved to {txt_path}")

        return create_response(
            success=True,
            message=f"OCR completed using {request.engine}",
            data={
                "text": text,
                "results": ocr_results,
                "engine": request.engine,
                "lang": request.lang,
                "region": (
                    {"x": x, "y": y, "width": width, "height": height}
                    if request.x is not None
                    else None
                ),
                "word_count": len(text.split()),
                "character_count": len(text),
                "result_count": len(ocr_results),
                "file_paths": file_paths,
                "scaled": request.scale_coordinates,
            },
        )

    except Exception as e:
        logger.error(f"Error performing OCR: {e}")
        logger.debug(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/screenshot/{filename}")
async def get_screenshot_file(filename: str):
    """
    Download a saved screenshot file.

    Args:
        filename: Name of the screenshot file

    Returns:
        File response with the screenshot
    """
    file_path = os.path.join(SCREENSHOT_DIR, filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Screenshot file not found")

    # Validate file is in the screenshots directory (security check)
    if not os.path.abspath(file_path).startswith(os.path.abspath(SCREENSHOT_DIR)):
        raise HTTPException(status_code=403, detail="Access denied")

    return FileResponse(
        path=file_path, filename=filename, media_type="application/octet-stream"
    )


@router.get("/ocr-results/{filename}")
async def get_ocr_result_file(filename: str):
    """
    Download a saved OCR result file.

    Args:
        filename: Name of the OCR result file

    Returns:
        File response with the OCR results
    """
    file_path = os.path.join(OCR_RESULTS_DIR, filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="OCR result file not found")

    # Validate file is in the OCR results directory (security check)
    if not os.path.abspath(file_path).startswith(os.path.abspath(OCR_RESULTS_DIR)):
        raise HTTPException(status_code=403, detail="Access denied")

    return FileResponse(
        path=file_path, filename=filename, media_type="application/octet-stream"
    )


@router.get("/files/screenshots")
async def list_screenshot_files():
    """
    List all saved screenshot files.

    Returns:
        List of screenshot files with metadata
    """
    try:
        files = []

        for filename in os.listdir(SCREENSHOT_DIR):
            file_path = os.path.join(SCREENSHOT_DIR, filename)
            if os.path.isfile(file_path):
                stat = os.stat(file_path)
                files.append(
                    {
                        "filename": filename,
                        "size": stat.st_size,
                        "created": stat.st_ctime,
                        "modified": stat.st_mtime,
                        "url": f"/api/automation/screenshot/{filename}",
                    }
                )

        # Sort by creation time (newest first)
        files.sort(key=lambda x: x["created"], reverse=True)

        return create_response(
            success=True,
            message=f"Found {len(files)} screenshot files",
            data={"files": files, "directory": SCREENSHOT_DIR},
        )

    except Exception as e:
        logger.error(f"Error listing screenshot files: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/files/ocr-results")
async def list_ocr_result_files():
    """
    List all saved OCR result files.

    Returns:
        List of OCR result files with metadata
    """
    try:
        files = []

        for filename in os.listdir(OCR_RESULTS_DIR):
            file_path = os.path.join(OCR_RESULTS_DIR, filename)
            if os.path.isfile(file_path):
                stat = os.stat(file_path)
                files.append(
                    {
                        "filename": filename,
                        "size": stat.st_size,
                        "created": stat.st_ctime,
                        "modified": stat.st_mtime,
                        "url": f"/api/automation/ocr-results/{filename}",
                    }
                )

        # Sort by creation time (newest first)
        files.sort(key=lambda x: x["created"], reverse=True)

        return create_response(
            success=True,
            message=f"Found {len(files)} OCR result files",
            data={"files": files, "directory": OCR_RESULTS_DIR},
        )

    except Exception as e:
        logger.error(f"Error listing OCR result files: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/system/info")
async def get_system_info():
    """
    Get system information for debugging and monitoring.

    Returns:
        System information and service status
    """
    try:
        import platform

        import psutil

        # Get screen information
        try:
            screen_size = pyautogui.size()
            screen_info = {"width": screen_size[0], "height": screen_size[1]}
        except Exception as e:
            screen_info = {"error": str(e)}

        # Get system information
        system_info = {
            "platform": platform.platform(),
            "python_version": platform.python_version(),
            "architecture": platform.architecture(),
            "processor": platform.processor(),
            "hostname": platform.node(),
        }

        # Get resource usage
        try:
            memory = psutil.virtual_memory()
            cpu_percent = psutil.cpu_percent(interval=1)

            resources = {
                "cpu_percent": cpu_percent,
                "memory_total": memory.total,
                "memory_available": memory.available,
                "memory_percent": memory.percent,
            }
        except Exception as e:
            resources = {"error": str(e)}

        # Get environment information
        env_info = {
            "display": os.environ.get("DISPLAY", "not_set"),
            "automation_mode": AUTOMATION_MODE,
            "screenshot_dir": SCREENSHOT_DIR,
            "ocr_results_dir": OCR_RESULTS_DIR,
            "scale_factor": DEFAULT_SCALE,
            "failsafe_enabled": pyautogui.FAILSAFE,
        }

        # Get package versions
        package_info = {
            "pyautogui": getattr(pyautogui, "__version__", "unknown"),
            "pytesseract": getattr(pytesseract, "__version__", "unknown"),
            "easyocr_available": EASYOCR_AVAILABLE,
            "opencv_available": True,  # We import cv2 successfully
            "pillow_available": True,  # We import PIL successfully
        }

        return create_response(
            success=True,
            message="System information retrieved",
            data={
                "screen": screen_info,
                "system": system_info,
                "resources": resources,
                "environment": env_info,
                "packages": package_info,
            },
        )

    except Exception as e:
        logger.error(f"Error getting system info: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Health check endpoint
@router.get("/health")
async def health_check():
    """
    Simple health check endpoint.

    Returns:
        Health status of the automation service
    """
    try:
        # Test basic functionality
        screen_size = pyautogui.size()

        return {
            "status": "healthy",
            "timestamp": time.time(),
            "screen_accessible": True,
            "screen_size": {"width": screen_size[0], "height": screen_size[1]},
        }

    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "timestamp": time.time(),
            "error": str(e),
            "screen_accessible": False,
        }


# Export the router for use in the main FastAPI app
__all__ = ["router"]
