#!/usr/bin/env python3
"""
OCR Test Fixtures
Provides reusable test fixtures and data for OCR testing
"""

import pytest
import asyncio
import tempfile
import os
from typing import Dict, List, Any, Optional
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime, timedelta

# Import test utilities
from .image_generator import ImageGenerator
from .mock_data import MockDataProvider

class OCRTestFixtures:
    """Centralized test fixtures for OCR testing"""
    
    def __init__(self):
        self.image_generator = ImageGenerator()
        self.mock_data = MockDataProvider()
        self._temp_files = []
    
    def cleanup(self):
        """Clean up temporary files"""
        for filepath in self._temp_files:
            try:
                if os.path.exists(filepath):
                    os.remove(filepath)
            except Exception:
                pass
        self._temp_files.clear()
    
    # Configuration Fixtures
    @pytest.fixture
    def basic_ocr_config(self):
        """Basic OCR service configuration"""
        try:
            from app.ocr_config import OCRServiceConfig, OCREngine, PreprocessingMode, PSMMode
        except ImportError:
            from ocr_config import OCRServiceConfig, OCREngine, PreprocessingMode, PSMMode
        
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
    def performance_ocr_config(self):
        """Performance-optimized OCR configuration"""
        try:
            from app.ocr_config import OCRServiceConfig, OCREngine, PreprocessingMode, PSMMode
        except ImportError:
            from ocr_config import OCRServiceConfig, OCREngine, PreprocessingMode, PSMMode
        
        return OCRServiceConfig(
            engine=OCREngine.TESSERACT,
            default_language="eng",
            confidence_threshold=0.6,
            cache_enabled=True,
            cache_ttl=600,
            max_concurrent_requests=5,
            preprocessing_mode=PreprocessingMode.NONE,
            psm_mode=PSMMode.SINGLE_BLOCK
        )
    
    @pytest.fixture
    def no_cache_config(self):
        """OCR configuration without caching"""
        try:
            from app.ocr_config import OCRServiceConfig, OCREngine, PreprocessingMode, PSMMode
        except ImportError:
            from ocr_config import OCRServiceConfig, OCREngine, PreprocessingMode, PSMMode
        
        return OCRServiceConfig(
            engine=OCREngine.TESSERACT,
            default_language="eng",
            confidence_threshold=0.7,
            cache_enabled=False,
            max_concurrent_requests=2,
            preprocessing_mode=PreprocessingMode.ADAPTIVE_THRESHOLD,
            psm_mode=PSMMode.SINGLE_BLOCK
        )
    
    # Service Fixtures
    @pytest.fixture
    def mock_ocr_service(self, basic_ocr_config):
        """Mock OCR service for testing"""
        try:
            from services.enhanced_ocr_service import EnhancedOCRService
        except ImportError:
            from enhanced_ocr_service import EnhancedOCRService
        
        service = EnhancedOCRService(config=basic_ocr_config)
        
        # Mock the initialization
        service.is_initialized = True
        service._tesseract_available = True
        service._pyautogui_available = True
        
        return service
    
    @pytest.fixture
    def initialized_ocr_service(self, basic_ocr_config):
        """Fully initialized OCR service with mocked dependencies"""
        try:
            from services.enhanced_ocr_service import EnhancedOCRService
        except ImportError:
            from enhanced_ocr_service import EnhancedOCRService
        
        with patch('services.enhanced_ocr_service._load_ocr_dependencies', return_value=True):
            with patch('services.enhanced_ocr_service._pytesseract') as mock_tesseract:
                mock_tesseract.get_tesseract_version.return_value = "5.0.0"
                
                service = EnhancedOCRService(config=basic_ocr_config)
                
                # Run initialization in event loop
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    loop.run_until_complete(service.initialize())
                finally:
                    loop.close()
                
                return service
    
    # Image Fixtures
    @pytest.fixture
    def sample_text_image(self):
        """Simple text image for testing"""
        return self.image_generator.create_text_image("Sample Text")
    
    @pytest.fixture
    def multiline_text_image(self):
        """Multiline text image"""
        return self.image_generator.create_multiline_text_image([
            "First Line",
            "Second Line",
            "Third Line"
        ])
    
    @pytest.fixture
    def noisy_text_image(self):
        """Noisy text image for robustness testing"""
        return self.image_generator.create_noisy_image(
            "Noisy Text",
            noise_level=0.15,
            blur_radius=0.5
        )
    
    @pytest.fixture
    def rotated_text_image(self):
        """Rotated text image"""
        return self.image_generator.create_rotated_image(
            "Rotated Text",
            angle=10
        )
    
    @pytest.fixture
    def table_image(self):
        """Table image for structured data testing"""
        return self.image_generator.create_table_image([
            ["Product", "Price", "Quantity"],
            ["Apple", "$1.00", "10"],
            ["Banana", "$0.50", "20"],
            ["Orange", "$0.75", "15"]
        ])
    
    @pytest.fixture
    def document_image(self):
        """Document-style image"""
        return self.image_generator.create_document_image(
            title="Test Document",
            paragraphs=[
                "This is the first paragraph of the test document. It contains multiple sentences to test OCR accuracy.",
                "This is the second paragraph. It should be properly separated from the first paragraph.",
                "The third paragraph tests the ability to handle longer text blocks with various punctuation marks, numbers like 123, and special characters."
            ]
        )
    
    @pytest.fixture
    def multilingual_images(self):
        """Images with text in different languages"""
        texts = {
            "eng": "Hello World",
            "deu": "Hallo Welt", 
            "fra": "Bonjour Monde",
            "spa": "Hola Mundo",
            "ita": "Ciao Mondo"
        }
        
        images = {}
        for lang, text in texts.items():
            images[lang] = self.image_generator.create_text_image(text)
        
        return images
    
    @pytest.fixture
    def contrast_variation_images(self):
        """Images with different contrast levels"""
        return self.image_generator.create_contrast_variations(
            "Contrast Test",
            contrast_levels=[0.5, 0.8, 1.0, 1.2, 1.5]
        )
    
    @pytest.fixture
    def font_size_variation_images(self):
        """Images with different font sizes"""
        return self.image_generator.create_font_size_variations(
            "Font Size Test",
            font_sizes=[10, 16, 24, 32, 48]
        )
    
    # Data Fixtures
    @pytest.fixture
    def sample_regions(self):
        """Sample regions for testing"""
        return [
            {"x": 0, "y": 0, "width": 200, "height": 100, "name": "full_region"},
            {"x": 50, "y": 25, "width": 100, "height": 50, "name": "center_region"},
            {"x": 0, "y": 0, "width": 100, "height": 50, "name": "top_left"},
            {"x": 100, "y": 50, "width": 100, "height": 50, "name": "bottom_right"}
        ]
    
    @pytest.fixture
    def base64_image_data(self, sample_text_image):
        """Base64 encoded image data"""
        return self.image_generator.image_to_base64(sample_text_image)
    
    @pytest.fixture
    def mock_tesseract_response(self):
        """Mock Tesseract OCR response"""
        return {
            'text': ['', 'Sample', 'Text', ''],
            'conf': ['-1', '85', '90', '-1'],
            'left': ['0', '10', '60', '0'],
            'top': ['0', '20', '20', '0'],
            'width': ['100', '40', '30', '0'],
            'height': ['50', '20', '20', '0']
        }
    
    @pytest.fixture
    def mock_successful_ocr_result(self):
        """Mock successful OCR result"""
        return {
            "text": "Sample Text",
            "confidence": 0.87,
            "language": "eng",
            "processing_time": 0.25,
            "metadata": {
                "preprocessing": "adaptive_threshold",
                "psm_mode": 6,
                "confidence_threshold": 0.7,
                "region_size": "200x100",
                "cache_hit": False,
                "timestamp": datetime.now().isoformat()
            }
        }
    
    @pytest.fixture
    def mock_low_confidence_result(self):
        """Mock low confidence OCR result"""
        return {
            "text": "Unclear Text",
            "confidence": 0.45,
            "language": "eng",
            "processing_time": 0.30,
            "metadata": {
                "preprocessing": "adaptive_threshold",
                "psm_mode": 6,
                "confidence_threshold": 0.7,
                "region_size": "200x100",
                "cache_hit": False,
                "warning": "Low confidence result",
                "timestamp": datetime.now().isoformat()
            }
        }
    
    @pytest.fixture
    def mock_error_result(self):
        """Mock error OCR result"""
        return {
            "text": "",
            "confidence": 0.0,
            "language": "eng",
            "processing_time": 0.05,
            "metadata": {
                "error": "OCR processing failed",
                "timestamp": datetime.now().isoformat()
            }
        }
    
    # Mock Fixtures
    @pytest.fixture
    def mock_pyautogui(self, sample_text_image):
        """Mock pyautogui for screenshot testing"""
        mock = Mock()
        mock.screenshot.return_value = sample_text_image
        mock.size.return_value = Mock(width=1920, height=1080)
        return mock
    
    @pytest.fixture
    def mock_tesseract(self, mock_tesseract_response):
        """Mock pytesseract for OCR testing"""
        mock = Mock()
        mock.get_tesseract_version.return_value = "5.0.0"
        mock.image_to_data.return_value = mock_tesseract_response
        mock.image_to_string.return_value = "Sample Text"
        return mock
    
    @pytest.fixture
    def mock_cv2(self):
        """Mock OpenCV for image processing"""
        mock = Mock()
        
        # Mock image processing functions
        import numpy as np
        mock_image = np.ones((100, 200), dtype=np.uint8) * 255
        
        mock.cvtColor.return_value = mock_image
        mock.adaptiveThreshold.return_value = mock_image
        mock.GaussianBlur.return_value = mock_image
        mock.threshold.return_value = (0, mock_image)
        mock.morphologyEx.return_value = mock_image
        mock.medianBlur.return_value = mock_image
        
        return mock
    
    # Temporary File Fixtures
    @pytest.fixture
    def temp_image_file(self, sample_text_image):
        """Temporary image file for testing"""
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
            sample_text_image.save(f.name)
            self._temp_files.append(f.name)
            return f.name
    
    @pytest.fixture
    def temp_directory(self):
        """Temporary directory for testing"""
        temp_dir = tempfile.mkdtemp()
        return temp_dir
    
    # Performance Testing Fixtures
    @pytest.fixture
    def performance_test_images(self):
        """Set of images for performance testing"""
        images = []
        
        # Different sizes
        for size in [(100, 50), (200, 100), (400, 200), (800, 400)]:
            img = self.image_generator.create_text_image(
                f"Performance Test {size[0]}x{size[1]}",
                width=size[0],
                height=size[1]
            )
            images.append(img)
        
        return images
    
    @pytest.fixture
    def stress_test_data(self):
        """Data for stress testing"""
        return {
            "concurrent_requests": 10,
            "request_count": 100,
            "timeout_seconds": 30,
            "expected_success_rate": 0.95
        }
    
    # Monitoring Fixtures
    @pytest.fixture
    def mock_monitoring_config(self):
        """Mock monitoring configuration"""
        try:
            from services.ocr_monitoring_service import OCRMonitoringConfig, OCRRegion
        except ImportError:
            # Create mock classes if not available
            class OCRMonitoringConfig:
                def __init__(self, **kwargs):
                    self.monitoring_interval = kwargs.get('monitoring_interval', 1.0)
                    self.confidence_threshold = kwargs.get('confidence_threshold', 0.7)
                    self.language = kwargs.get('language', 'eng')
            
            class OCRRegion:
                def __init__(self, **kwargs):
                    self.x = kwargs.get('x', 0)
                    self.y = kwargs.get('y', 0)
                    self.width = kwargs.get('width', 100)
                    self.height = kwargs.get('height', 50)
                    self.name = kwargs.get('name', 'test_region')
        
        return OCRMonitoringConfig(
            monitoring_interval=0.5,
            confidence_threshold=0.7,
            language="eng"
        )
    
    @pytest.fixture
    def mock_ocr_region(self):
        """Mock OCR region for monitoring"""
        try:
            from services.ocr_monitoring_service import OCRRegion
        except ImportError:
            class OCRRegion:
                def __init__(self, **kwargs):
                    self.x = kwargs.get('x', 0)
                    self.y = kwargs.get('y', 0)
                    self.width = kwargs.get('width', 100)
                    self.height = kwargs.get('height', 50)
                    self.name = kwargs.get('name', 'test_region')
        
        return OCRRegion(
            x=100,
            y=100,
            width=200,
            height=100,
            name="test_monitoring_region"
        )
    
    # Utility Methods
    def create_test_scenario(self, scenario_name: str) -> Dict[str, Any]:
        """Create a complete test scenario with all necessary components"""
        scenarios = {
            "basic_text": {
                "image": self.image_generator.create_text_image("Basic Test"),
                "expected_text": "Basic Test",
                "region": {"x": 0, "y": 0, "width": 200, "height": 100},
                "language": "eng",
                "confidence_threshold": 0.7
            },
            "noisy_text": {
                "image": self.image_generator.create_noisy_image("Noisy Test", noise_level=0.2),
                "expected_text": "Noisy Test",
                "region": {"x": 0, "y": 0, "width": 200, "height": 100},
                "language": "eng",
                "confidence_threshold": 0.6
            },
            "multiline": {
                "image": self.image_generator.create_multiline_text_image(["Line 1", "Line 2"]),
                "expected_text": "Line 1\nLine 2",
                "region": {"x": 0, "y": 0, "width": 200, "height": 150},
                "language": "eng",
                "confidence_threshold": 0.7
            },
            "table": {
                "image": self.image_generator.create_table_image([["A", "B"], ["1", "2"]]),
                "expected_text": "A B\n1 2",
                "region": {"x": 0, "y": 0, "width": 250, "height": 100},
                "language": "eng",
                "confidence_threshold": 0.7
            }
        }
        
        return scenarios.get(scenario_name, scenarios["basic_text"])
    
    def get_all_test_scenarios(self) -> Dict[str, Dict[str, Any]]:
        """Get all available test scenarios"""
        return {
            "basic_text": self.create_test_scenario("basic_text"),
            "noisy_text": self.create_test_scenario("noisy_text"),
            "multiline": self.create_test_scenario("multiline"),
            "table": self.create_test_scenario("table")
        }

# Global fixture instance
_fixtures = OCRTestFixtures()

# Export commonly used fixtures as module-level functions
def get_basic_config():
    """Get basic OCR configuration"""
    return _fixtures.basic_ocr_config()

def get_sample_image():
    """Get sample text image"""
    return _fixtures.sample_text_image()

def get_test_regions():
    """Get sample regions for testing"""
    return _fixtures.sample_regions()

def cleanup_fixtures():
    """Clean up fixture resources"""
    _fixtures.cleanup()

# Pytest plugin hooks
def pytest_sessionfinish(session, exitstatus):
    """Clean up after test session"""
    cleanup_fixtures()