# backend/app/services/ocr_service.py
import io
from typing import Dict, Optional
from PIL import Image
import cv2
import numpy as np
from app.core.exceptions import OCRError
from app.core.logging import app_logger

class TesseractOCRService:
    """Tesseract OCR Service"""
    
    def extract_text(
        self,
        image_data: bytes,
        language: Optional[str] = None
    ) -> Dict[str, any]:
        """Extract Text from Image"""
        try:
            # Load image from bytes
            image = Image.open(io.BytesIO(image_data))
            
            # Create OCR service instance
            ocr_service = OCRServiceFactory.create_service(service)
            
            # Extract text
            result = await ocr_service.extract_text(
                image_data=image_data,
                language=language
            )
            
            # Optionally remove bounding boxes
            if not include_bounding_boxes:
                result.pop("bounding_boxes", None)
            
            app_logger.info(
                "OCR text extraction via API",
                service=result.get("service"),
                text_length=len(result.get("text", "")),
                confidence=result.get("confidence")
            )
            
            return result
            
        except OCRError as e:
            app_logger.error("OCR extraction failed", error=str(e))
            raise HTTPException(status_code=422, detail=str(e))
        except Exception as e:
            app_logger.error("Unexpected OCR error", error=str(e))
            raise HTTPException(status_code=500, detail="OCR processing failed")

@router.get("/services")
async def get_ocr_services():
    """Get available OCR services"""
    return OCRServiceFactory.get_available_services()

@router.post("/extract-from-screenshot")
async def extract_text_from_screenshot(
    region: Optional[Dict[str, int]] = None,
    service: Optional[str] = Query(None),
    language: Optional[str] = Query("eng")
):
    """Extract text from screenshot region"""
    try:
        # Take screenshot
        from app.services.desktop_service import DesktopService
        desktop_service = DesktopService()
        
        screenshot_data = await desktop_service.take_screenshot(region=region)
        
        # Perform OCR
        ocr_service = OCRServiceFactory.create_service(service)
        result = await ocr_service.extract_text(
            image_data=screenshot_data["image_data"],
            language=language
        )
        
        return {
            "screenshot": screenshot_data,
            "ocr_result": result
        }
        
    except Exception as e:
        app_logger.error("Screenshot OCR failed", error=str(e))
        raise HTTPException(status_code=500, detail="Screenshot OCR failed")