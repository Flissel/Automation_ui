"""
OCR Monitoring Router for TRAE Backend

Provides endpoints for OCR monitoring, text comparison, and webhook notifications.
"""

from typing import Dict, Any
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from ..logging import get_logger, log_api_request
from ..services import get_ocr_monitoring_service
from ..exceptions import OCRError

logger = get_logger("ocr_monitoring")

router = APIRouter()

# Request Models
class OCRMonitoringStartRequest(BaseModel):
    region: Dict[str, Any]  # Contains x, y, width, height, name
    config: Dict[str, Any] = {}

class OCRMonitoringConfigRequest(BaseModel):
    webhook_url: str = None
    monitoring_interval: int = None
    similarity_threshold: float = None
    enabled: bool = None

class OCRRegionTestRequest(BaseModel):
    region: Dict[str, Any]  # Contains x, y, width, height, name

@router.post("/start")
@log_api_request(logger)
async def start_ocr_monitoring(request: OCRMonitoringStartRequest):
    """Start OCR monitoring for a specific region"""
    try:
        monitoring_service = get_ocr_monitoring_service()
        if not monitoring_service:
            raise HTTPException(status_code=503, detail="OCR monitoring service not available")
        
        # Import here to avoid circular imports
        from services.ocr_monitoring_service import OCRRegion
        
        # Create OCR region from request
        region_data = request.region
        region = OCRRegion(
            x=region_data["x"],
            y=region_data["y"],
            width=region_data["width"],
            height=region_data["height"],
            name=region_data.get("name", "monitoring_region")
        )
        
        # Update configuration if provided
        if request.config:
            await monitoring_service.update_config(request.config)
        
        # Start monitoring
        result = await monitoring_service.start_monitoring(region)
        
        return JSONResponse(content={
            "success": True,
            "result": result,
            "message": "OCR monitoring started successfully"
        })
        
    except Exception as e:
        logger.error(f"Start OCR monitoring error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stop")
@log_api_request(logger)
async def stop_ocr_monitoring(request: Request):
    """Stop OCR monitoring"""
    try:
        monitoring_service = get_ocr_monitoring_service()
        await monitoring_service.stop_monitoring()
        
        return JSONResponse(content={
            "success": True,
            "message": "OCR monitoring stopped successfully"
        })
        
    except Exception as e:
        logger.error(f"Stop OCR monitoring error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
@log_api_request(logger)
async def get_ocr_monitoring_status(request: Request):
    """Get OCR monitoring status"""
    try:
        monitoring_service = get_ocr_monitoring_service()
        status = await monitoring_service.get_status()
        
        return JSONResponse(content={
            "success": True,
            "status": status
        })
        
    except Exception as e:
        logger.error(f"Get OCR monitoring status error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/config")
@log_api_request(logger)
async def update_ocr_monitoring_config(request: OCRMonitoringConfigRequest):
    """Update OCR monitoring configuration"""
    try:
        monitoring_service = get_ocr_monitoring_service()
        
        # Build config updates dict
        config_updates = {}
        if request.webhook_url is not None:
            config_updates["webhook_url"] = request.webhook_url
        if request.monitoring_interval is not None:
            config_updates["monitoring_interval"] = request.monitoring_interval
        if request.similarity_threshold is not None:
            config_updates["similarity_threshold"] = request.similarity_threshold
        if request.enabled is not None:
            config_updates["enabled"] = request.enabled
        
        await monitoring_service.update_config(config_updates)
        
        return JSONResponse(content={
            "success": True,
            "message": "OCR monitoring configuration updated successfully",
            "updated_config": config_updates
        })
        
    except Exception as e:
        logger.error(f"Update OCR monitoring config error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/test-region")
@log_api_request(logger)
async def test_ocr_region(request: OCRRegionTestRequest):
    """Test OCR on a specific region without starting monitoring"""
    try:
        monitoring_service = get_ocr_monitoring_service()
        
        # Import here to avoid circular imports
        from services.ocr_monitoring_service import OCRRegion
        
        # Create OCR region from request
        region_data = request.region
        region = OCRRegion(
            x=region_data["x"],
            y=region_data["y"],
            width=region_data["width"],
            height=region_data["height"],
            name=region_data.get("name", "test_region")
        )
        
        result = await monitoring_service.test_ocr_region(region)
        
        return JSONResponse(content={
            "success": True,
            "result": result,
            "message": "OCR region test completed successfully"
        })
        
    except Exception as e:
        logger.error(f"Test OCR region error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/test-webhook")
@log_api_request(logger)
async def test_webhook(request: Request):
    """Test webhook endpoint"""
    try:
        monitoring_service = get_ocr_monitoring_service()
        result = await monitoring_service.test_webhook()
        
        return JSONResponse(content={
            "success": True,
            "result": result,
            "message": "Webhook test completed"
        })
        
    except Exception as e:
        logger.error(f"Test webhook error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/current-text")
@log_api_request(logger)
async def get_current_ocr_text(request: Request):
    """Get current OCR text and monitoring status for Real-time OCR Action Node"""
    try:
        monitoring_service = get_ocr_monitoring_service()
        
        # Get current status and text
        status = await monitoring_service.get_status()
        
        return JSONResponse(content={
            "success": True,
            "data": {
                "current_text": status.get("current_text", ""),
                "text_changed": status.get("text_changed", False),
                "confidence": status.get("confidence", 0.0),
                "region": status.get("region", {}),
                "is_monitoring": status.get("is_monitoring", False),
                "last_update": status.get("last_update", None),
                "monitoring_interval": status.get("monitoring_interval", 5)
            }
        })
        
    except Exception as e:
        logger.error(f"Get current OCR text error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
@log_api_request(logger)
async def get_ocr_monitoring_health(request: Request):
    """Get OCR monitoring service health"""
    try:
        monitoring_service = get_ocr_monitoring_service()
        
        health_status = {
            "healthy": monitoring_service.is_healthy(),
            "initialized": monitoring_service.is_initialized,
            "monitoring": monitoring_service.is_monitoring,
            "dependencies": {
                "ocr_service": monitoring_service.ocr_service.is_healthy() if monitoring_service.ocr_service else False,
                "live_desktop_service": monitoring_service.live_desktop_service.is_healthy() if monitoring_service.live_desktop_service else False,
                "http_session": monitoring_service.session is not None
            }
        }
        
        return JSONResponse(content={
            "success": True,
            "health": health_status
        })
        
    except Exception as e:
        logger.error(f"Get OCR monitoring health error: {e}", exc_info=True)
@router.get("/stats")
@log_api_request(logger)
async def get_ocr_monitoring_stats(request: Request):
    """Get OCR monitoring statistics"""
    try:
        monitoring_service = get_ocr_monitoring_service()
        
        # Get comprehensive stats
        stats = {
            "monitoring_enabled": False,
            "total_scans": 0,
            "successful_scans": 0,
            "failed_scans": 0,
            "text_changes_detected": 0,
            "last_scan_time": None,
            "average_scan_time": 0.0,
            "current_region": None,
            "webhook_calls": 0,
            "webhook_failures": 0,
            "uptime_seconds": 0
        }
        
        if monitoring_service:
            # Get current status
            status = await monitoring_service.get_status()
            
            # Update stats with actual data
            stats.update({
                "monitoring_enabled": status.get("is_monitoring", False),
                "current_region": status.get("region", None),
                "last_scan_time": status.get("last_update", None),
                "uptime_seconds": getattr(monitoring_service, 'uptime_seconds', 0)
            })
            
            # Get statistics if available
            if hasattr(monitoring_service, 'get_statistics'):
                service_stats = await monitoring_service.get_statistics()
                stats.update(service_stats)
            elif hasattr(monitoring_service, 'stats'):
                # If service has a stats attribute
                service_stats = getattr(monitoring_service, 'stats', {})
                stats.update(service_stats)
        
        return JSONResponse(content={
            "success": True,
            "stats": stats,
            "service_available": monitoring_service is not None
        })
        
    except Exception as e:
        logger.error(f"Get OCR monitoring stats error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
        raise HTTPException(status_code=500, detail=str(e))