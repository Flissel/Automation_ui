#!/usr/bin/env python3
"""
Comprehensive Tests for Enhanced OCR Service
Provides thorough testing with fixtures, mocks, and performance validation
"""

import pytest
import asyncio
import base64
import io
import time
from unittest.mock import Mock, patch, AsyncMock, MagicMock
from datetime import datetime, timedelta
from PIL import Image, ImageDraw, ImageFont
import numpy as np

# Import the enhanced service
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from services.enhanced_ocr_service import EnhancedOCRService, OCRCache, OCRMetrics
    from app.ocr_config import OCRServiceConfig, OCREngine, PreprocessingMode, PSMMode
except ImportError:
    # Fallback for testing
    from enhanced_ocr_service import EnhancedOCRService, OCRCache, OCRMetrics
    from ocr_config import OCRServiceConfig, OCREngine, PreprocessingMode, PSMMode

class TestDataManager:
    """Manages test data creation and validation"""
    
    @staticmethod
    def create_test_image(width: int = 200, height: int = 100, 
                         text: str = "Test Text", background_color: str = "white",
                         text_color: str = "black") -> Image.Image:
        """Create a test image with specified text"""
        img = Image.new('RGB', (width, height), color=background_color)
        draw = ImageDraw.Draw(img)
        
        # Try to use a default font, fallback to basic if not available
        try:
            font = ImageFont.load_default()
        except:
            font = None
        
        # Calculate text position (centered)
        if font:
            bbox = draw.textbbox((0, 0), text, font=font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
        else:
            # Rough estimation for default font
            text_width = len(text) * 6
            text_height = 11
        
        x = (width - text_width) // 2
        y = (height - text_height) // 2
        
        draw.text((x, y), text, fill=text_color, font=font)
        return img
    
    @staticmethod
    def image_to_base64(img: Image.Image, format: str = 'PNG') -> str:
        """Convert PIL image to base64 string"""
        buffer = io.BytesIO()
        img.save(buffer, format=format)
        return base64.b64encode(buffer.getvalue()).decode('utf-8')
    
    @staticmethod
    def create_test_regions() -> list:
        """Create various test regions for testing"""
        return [
            {"x": 0, "y": 0, "width": 200, "height": 100, "name": "full_image"},
            {"x": 50, "y": 25, "width": 100, "height": 50, "name": "center_region"},
            {"x": 0, "y": 0, "width": 100, "height": 50, "name": "top_left"},
            {"x": 100, "y": 50, "width": 100, "height": 50, "name": "bottom_right"},
            {"x": 180, "y": 80, "width": 50, "height": 30, "name": "edge_region"},
        ]
    
    @staticmethod
    def create_multilingual_test_data() -> dict:
        """Create test data for multiple languages"""
        return {
            "eng": "Hello World",
            "deu": "Hallo Welt",
            "fra": "Bonjour Monde",
            "spa": "Hola Mundo",
            "ita": "Ciao Mondo",
        }

class TestOCRCache:
    """Test OCR caching functionality"""
    
    @pytest.fixture
    def cache(self):
        """Create OCR cache instance"""
        return OCRCache(max_size=10, ttl_seconds=60)
    
    @pytest.fixture
    def sample_data(self):
        """Sample data for cache testing"""
        return {
            "image_hash": "test_hash_123",
            "region": {"x": 0, "y": 0, "width": 100, "height": 50},
            "language": "eng",
            "confidence_threshold": 0.7,
            "result": {
                "text": "Test Result",
                "confidence": 0.85,
                "timestamp": datetime.now().isoformat()
            }
        }
    
    def test_cache_set_and_get(self, cache, sample_data):
        """Test basic cache set and get operations"""
        # Set cache entry
        cache.set(
            sample_data["image_hash"],
            sample_data["region"],
            sample_data["language"],
            sample_data["confidence_threshold"],
            sample_data["result"]
        )
        
        # Get cache entry
        result = cache.get(
            sample_data["image_hash"],
            sample_data["region"],
            sample_data["language"],
            sample_data["confidence_threshold"]
        )
        
        assert result is not None
        assert result["text"] == sample_data["result"]["text"]
        assert result["confidence"] == sample_data["result"]["confidence"]
    
    def test_cache_miss(self, cache):
        """Test cache miss scenario"""
        result = cache.get("nonexistent", {"x": 0, "y": 0, "width": 10, "height": 10}, "eng", 0.7)
        assert result is None
    
    def test_cache_expiration(self, sample_data):
        """Test cache entry expiration"""
        cache = OCRCache(max_size=10, ttl_seconds=1)  # 1 second TTL
        
        # Set cache entry
        cache.set(
            sample_data["image_hash"],
            sample_data["region"],
            sample_data["language"],
            sample_data["confidence_threshold"],
            sample_data["result"]
        )
        
        # Should be available immediately
        result = cache.get(
            sample_data["image_hash"],
            sample_data["region"],
            sample_data["language"],
            sample_data["confidence_threshold"]
        )
        assert result is not None
        
        # Wait for expiration
        time.sleep(1.1)
        
        # Should be expired now
        result = cache.get(
            sample_data["image_hash"],
            sample_data["region"],
            sample_data["language"],
            sample_data["confidence_threshold"]
        )
        assert result is None
    
    def test_cache_size_limit(self, cache):
        """Test cache size limitation and LRU eviction"""
        # Fill cache beyond capacity
        for i in range(15):  # Cache max_size is 10
            cache.set(
                f"hash_{i}",
                {"x": i, "y": i, "width": 10, "height": 10},
                "eng",
                0.7,
                {"text": f"Result {i}", "confidence": 0.8}
            )
        
        stats = cache.get_stats()
        assert stats["total_entries"] <= 10  # Should not exceed max_size
    
    def test_cache_stats(self, cache, sample_data):
        """Test cache statistics"""
        # Initially empty
        stats = cache.get_stats()
        assert stats["total_entries"] == 0
        assert stats["active_entries"] == 0
        
        # Add entry
        cache.set(
            sample_data["image_hash"],
            sample_data["region"],
            sample_data["language"],
            sample_data["confidence_threshold"],
            sample_data["result"]
        )
        
        stats = cache.get_stats()
        assert stats["total_entries"] == 1
        assert stats["active_entries"] == 1

class TestOCRMetrics:
    """Test OCR metrics functionality"""
    
    @pytest.fixture
    def metrics(self):
        """Create OCR metrics instance"""
        return OCRMetrics()
    
    def test_metrics_initialization(self, metrics):
        """Test metrics initialization"""
        assert metrics.total_requests == 0
        assert metrics.successful_requests == 0
        assert metrics.failed_requests == 0
        assert metrics.cache_hits == 0
        assert metrics.cache_misses == 0
        assert metrics.average_processing_time == 0.0
        assert metrics.last_request_time is None
    
    def test_metrics_update_successful_request(self, metrics):
        """Test updating metrics for successful request"""
        processing_time = 1.5
        metrics.update_request(processing_time, success=True, cache_hit=False)
        
        assert metrics.total_requests == 1
        assert metrics.successful_requests == 1
        assert metrics.failed_requests == 0
        assert metrics.cache_hits == 0
        assert metrics.cache_misses == 1
        assert metrics.average_processing_time == processing_time
        assert metrics.last_request_time is not None
    
    def test_metrics_update_failed_request(self, metrics):
        """Test updating metrics for failed request"""
        processing_time = 0.5
        metrics.update_request(processing_time, success=False, cache_hit=False)
        
        assert metrics.total_requests == 1
        assert metrics.successful_requests == 0
        assert metrics.failed_requests == 1
        assert metrics.cache_misses == 1
    
    def test_metrics_average_calculation(self, metrics):
        """Test average processing time calculation"""
        metrics.update_request(1.0, success=True)
        metrics.update_request(2.0, success=True)
        metrics.update_request(3.0, success=True)
        
        assert metrics.total_requests == 3
        assert metrics.average_processing_time == 2.0
    
    def test_metrics_cache_hit_tracking(self, metrics):
        """Test cache hit/miss tracking"""
        metrics.update_request(1.0, success=True, cache_hit=True)
        metrics.update_request(1.5, success=True, cache_hit=False)
        metrics.update_request(0.8, success=True, cache_hit=True)
        
        assert metrics.cache_hits == 2
        assert metrics.cache_misses == 1

class TestEnhancedOCRService:
    """Test Enhanced OCR Service functionality"""
    
    @pytest.fixture
    def test_config(self):
        """Create test configuration"""
        return OCRServiceConfig(
            engine=OCREngine.TESSERACT,
            default_language="eng",
            confidence_threshold=0.7,
            cache_enabled=True,
            cache_ttl=300,
            max_concurrent_requests=3,
            preprocessing_mode=PreprocessingMode.ADAPTIVE_THRESHOLD,
            psm_mode=PSMMode.SINGLE_BLOCK
        )
    
    @pytest.fixture
    def service(self, test_config):
        """Create Enhanced OCR Service instance"""
        return EnhancedOCRService(config=test_config)
    
    @pytest.fixture
    def test_data_manager(self):
        """Create test data manager"""
        return TestDataManager()
    
    def test_service_initialization(self, service, test_config):
        """Test service initialization"""
        assert service.config == test_config
        assert service.cache is not None  # Cache should be enabled
        assert service.executor is not None
        assert service.semaphore._value == test_config.max_concurrent_requests
    
    def test_service_without_cache(self):
        """Test service initialization without cache"""
        config = OCRServiceConfig(cache_enabled=False)
        service = EnhancedOCRService(config=config)
        assert service.cache is None
    
    @pytest.mark.asyncio
    async def test_service_initialization_async(self, service):
        """Test async service initialization"""
        with patch('services.enhanced_ocr_service._load_ocr_dependencies', return_value=True):
            with patch('services.enhanced_ocr_service._pytesseract') as mock_tesseract:
                mock_tesseract.get_tesseract_version.return_value = "5.0.0"
                
                await service.initialize()
                assert service.is_initialized
                assert service.is_healthy()
    
    @pytest.mark.asyncio
    async def test_service_initialization_failure(self, service):
        """Test service initialization failure"""
        with patch('services.enhanced_ocr_service._load_ocr_dependencies', return_value=False):
            with pytest.raises(RuntimeError, match="OCR dependencies not available"):
                await service.initialize()
    
    def test_image_hash_calculation(self, service):
        """Test image hash calculation"""
        test_data = b"test image data"
        hash1 = service._calculate_image_hash(test_data)
        hash2 = service._calculate_image_hash(test_data)
        hash3 = service._calculate_image_hash(b"different data")
        
        assert hash1 == hash2  # Same data should produce same hash
        assert hash1 != hash3  # Different data should produce different hash
        assert len(hash1) == 32  # MD5 hash length
    
    @pytest.mark.asyncio
    async def test_decode_image_data_valid(self, service, test_data_manager):
        """Test decoding valid image data"""
        img = test_data_manager.create_test_image()
        base64_data = test_data_manager.image_to_base64(img)
        
        # Test without data URL prefix
        decoded = await service._decode_image_data(base64_data)
        assert isinstance(decoded, bytes)
        assert len(decoded) > 0
        
        # Test with data URL prefix
        prefixed_data = f"data:image/png;base64,{base64_data}"
        decoded_prefixed = await service._decode_image_data(prefixed_data)
        assert decoded == decoded_prefixed
    
    @pytest.mark.asyncio
    async def test_decode_image_data_invalid(self, service):
        """Test decoding invalid image data"""
        with pytest.raises(ValueError, match="Invalid image data"):
            await service._decode_image_data("invalid_base64_data")
    
    @pytest.mark.asyncio
    async def test_process_region_unhealthy_service(self, service, test_data_manager):
        """Test processing when service is not healthy"""
        # Service not initialized
        img = test_data_manager.create_test_image()
        base64_data = test_data_manager.image_to_base64(img)
        region = {"x": 0, "y": 0, "width": 200, "height": 100}
        
        result = await service.process_region(base64_data, region)
        
        assert result["text"] == ""
        assert result["confidence"] == 0.0
        assert "error" in result
        assert "Service not initialized" in result["metadata"]["error"]
    
    @pytest.mark.asyncio
    async def test_process_region_with_cache(self, service, test_data_manager):
        """Test OCR processing with caching"""
        # Mock dependencies
        with patch('services.enhanced_ocr_service._load_ocr_dependencies', return_value=True):
            with patch('services.enhanced_ocr_service._pytesseract') as mock_tesseract:
                mock_tesseract.get_tesseract_version.return_value = "5.0.0"
                mock_tesseract.image_to_data.return_value = {
                    'text': ['', 'Test', 'Text', ''],
                    'conf': ['-1', '85', '90', '-1']
                }
                
                await service.initialize()
                
                img = test_data_manager.create_test_image(text="Test Text")
                base64_data = test_data_manager.image_to_base64(img)
                region = {"x": 0, "y": 0, "width": 200, "height": 100}
                
                # First request - should process and cache
                result1 = await service.process_region(base64_data, region)
                assert result1["text"] == "Test Text"
                assert result1["confidence"] > 0.8
                assert not result1["metadata"].get("cache_hit", False)
                
                # Second request - should hit cache
                result2 = await service.process_region(base64_data, region)
                assert result2["text"] == "Test Text"
                assert result2["metadata"]["cache_hit"]
                
                # Verify metrics
                metrics = service.get_metrics()
                assert metrics["total_requests"] == 2
                assert metrics["cache_hits"] == 1
                assert metrics["cache_misses"] == 1
    
    @pytest.mark.asyncio
    async def test_process_region_different_languages(self, service, test_data_manager):
        """Test OCR processing with different languages"""
        multilingual_data = test_data_manager.create_multilingual_test_data()
        
        with patch('services.enhanced_ocr_service._load_ocr_dependencies', return_value=True):
            with patch('services.enhanced_ocr_service._pytesseract') as mock_tesseract:
                mock_tesseract.get_tesseract_version.return_value = "5.0.0"
                
                await service.initialize()
                
                for lang, text in multilingual_data.items():
                    if lang in service.get_supported_languages():
                        # Mock OCR response for each language
                        mock_tesseract.image_to_data.return_value = {
                            'text': ['', text.split()[0], text.split()[1], ''],
                            'conf': ['-1', '85', '90', '-1']
                        }
                        
                        img = test_data_manager.create_test_image(text=text)
                        base64_data = test_data_manager.image_to_base64(img)
                        region = {"x": 0, "y": 0, "width": 200, "height": 100}
                        
                        result = await service.process_region(base64_data, region, language=lang)
                        assert result["language"] == lang
                        assert result["text"] == text
    
    @pytest.mark.asyncio
    async def test_test_region_screenshot(self, service):
        """Test screenshot-based region testing"""
        with patch('services.enhanced_ocr_service._pyautogui') as mock_pyautogui:
            # Create mock screenshot
            mock_img = TestDataManager.create_test_image(text="Screenshot Test")
            mock_pyautogui.screenshot.return_value = mock_img
            mock_pyautogui.size.return_value = Mock(width=1920, height=1080)
            
            with patch('services.enhanced_ocr_service._load_ocr_dependencies', return_value=True):
                with patch('services.enhanced_ocr_service._pytesseract') as mock_tesseract:
                    mock_tesseract.get_tesseract_version.return_value = "5.0.0"
                    mock_tesseract.image_to_data.return_value = {
                        'text': ['', 'Screenshot', 'Test', ''],
                        'conf': ['-1', '85', '90', '-1']
                    }
                    
                    await service.initialize()
                    
                    result = await service.test_region(100, 100, 200, 100)
                    
                    assert result["text"] == "Screenshot Test"
                    assert "screenshot_region" in result["metadata"]
                    assert "screen_size" in result["metadata"]
                    assert result["metadata"]["pyautogui_available"]
    
    @pytest.mark.asyncio
    async def test_concurrent_requests(self, service, test_data_manager):
        """Test concurrent OCR requests"""
        with patch('services.enhanced_ocr_service._load_ocr_dependencies', return_value=True):
            with patch('services.enhanced_ocr_service._pytesseract') as mock_tesseract:
                mock_tesseract.get_tesseract_version.return_value = "5.0.0"
                mock_tesseract.image_to_data.return_value = {
                    'text': ['', 'Concurrent', 'Test', ''],
                    'conf': ['-1', '85', '90', '-1']
                }
                
                await service.initialize()
                
                # Create multiple concurrent requests
                tasks = []
                for i in range(5):
                    img = test_data_manager.create_test_image(text=f"Test {i}")
                    base64_data = test_data_manager.image_to_base64(img)
                    region = {"x": 0, "y": 0, "width": 200, "height": 100}
                    
                    task = service.process_region(base64_data, region)
                    tasks.append(task)
                
                # Wait for all tasks to complete
                results = await asyncio.gather(*tasks)
                
                # Verify all requests completed successfully
                assert len(results) == 5
                for result in results:
                    assert result["text"] == "Concurrent Test"
                    assert result["confidence"] > 0.8
                
                # Check metrics
                metrics = service.get_metrics()
                assert metrics["total_requests"] == 5
                assert metrics["successful_requests"] == 5
    
    def test_get_supported_languages(self, service):
        """Test getting supported languages"""
        languages = service.get_supported_languages()
        assert isinstance(languages, list)
        assert "eng" in languages
        assert "deu" in languages
    
    def test_validate_language(self, service):
        """Test language validation"""
        assert service.validate_language("eng")
        assert service.validate_language("deu")
        assert not service.validate_language("invalid_lang")
    
    @pytest.mark.asyncio
    async def test_get_service_info(self, service):
        """Test getting comprehensive service information"""
        info = await service.get_service_info()
        
        assert info["service_name"] == "Enhanced OCR Service"
        assert "version" in info
        assert "initialized" in info
        assert "healthy" in info
        assert "supported_languages" in info
        assert "configuration" in info
        assert "metrics" in info
        assert "timestamp" in info
    
    @pytest.mark.asyncio
    async def test_cleanup(self, service):
        """Test service cleanup"""
        await service.cleanup()
        
        # Verify cache is cleared if it exists
        if service.cache:
            stats = service.cache.get_stats()
            assert stats["total_entries"] == 0
    
    def test_preprocessing_modes(self, service):
        """Test different image preprocessing modes"""
        # Create test image
        test_img = np.ones((100, 200, 3), dtype=np.uint8) * 255
        
        # Test each preprocessing mode
        for mode in PreprocessingMode:
            service.config.preprocessing_mode = mode
            
            with patch('services.enhanced_ocr_service._cv2') as mock_cv2:
                mock_cv2.cvtColor.return_value = np.ones((100, 200), dtype=np.uint8) * 255
                mock_cv2.adaptiveThreshold.return_value = np.ones((100, 200), dtype=np.uint8) * 255
                mock_cv2.GaussianBlur.return_value = np.ones((100, 200), dtype=np.uint8) * 255
                mock_cv2.threshold.return_value = (0, np.ones((100, 200), dtype=np.uint8) * 255)
                mock_cv2.morphologyEx.return_value = np.ones((100, 200), dtype=np.uint8) * 255
                mock_cv2.medianBlur.return_value = np.ones((100, 200), dtype=np.uint8) * 255
                
                with patch('services.enhanced_ocr_service._np') as mock_np:
                    mock_np.ones.return_value = np.ones((2, 2), dtype=np.uint8)
                    
                    result = service._preprocess_image(test_img)
                    assert result is not None

@pytest.mark.performance
class TestPerformance:
    """Performance tests for OCR service"""
    
    @pytest.mark.asyncio
    async def test_processing_time_benchmark(self):
        """Benchmark OCR processing time"""
        config = OCRServiceConfig(cache_enabled=False)  # Disable cache for pure processing time
        service = EnhancedOCRService(config=config)
        
        with patch('services.enhanced_ocr_service._load_ocr_dependencies', return_value=True):
            with patch('services.enhanced_ocr_service._pytesseract') as mock_tesseract:
                mock_tesseract.get_tesseract_version.return_value = "5.0.0"
                mock_tesseract.image_to_data.return_value = {
                    'text': ['', 'Performance', 'Test', ''],
                    'conf': ['-1', '85', '90', '-1']
                }
                
                await service.initialize()
                
                # Create test image
                img = TestDataManager.create_test_image(text="Performance Test")
                base64_data = TestDataManager.image_to_base64(img)
                region = {"x": 0, "y": 0, "width": 200, "height": 100}
                
                # Measure processing time
                start_time = time.time()
                result = await service.process_region(base64_data, region)
                end_time = time.time()
                
                processing_time = end_time - start_time
                
                # Verify result and performance
                assert result["text"] == "Performance Test"
                assert processing_time < 5.0  # Should complete within 5 seconds
                assert result["processing_time"] > 0
    
    @pytest.mark.asyncio
    async def test_cache_performance(self):
        """Test cache performance improvement"""
        service = EnhancedOCRService()  # Cache enabled by default
        
        with patch('services.enhanced_ocr_service._load_ocr_dependencies', return_value=True):
            with patch('services.enhanced_ocr_service._pytesseract') as mock_tesseract:
                mock_tesseract.get_tesseract_version.return_value = "5.0.0"
                mock_tesseract.image_to_data.return_value = {
                    'text': ['', 'Cache', 'Test', ''],
                    'conf': ['-1', '85', '90', '-1']
                }
                
                await service.initialize()
                
                img = TestDataManager.create_test_image(text="Cache Test")
                base64_data = TestDataManager.image_to_base64(img)
                region = {"x": 0, "y": 0, "width": 200, "height": 100}
                
                # First request (cache miss)
                start_time = time.time()
                result1 = await service.process_region(base64_data, region)
                first_request_time = time.time() - start_time
                
                # Second request (cache hit)
                start_time = time.time()
                result2 = await service.process_region(base64_data, region)
                second_request_time = time.time() - start_time
                
                # Cache hit should be significantly faster
                assert result2["metadata"]["cache_hit"]
                assert second_request_time < first_request_time
                assert second_request_time < 0.1  # Cache hit should be very fast

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])