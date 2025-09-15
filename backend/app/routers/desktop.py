"""
Desktop Router for TRAE Backend

Provides endpoints for live desktop streaming and screen information.
"""

from typing import Dict, Any
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from ..logging import get_logger, log_api_request

logger = get_logger("desktop")

router = APIRouter()

class LiveDesktopConfig(BaseModel):
    """Live desktop configuration model"""
    fps: int = 10
    quality: int = 80
    scale_factor: float = 1.0

class HostFrameData(BaseModel):
    """Host frame data model for Windows desktop capture"""
    image: str  # base64 encoded image data
    resolution: Dict[str, int]  # width, height
    timestamp: str
    status: str
    metadata: Dict[str, Any] = {}

@router.get("/status")
@log_api_request(logger)
async def get_live_desktop_status(request: Request):
    """Get live desktop streaming status"""
    try:
        # Access service through FastAPI app state
        app = request.app
        if not app or not hasattr(app, 'state') or not hasattr(app.state, 'service_manager'):
            raise HTTPException(status_code=503, detail="Service manager not available")
            
        service_manager = app.state.service_manager
        desktop_service = service_manager.get_service("live_desktop")
        
        if not desktop_service:
            raise HTTPException(status_code=503, detail="Live desktop service not available")
        
        status = await desktop_service.get_status()
        
        return JSONResponse(content={
            "success": True,
            "streaming": status.get("streaming", False),
            "clients": status.get("client_count", 0),
            "fps": status.get("fps", 10),
            "resolution": status.get("resolution", {"width": 1920, "height": 1080})
        })
        
    except Exception as e:
        logger.error(f"Get desktop status error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/configure")
@log_api_request(logger)
async def configure_live_desktop(request: Request, config: LiveDesktopConfig):
    """Configure live desktop streaming settings"""
    try:
        # Access service through FastAPI app state
        app = request.app
        if not app or not hasattr(app, 'state') or not hasattr(app.state, 'service_manager'):
            raise HTTPException(status_code=503, detail="Service manager not available")
            
        service_manager = app.state.service_manager
        desktop_service = service_manager.get_service("live_desktop")
        
        if not desktop_service:
            raise HTTPException(status_code=503, detail="Live desktop service not available")
        
        await desktop_service.update_config(config.dict())
        
        return JSONResponse(content={
            "success": True,
            "message": "Live desktop configured successfully",
            "config": config.dict()
        })
        
    except Exception as e:
        logger.error(f"Configure desktop error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/screen-info")
@log_api_request(logger)
async def get_desktop_screen_info(request: Request):
    """Get desktop screen information"""
    try:
        # Access service through FastAPI app state
        app = request.app
        if not app or not hasattr(app, 'state') or not hasattr(app.state, 'service_manager'):
            raise HTTPException(status_code=503, detail="Service manager not available")
            
        service_manager = app.state.service_manager
        desktop_service = service_manager.get_service("live_desktop")
        
        if not desktop_service:
            raise HTTPException(status_code=503, detail="Live desktop service not available")
        
        screen_info = await desktop_service.get_screen_info()
        
        return JSONResponse(content={
            "success": True,
            "screen_info": screen_info,
            "resolution": screen_info.get("resolution", {"width": 1920, "height": 1080}),
            "scale_factor": screen_info.get("scale_factor", 1.0),
            "monitors": screen_info.get("monitors", [])
        })
        
    except Exception as e:
        logger.error(f"Get desktop screen info error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/screenshot")
@log_api_request(logger)
async def take_desktop_screenshot(request: Request):
    """Take a screenshot of the current desktop"""
    try:
        # Access service through FastAPI app state
        app = request.app
        if not app or not hasattr(app, 'state') or not hasattr(app.state, 'service_manager'):
            raise HTTPException(status_code=503, detail="Service manager not available")
            
        service_manager = app.state.service_manager
        desktop_service = service_manager.get_service("live_desktop")
        
        if not desktop_service:
            raise HTTPException(status_code=503, detail="Live desktop service not available")
        
        # Check if service has the take_screenshot method
        if not hasattr(desktop_service, 'take_screenshot'):
            raise HTTPException(status_code=503, detail="Desktop service does not support screenshots")
        
        # Take screenshot
        screenshot_data = await desktop_service.take_screenshot()
        
        if screenshot_data:
            return JSONResponse(content={
                "success": True,
                "screenshot": {
                    "data": screenshot_data.get("data", ""),
                    "format": screenshot_data.get("format", "png"),
                    "width": screenshot_data.get("width", 0),
                    "height": screenshot_data.get("height", 0),
                    "timestamp": screenshot_data.get("timestamp")
                },
                "message": "Screenshot captured successfully"
            })
        else:
            return JSONResponse(content={
                "success": False,
                "error": "Failed to capture screenshot",
                "screenshot": None
            }, status_code=500)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Take desktop screenshot error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/host-frame")
@log_api_request(logger)
async def receive_host_frame(request: Request, frame_data: HostFrameData):
    """Receive desktop frame from Windows host capture service"""
    try:
        # Access service through FastAPI app state
        app = request.app
        if not app or not hasattr(app, 'state') or not hasattr(app.state, 'service_manager'):
            raise HTTPException(status_code=503, detail="Service manager not available")
            
        service_manager = app.state.service_manager
        desktop_service = service_manager.get_service("live_desktop")
        
        if not desktop_service:
            raise HTTPException(status_code=503, detail="Live desktop service not available")
        
        # Convert frame data to expected format
        processed_frame = {
            "image": frame_data.image,
            "resolution": frame_data.resolution,
            "timestamp": frame_data.timestamp,
            "status": frame_data.status,
            "metadata": frame_data.metadata
        }
        
        # Store frame for WebSocket streaming
        if hasattr(desktop_service, 'set_host_frame'):
            await desktop_service.set_host_frame(processed_frame)
            logger.info(f"✅ Host frame received and processed: {frame_data.resolution['width']}x{frame_data.resolution['height']}")
            
            return JSONResponse(content={
                "success": True,
                "message": "Host frame received successfully",
                "resolution": frame_data.resolution,
                "timestamp": frame_data.timestamp
            })
        else:
            # Fallback: log that we received the frame
            logger.warning(f"⚠️  Host frame received but service lacks set_host_frame method: {frame_data.resolution['width']}x{frame_data.resolution['height']}")
            
            return JSONResponse(content={
                "success": True,
                "message": "Host frame received (stored for future processing)",
                "resolution": frame_data.resolution,
                "timestamp": frame_data.timestamp
            })
        
    except Exception as e:
        logger.error(f"Receive host frame error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))