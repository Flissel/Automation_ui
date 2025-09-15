"""
Automation Router for TRAE Backend

Provides endpoints for click automation and mouse operations.
"""

from typing import Dict
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from ..logging import get_logger, log_api_request
from ..services import get_click_automation_service

logger = get_logger("automation")

router = APIRouter()

class ClickRequest(BaseModel):
    x: float
    y: float
    button: str = "left"
    click_type: str = "single"
    delay: float = 0.1

@router.get("/status")
@log_api_request(logger)
async def get_automation_status(request: Request):
    """Get automation service status"""
    try:
        click_service = get_click_automation_service()
        
        status_info = {
            "available": click_service is not None,
            "healthy": True,
            "initialized": True,
            "screen_size": {"width": 0, "height": 0},
            "capabilities": []
        }
        
        if click_service:
            if hasattr(click_service, 'is_healthy'):
                status_info["healthy"] = click_service.is_healthy()
            
            if hasattr(click_service, 'get_screen_size'):
                screen_size = click_service.get_screen_size()
                if screen_size:
                    status_info["screen_size"] = screen_size
            
            # Get capabilities
            status_info["capabilities"] = [
                "click", "double_click", "right_click",
                "mouse_move", "scroll", "key_press"
            ]
        else:
            status_info["healthy"] = False
            status_info["initialized"] = False
        
        return JSONResponse(content={
            "success": True,
            "status": status_info,
            "service_name": "click_automation_service"
        })
        
    except Exception as e:
        logger.error(f"Automation status error: {e}", exc_info=True)
        return JSONResponse(content={
            "success": False,
            "status": {
                "available": False,
                "healthy": False,
                "initialized": False,
                "error": str(e)
            },
            "service_name": "click_automation_service"
        })

@router.get("/capabilities")
@log_api_request(logger)
async def get_automation_capabilities(request: Request):
    """Get automation capabilities"""
    try:
        click_service = get_click_automation_service()
        
        capabilities = {
            "mouse_actions": [
                {"name": "click", "description": "Perform single click"},
                {"name": "double_click", "description": "Perform double click"},
                {"name": "right_click", "description": "Perform right click"},
                {"name": "middle_click", "description": "Perform middle click"},
                {"name": "mouse_move", "description": "Move mouse cursor"},
                {"name": "scroll", "description": "Scroll mouse wheel"}
            ],
            "keyboard_actions": [
                {"name": "key_press", "description": "Press single key"},
                {"name": "key_combination", "description": "Press key combination"},
                {"name": "type_text", "description": "Type text string"}
            ],
            "supported_buttons": ["left", "right", "middle"],
            "click_types": ["single", "double"],
            "available": click_service is not None
        }
        
        if click_service and hasattr(click_service, 'get_screen_size'):
            screen_size = click_service.get_screen_size()
            if screen_size:
                capabilities["screen_resolution"] = screen_size
        
        return JSONResponse(content={
            "success": True,
            "capabilities": capabilities,
            "service_available": click_service is not None
        })
        
    except Exception as e:
        logger.error(f"Get automation capabilities error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/click")
@log_api_request(logger)
async def execute_click(request: ClickRequest):
    """Execute automated click"""
    try:
        click_service = get_click_automation_service()
        
        # 🎯 Better error handling for missing service
        if click_service is None:
            logger.error("Click automation service not available - service not initialized")
            raise HTTPException(
                status_code=503, 
                detail="Click automation service not available. Please check service initialization."
            )
        
        # 🎯 Initialize service if not already initialized
        if not click_service.initialized:
            logger.info("Initializing click automation service...")
            await click_service.initialize()
        
        # 🎯 Check if service is healthy
        if hasattr(click_service, 'is_healthy') and not click_service.is_healthy():
            logger.error("Click automation service is not healthy")
            raise HTTPException(
                status_code=503,
                detail="Click automation service is not healthy. Please check system dependencies."
            )
        
        result = await click_service.perform_click(
            x=request.x,
            y=request.y,
            button=request.button,
            click_type=request.click_type,
            delay=request.delay
        )
        
        return JSONResponse(content={
            "success": result.get("success", False),
            "clicked": result.get("clicked", False),
            "coordinates": result.get("coordinates", {}),
            "execution_time": result.get("execution_time", 0),
            "error": result.get("error")
        })
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Click automation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))