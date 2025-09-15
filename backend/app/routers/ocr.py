"""
OCR Router for TRAE Backend

Provides endpoints for text extraction and OCR operations.
"""

from typing import Dict, Any
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from ..logging import get_logger, log_api_request
from ..services import get_ocr_service
from ..exceptions import OCRError

logger = get_logger("ocr")

router = APIRouter()

# Request Models
class OCRRequest(BaseModel):
    image_data: str
    region: Dict[str, int]
    language: str = "eng+deu"
    confidence_threshold: float = 0.7

@router.get("/status")
@log_api_request(logger)
async def get_ocr_status(request: Request):
    """Get OCR service status"""
    try:
        ocr_service = get_ocr_service()
        
        # Get status information from the service
        status_info = {
            "available": True,
            "engines": [],
            "initialized": True,
            "healthy": True
        }
        
        if hasattr(ocr_service, 'get_available_engines'):
            status_info["engines"] = ocr_service.get_available_engines()
        elif hasattr(ocr_service, 'engines'):
            status_info["engines"] = list(ocr_service.engines.keys()) if ocr_service.engines else []
        
        if hasattr(ocr_service, 'is_healthy'):
            status_info["healthy"] = ocr_service.is_healthy()
        
        return JSONResponse(content={
            "success": True,
            "status": status_info,
            "service_name": "enhanced_ocr_service"
        })
        
    except Exception as e:
        logger.error(f"OCR status error: {e}", exc_info=True)
        return JSONResponse(content={
            "success": False,
            "status": {
                "available": False,
                "engines": [],
                "initialized": False,
                "healthy": False,
                "error": str(e)
            },
            "service_name": "enhanced_ocr_service"
        })

@router.get("/engines")
@log_api_request(logger)
async def get_ocr_engines(request: Request):
    """Get available OCR engines"""
    try:
        ocr_service = get_ocr_service()
        
        engines = []
        if hasattr(ocr_service, 'get_available_engines'):
            engines = ocr_service.get_available_engines()
        elif hasattr(ocr_service, 'engines'):
            engines = list(ocr_service.engines.keys()) if ocr_service.engines else []
        
        engine_details = []
        for engine_name in engines:
            engine_info = {
                "name": engine_name,
                "available": True,
                "version": "unknown"
            }
            
            if hasattr(ocr_service, 'get_engine_info'):
                info = ocr_service.get_engine_info(engine_name)
                if info:
                    engine_info.update(info)
            
            engine_details.append(engine_info)
        
        return JSONResponse(content={
            "success": True,
            "engines": engine_details,
            "total_count": len(engine_details),
            "default_engine": "tesseract"
        })
        
    except Exception as e:
        logger.error(f"Get OCR engines error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/extract-region")
@log_api_request(logger)
async def extract_ocr_region(request: OCRRequest):
    """Extract text from image region using OCR"""
    try:
        ocr_service = get_ocr_service()
        result = await ocr_service.process_region(
            image_data=request.image_data,
            region=request.region,
            language=request.language,
            confidence_threshold=request.confidence_threshold
        )
        
        return JSONResponse(content={
            "success": True,
            "result": result,
            "processing_info": {
                "language": request.language,
                "confidence_threshold": request.confidence_threshold,
                "region": request.region
            }
        })
        
    except Exception as e:
        logger.error(f"OCR extraction error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/languages")
@log_api_request(logger)
async def get_ocr_languages(request: Request):
    """Get supported OCR languages"""
    try:
        ocr_service = get_ocr_service()
        languages = ocr_service.get_supported_languages()
        
        return JSONResponse(content={
            "success": True,
            "languages": languages,
            "default_language": "eng+deu",
            "total_count": len(languages)
        })
        
    except Exception as e:
        logger.error(f"Get OCR languages error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e)) 