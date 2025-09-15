#!/usr/bin/env python3
"""
Tests for OCR Service
Tests text recognition capabilities and image processing
"""

import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
import numpy as np
from PIL import Image
import io
import base64

# Import the service
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.ocr_service import OCRService

class TestOCRService:
    """Test the OCRService class"""
    
    @pytest.fixture
    def service(self):
        """Create an OCRService instance for testing"""
        return OCRService()
    
    @pytest.fixture
    def sample_image_base64(self):
        """Create a sample image as base64 for testing"""
        # Create a simple white image with black text
        img = Image.new('RGB', (200, 100), color='white')
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        img_data = buffer.getvalue()
        return base64.b64encode(img_data).decode('utf-8')
    
    @pytest.fixture
    def sample_region(self):
        """Sample region coordinates"""
        return {"x": 10, "y": 10, "width": 180, "height": 80}
    
    def test_service_initialization(self, service):
        """Test service initialization"""
        assert service.supported_languages is not None
        assert len(service.supported_languages) > 0
        assert "eng" in service.supported_languages
        assert "deu" in service.supported_languages
        assert service.confidence_threshold == 0.5
    
    def test_is_healthy_without_tesseract(self, service):
        """Test health check without tesseract installed"""
        with patch('pytesseract.get_tesseract_version', side_effect=Exception("Tesseract not found")):
            assert service.is_healthy() is False
    
    def test_is_healthy_with_tesseract(self, service):
        """Test health check with tesseract installed"""
        with patch('pytesseract.get_tesseract_version', return_value="5.0.0"):
            assert service.is_healthy() is True
    
    def test_get_supported_languages(self, service):
        """Test getting supported languages"""
        languages = service.get_supported_languages()
        
        assert isinstance(languages, list)
        assert len(languages) > 0
        assert "eng" in languages
        assert "deu" in languages
        assert "fra" in languages
        assert "spa" in languages
    
    def test_decode_base64_image_valid(self, service, sample_image_base64):
        """Test decoding valid base64 image"""
        with_prefix = f"data:image/png;base64,{sample_image_base64}"
        
        img1 = service._decode_base64_image(sample_image_base64)
        img2 = service._decode_base64_image(with_prefix)
        
        assert isinstance(img1, Image.Image)
        assert isinstance(img2, Image.Image)
        assert img1.size == img2.size
    
    def test_decode_base64_image_invalid(self, service):
        """Test decoding invalid base64 image"""
        invalid_base64 = "invalid_base64_data"
        
        with pytest.raises(ValueError, match="Invalid base64 image data"):
            service._decode_base64_image(invalid_base64)
    
    def test_preprocess_image(self, service):
        """Test image preprocessing"""
        # Create a test image
        img = Image.new('RGB', (200, 100), color='white')
        
        processed = service._preprocess_image(img)
        
        assert isinstance(processed, Image.Image)
        # Processed image should be grayscale
        assert processed.mode in ['L', 'P']
    
    def test_extract_region_from_image(self, service):
        """Test extracting region from image"""
        # Create a test image
        img = Image.new('RGB', (200, 100), color='white')
        region = {"x": 10, "y": 10, "width": 100, "height": 50}
        
        cropped = service._extract_region_from_image(img, region)
        
        assert isinstance(cropped, Image.Image)
        assert cropped.size == (100, 50)
    
    def test_extract_region_out_of_bounds(self, service):
        """Test extracting region that's out of image bounds"""
        img = Image.new('RGB', (200, 100), color='white')
        region = {"x": 150, "y": 50, "width": 100, "height": 80}  # Extends beyond image
        
        cropped = service._extract_region_from_image(img, region)
        
        assert isinstance(cropped, Image.Image)
        # Should be clipped to image bounds
        assert cropped.size[0] <= 50  # Remaining width
        assert cropped.size[1] <= 50  # Remaining height
    
    @pytest.mark.asyncio
    async def test_extract_text_from_region_success(self, service, sample_image_base64, sample_region):
        """Test successful text extraction from region"""
        with patch('pytesseract.image_to_data') as mock_ocr:
            mock_ocr.return_value = {
                'text': ['', 'Sample', 'Text', ''],
                'conf': ['-1', '85', '90', '-1']
            }
            
            result = await service.extract_text_from_region(
                sample_image_base64, 
                sample_region,
                language="eng",
                confidence_threshold=0.8
            )
            
            assert result["text"] == "Sample Text"
            assert result["confidence"] == 87.5  # Average of 85 and 90
            assert result["language"] == "eng"
            assert result["region"] == sample_region
    
    @pytest.mark.asyncio
    async def test_extract_text_from_region_low_confidence(self, service, sample_image_base64, sample_region):
        """Test text extraction with low confidence"""
        with patch('pytesseract.image_to_data') as mock_ocr:
            mock_ocr.return_value = {
                'text': ['', 'Sample', 'Text', ''],
                'conf': ['-1', '40', '50', '-1']  # Low confidence
            }
            
            result = await service.extract_text_from_region(
                sample_image_base64,
                sample_region,
                confidence_threshold=0.8
            )
            
            assert result["text"] == ""  # Should be empty due to low confidence
            assert result["confidence"] == 45.0
            assert result["filtered_by_confidence"] is True
    
    @pytest.mark.asyncio
    async def test_extract_text_from_region_multiple_languages(self, service, sample_image_base64, sample_region):
        """Test text extraction with multiple languages"""
        with patch('pytesseract.image_to_data') as mock_ocr:
            mock_ocr.return_value = {
                'text': ['', 'Guten', 'Tag', 'Hello', ''],
                'conf': ['-1', '85', '88', '92', '-1']
            }
            
            result = await service.extract_text_from_region(
                sample_image_base64,
                sample_region,
                language="eng+deu"
            )
            
            assert result["text"] == "Guten Tag Hello"
            assert result["language"] == "eng+deu"
            assert result["confidence"] > 80
    
    @pytest.mark.asyncio
    async def test_extract_text_from_region_error(self, service, sample_image_base64, sample_region):
        """Test error handling in text extraction"""
        with patch('pytesseract.image_to_data', side_effect=Exception("OCR failed")):
            with pytest.raises(Exception, match="OCR failed"):
                await service.extract_text_from_region(
                    sample_image_base64,
                    sample_region
                )
    
    @pytest.mark.asyncio
    async def test_process_region_success(self, service, sample_image_base64, sample_region):
        """Test process_region method"""
        with patch('pytesseract.image_to_data') as mock_ocr:
            mock_ocr.return_value = {
                'text': ['', 'Test', 'Processing', ''],
                'conf': ['-1', '90', '85', '-1']
            }
            
            result = await service.process_region(
                sample_image_base64,
                sample_region,
                language="eng",
                confidence_threshold=0.7
            )
            
            assert result["text"] == "Test Processing"
            assert result["confidence"] == 87.5
            assert result["bounding_box"] == sample_region
    
    @pytest.mark.asyncio
    async def test_test_region_from_screen(self, service, sample_region):
        """Test testing region from current screen"""
        with patch('pyautogui.screenshot') as mock_screenshot, \
             patch('pytesseract.image_to_data') as mock_ocr:
            
            # Mock screenshot
            mock_img = Image.new('RGB', (1920, 1080), color='white')
            mock_screenshot.return_value = mock_img
            
            # Mock OCR
            mock_ocr.return_value = {
                'text': ['', 'Screen', 'Text', ''],
                'conf': ['-1', '95', '88', '-1']
            }
            
            result = await service.test_region(
                sample_region["x"],
                sample_region["y"],
                sample_region["width"],
                sample_region["height"],
                language="eng"
            )
            
            assert result["text"] == "Screen Text"
            assert result["confidence"] == 91.5
            assert "metadata" in result
    
    @pytest.mark.asyncio
    async def test_test_region_screenshot_error(self, service, sample_region):
        """Test test_region with screenshot error"""
        with patch('pyautogui.screenshot', side_effect=Exception("Screenshot failed")):
            with pytest.raises(Exception, match="Screenshot failed"):
                await service.test_region(
                    sample_region["x"],
                    sample_region["y"],
                    sample_region["width"],
                    sample_region["height"]
                )
    
    def test_validate_language_valid(self, service):
        """Test validating valid language codes"""
        assert service._validate_language("eng") is True
        assert service._validate_language("eng+deu") is True
        assert service._validate_language("eng+deu+fra") is True
    
    def test_validate_language_invalid(self, service):
        """Test validating invalid language codes"""
        assert service._validate_language("invalid") is False
        assert service._validate_language("eng+invalid") is False
        assert service._validate_language("") is False
    
    def test_filter_text_by_confidence(self, service):
        """Test filtering text by confidence threshold"""
        words = ["Hello", "World", "Test"]
        confidences = [95, 45, 80]  # One below threshold
        
        filtered = service._filter_text_by_confidence(words, confidences, 0.7)
        
        assert filtered == "Hello Test"  # "World" filtered out due to low confidence
    
    def test_filter_text_all_below_threshold(self, service):
        """Test filtering when all text is below confidence threshold"""
        words = ["Hello", "World", "Test"]
        confidences = [45, 30, 55]  # All below threshold
        
        filtered = service._filter_text_by_confidence(words, confidences, 0.7)
        
        assert filtered == ""
    
    def test_calculate_average_confidence(self, service):
        """Test calculating average confidence"""
        confidences = [85, 90, 75, 95]
        
        avg = service._calculate_average_confidence(confidences)
        
        assert avg == 86.25
    
    def test_calculate_average_confidence_empty(self, service):
        """Test calculating average confidence with empty list"""
        avg = service._calculate_average_confidence([])
        
        assert avg == 0.0
    
    @pytest.mark.asyncio
    async def test_batch_process_regions(self, service, sample_image_base64):
        """Test batch processing multiple regions"""
        regions = [
            {"x": 10, "y": 10, "width": 100, "height": 50, "id": "region1"},
            {"x": 120, "y": 10, "width": 100, "height": 50, "id": "region2"}
        ]
        
        with patch('pytesseract.image_to_data') as mock_ocr:
            mock_ocr.side_effect = [
                {'text': ['', 'Text1', ''], 'conf': ['-1', '90', '-1']},
                {'text': ['', 'Text2', ''], 'conf': ['-1', '85', '-1']}
            ]
            
            results = []
            for region in regions:
                result = await service.extract_text_from_region(
                    sample_image_base64,
                    region
                )
                results.append(result)
            
            assert len(results) == 2
            assert results[0]["text"] == "Text1"
            assert results[1]["text"] == "Text2"
    
    def test_performance_monitoring(self, service):
        """Test that service tracks performance metrics"""
        # This would test internal performance tracking if implemented
        assert hasattr(service, 'supported_languages')
        assert hasattr(service, 'confidence_threshold')
    
    @pytest.mark.asyncio
    async def test_concurrent_ocr_requests(self, service, sample_image_base64, sample_region):
        """Test multiple concurrent OCR requests"""
        with patch('pytesseract.image_to_data') as mock_ocr:
            mock_ocr.return_value = {
                'text': ['', 'Concurrent', 'Test', ''],
                'conf': ['-1', '90', '85', '-1']
            }
            
            # Start multiple concurrent OCR requests
            tasks = []
            for i in range(3):
                task = service.extract_text_from_region(
                    sample_image_base64,
                    sample_region,
                    language="eng"
                )
                tasks.append(task)
            
            results = await asyncio.gather(*tasks)
            
            assert len(results) == 3
            for result in results:
                assert result["text"] == "Concurrent Test"
                assert result["confidence"] == 87.5

if __name__ == "__main__":
    pytest.main([__file__]) 