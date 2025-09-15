#!/usr/bin/env python3
"""
Mock Data Provider for OCR Testing
Provides realistic mock data for various testing scenarios
"""

import random
import string
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from unittest.mock import Mock, AsyncMock
import json

class MockDataProvider:
    """Provides mock data for OCR testing scenarios"""
    
    def __init__(self):
        self.languages = [
            "eng", "deu", "fra", "spa", "ita", "por", "rus", "jpn", "kor", "chi_sim"
        ]
        
        self.sample_texts = {
            "eng": [
                "Hello World", "The quick brown fox", "Testing OCR accuracy",
                "Sample document text", "Invoice #12345", "Product catalog",
                "User manual section", "Email content", "Web page text"
            ],
            "deu": [
                "Hallo Welt", "Der schnelle braune Fuchs", "OCR-Genauigkeit testen",
                "Beispiel Dokumenttext", "Rechnung #12345", "Produktkatalog"
            ],
            "fra": [
                "Bonjour Monde", "Le renard brun rapide", "Tester la précision OCR",
                "Texte de document exemple", "Facture #12345", "Catalogue produit"
            ],
            "spa": [
                "Hola Mundo", "El zorro marrón rápido", "Probar precisión OCR",
                "Texto de documento ejemplo", "Factura #12345", "Catálogo producto"
            ]
        }
        
        self.confidence_ranges = {
            "high": (0.85, 0.99),
            "medium": (0.65, 0.84),
            "low": (0.30, 0.64),
            "very_low": (0.10, 0.29)
        }
    
    def generate_mock_tesseract_response(
        self,
        text: str,
        confidence_level: str = "high",
        include_coordinates: bool = True
    ) -> Dict[str, List[str]]:
        """Generate mock Tesseract OCR response
        
        Args:
            text: Text to simulate OCR for
            confidence_level: Confidence level (high, medium, low, very_low)
            include_coordinates: Whether to include coordinate data
            
        Returns:
            Mock Tesseract response dictionary
        """
        words = text.split()
        
        # Generate confidence scores
        conf_range = self.confidence_ranges.get(confidence_level, self.confidence_ranges["high"])
        confidences = []
        
        for word in words:
            if word.strip():  # Non-empty words
                conf = random.uniform(conf_range[0] * 100, conf_range[1] * 100)
                confidences.append(str(int(conf)))
            else:
                confidences.append("-1")
        
        response = {
            'text': [''] + words + [''],  # Tesseract format with empty strings
            'conf': ['-1'] + confidences + ['-1']
        }
        
        if include_coordinates:
            # Generate mock coordinates
            x_pos = 10
            for i, word in enumerate([''] + words + ['']):
                if i == 0 or i == len(words) + 1:  # Empty entries
                    response.setdefault('left', []).append('0')
                    response.setdefault('top', []).append('0')
                    response.setdefault('width', []).append('0')
                    response.setdefault('height', []).append('0')
                else:
                    word_width = len(word) * 8  # Approximate width
                    response.setdefault('left', []).append(str(x_pos))
                    response.setdefault('top', []).append('20')
                    response.setdefault('width', []).append(str(word_width))
                    response.setdefault('height', []).append('16')
                    x_pos += word_width + 5
        
        return response
    
    def generate_mock_ocr_result(
        self,
        text: str,
        language: str = "eng",
        confidence_level: str = "high",
        processing_time: Optional[float] = None,
        cache_hit: bool = False,
        include_metadata: bool = True
    ) -> Dict[str, Any]:
        """Generate mock OCR result
        
        Args:
            text: Extracted text
            language: Language code
            confidence_level: Confidence level
            processing_time: Processing time in seconds
            cache_hit: Whether this was a cache hit
            include_metadata: Whether to include metadata
            
        Returns:
            Mock OCR result dictionary
        """
        conf_range = self.confidence_ranges.get(confidence_level, self.confidence_ranges["high"])
        confidence = random.uniform(conf_range[0], conf_range[1])
        
        if processing_time is None:
            if cache_hit:
                processing_time = random.uniform(0.001, 0.01)  # Very fast for cache hits
            else:
                processing_time = random.uniform(0.1, 2.0)  # Normal processing time
        
        result = {
            "text": text,
            "confidence": round(confidence, 3),
            "language": language,
            "processing_time": round(processing_time, 3)
        }
        
        if include_metadata:
            result["metadata"] = self._generate_metadata(
                confidence_level, cache_hit, language
            )
        
        return result
    
    def generate_mock_error_result(
        self,
        error_type: str = "processing_error",
        language: str = "eng"
    ) -> Dict[str, Any]:
        """Generate mock error result
        
        Args:
            error_type: Type of error to simulate
            language: Language code
            
        Returns:
            Mock error result dictionary
        """
        error_messages = {
            "processing_error": "OCR processing failed",
            "invalid_image": "Invalid image data provided",
            "unsupported_language": f"Language '{language}' not supported",
            "timeout": "OCR processing timeout",
            "low_confidence": "Text extraction confidence too low",
            "empty_region": "No text found in specified region",
            "service_unavailable": "OCR service temporarily unavailable"
        }
        
        return {
            "text": "",
            "confidence": 0.0,
            "language": language,
            "processing_time": random.uniform(0.01, 0.1),
            "metadata": {
                "error": error_messages.get(error_type, "Unknown error"),
                "error_type": error_type,
                "timestamp": datetime.now().isoformat()
            }
        }
    
    def generate_batch_results(
        self,
        texts: List[str],
        language: str = "eng",
        confidence_distribution: Optional[Dict[str, float]] = None
    ) -> List[Dict[str, Any]]:
        """Generate batch of mock OCR results
        
        Args:
            texts: List of texts to generate results for
            language: Language code
            confidence_distribution: Distribution of confidence levels
            
        Returns:
            List of mock OCR results
        """
        if confidence_distribution is None:
            confidence_distribution = {
                "high": 0.7,
                "medium": 0.2,
                "low": 0.08,
                "very_low": 0.02
            }
        
        results = []
        for text in texts:
            # Choose confidence level based on distribution
            rand_val = random.random()
            cumulative = 0
            confidence_level = "high"
            
            for level, prob in confidence_distribution.items():
                cumulative += prob
                if rand_val <= cumulative:
                    confidence_level = level
                    break
            
            result = self.generate_mock_ocr_result(
                text, language, confidence_level
            )
            results.append(result)
        
        return results
    
    def generate_performance_data(
        self,
        num_requests: int = 100,
        time_range_hours: int = 24
    ) -> Dict[str, Any]:
        """Generate mock performance data
        
        Args:
            num_requests: Number of requests to simulate
            time_range_hours: Time range in hours
            
        Returns:
            Mock performance data
        """
        start_time = datetime.now() - timedelta(hours=time_range_hours)
        
        requests = []
        successful = 0
        failed = 0
        cache_hits = 0
        total_processing_time = 0
        
        for i in range(num_requests):
            # Generate request timestamp
            request_time = start_time + timedelta(
                seconds=random.uniform(0, time_range_hours * 3600)
            )
            
            # Determine if request was successful (95% success rate)
            success = random.random() < 0.95
            
            # Determine if cache hit (30% cache hit rate for successful requests)
            cache_hit = success and random.random() < 0.3
            
            # Generate processing time
            if cache_hit:
                processing_time = random.uniform(0.001, 0.01)
            elif success:
                processing_time = random.uniform(0.1, 2.0)
            else:
                processing_time = random.uniform(0.01, 0.5)
            
            request_data = {
                "timestamp": request_time.isoformat(),
                "success": success,
                "cache_hit": cache_hit,
                "processing_time": round(processing_time, 3),
                "language": random.choice(self.languages[:4]),  # Common languages
                "confidence": random.uniform(0.6, 0.99) if success else 0.0
            }
            
            requests.append(request_data)
            
            if success:
                successful += 1
            else:
                failed += 1
            
            if cache_hit:
                cache_hits += 1
            
            total_processing_time += processing_time
        
        return {
            "total_requests": num_requests,
            "successful_requests": successful,
            "failed_requests": failed,
            "cache_hits": cache_hits,
            "cache_misses": successful - cache_hits,
            "success_rate": successful / num_requests,
            "cache_hit_rate": cache_hits / successful if successful > 0 else 0,
            "average_processing_time": total_processing_time / num_requests,
            "requests": requests
        }
    
    def generate_monitoring_events(
        self,
        num_events: int = 50,
        time_range_minutes: int = 60
    ) -> List[Dict[str, Any]]:
        """Generate mock monitoring events
        
        Args:
            num_events: Number of events to generate
            time_range_minutes: Time range in minutes
            
        Returns:
            List of mock monitoring events
        """
        start_time = datetime.now() - timedelta(minutes=time_range_minutes)
        events = []
        
        for i in range(num_events):
            event_time = start_time + timedelta(
                seconds=random.uniform(0, time_range_minutes * 60)
            )
            
            # Generate text change event
            old_text = random.choice(self.sample_texts["eng"])
            new_text = random.choice(self.sample_texts["eng"])
            
            event = {
                "timestamp": event_time.isoformat(),
                "region_name": f"region_{random.randint(1, 5)}",
                "old_text": old_text if random.random() > 0.3 else "",
                "new_text": new_text,
                "confidence": random.uniform(0.6, 0.99),
                "processing_time": random.uniform(0.1, 1.0),
                "change_type": random.choice(["text_added", "text_changed", "text_removed"])
            }
            
            events.append(event)
        
        return sorted(events, key=lambda x: x["timestamp"])
    
    def generate_stress_test_data(
        self,
        concurrent_users: int = 10,
        requests_per_user: int = 20
    ) -> Dict[str, Any]:
        """Generate data for stress testing
        
        Args:
            concurrent_users: Number of concurrent users
            requests_per_user: Requests per user
            
        Returns:
            Stress test data
        """
        users = []
        
        for user_id in range(concurrent_users):
            user_requests = []
            
            for req_id in range(requests_per_user):
                # Vary request complexity
                complexity = random.choice(["simple", "medium", "complex"])
                
                if complexity == "simple":
                    text = random.choice(self.sample_texts["eng"][:3])
                    expected_time = random.uniform(0.1, 0.5)
                elif complexity == "medium":
                    text = " ".join(random.choices(self.sample_texts["eng"], k=2))
                    expected_time = random.uniform(0.5, 1.5)
                else:  # complex
                    text = " ".join(random.choices(self.sample_texts["eng"], k=4))
                    expected_time = random.uniform(1.5, 3.0)
                
                request = {
                    "request_id": f"user_{user_id}_req_{req_id}",
                    "text": text,
                    "complexity": complexity,
                    "expected_processing_time": expected_time,
                    "language": random.choice(self.languages[:4]),
                    "region": {
                        "x": random.randint(0, 100),
                        "y": random.randint(0, 100),
                        "width": random.randint(100, 400),
                        "height": random.randint(50, 200)
                    }
                }
                
                user_requests.append(request)
            
            users.append({
                "user_id": user_id,
                "requests": user_requests
            })
        
        return {
            "concurrent_users": concurrent_users,
            "total_requests": concurrent_users * requests_per_user,
            "users": users,
            "expected_duration": max(
                sum(req["expected_processing_time"] for req in user["requests"])
                for user in users
            )
        }
    
    def generate_multilingual_test_data(self) -> Dict[str, List[Dict[str, Any]]]:
        """Generate test data for multiple languages
        
        Returns:
            Dictionary with language codes as keys and test data as values
        """
        multilingual_data = {}
        
        for lang in self.languages[:6]:  # Top 6 languages
            if lang in self.sample_texts:
                texts = self.sample_texts[lang]
            else:
                # Generate placeholder text for languages without samples
                texts = [f"Sample text {i} in {lang}" for i in range(5)]
            
            test_cases = []
            for text in texts:
                test_case = {
                    "text": text,
                    "language": lang,
                    "expected_result": self.generate_mock_ocr_result(
                        text, lang, "high"
                    ),
                    "region": {
                        "x": 0,
                        "y": 0,
                        "width": len(text) * 10,
                        "height": 30
                    }
                }
                test_cases.append(test_case)
            
            multilingual_data[lang] = test_cases
        
        return multilingual_data
    
    def generate_edge_case_data(self) -> List[Dict[str, Any]]:
        """Generate edge case test data
        
        Returns:
            List of edge case scenarios
        """
        edge_cases = [
            {
                "name": "empty_text",
                "text": "",
                "expected_confidence": 0.0,
                "should_succeed": False
            },
            {
                "name": "single_character",
                "text": "A",
                "expected_confidence": 0.8,
                "should_succeed": True
            },
            {
                "name": "numbers_only",
                "text": "123456789",
                "expected_confidence": 0.9,
                "should_succeed": True
            },
            {
                "name": "special_characters",
                "text": "@#$%^&*()",
                "expected_confidence": 0.6,
                "should_succeed": True
            },
            {
                "name": "mixed_case",
                "text": "MiXeD CaSe TeXt",
                "expected_confidence": 0.85,
                "should_succeed": True
            },
            {
                "name": "very_long_text",
                "text": " ".join(["word"] * 100),
                "expected_confidence": 0.7,
                "should_succeed": True
            },
            {
                "name": "unicode_characters",
                "text": "Héllo Wörld 你好 мир",
                "expected_confidence": 0.6,
                "should_succeed": True
            }
        ]
        
        return edge_cases
    
    def _generate_metadata(
        self,
        confidence_level: str,
        cache_hit: bool,
        language: str
    ) -> Dict[str, Any]:
        """Generate metadata for OCR result"""
        metadata = {
            "preprocessing": random.choice([
                "adaptive_threshold", "gaussian_blur", "median_filter", "none"
            ]),
            "psm_mode": random.choice([3, 6, 7, 8, 11, 13]),
            "confidence_threshold": 0.7,
            "cache_hit": cache_hit,
            "timestamp": datetime.now().isoformat(),
            "language": language
        }
        
        if confidence_level in ["low", "very_low"]:
            metadata["warning"] = "Low confidence result"
        
        if not cache_hit:
            metadata["region_size"] = f"{random.randint(100, 800)}x{random.randint(50, 400)}"
        
        return metadata
    
    def create_mock_service(self, behavior: str = "normal") -> Mock:
        """Create a mock OCR service with specified behavior
        
        Args:
            behavior: Service behavior (normal, slow, error_prone, cache_heavy)
            
        Returns:
            Mock OCR service
        """
        service = Mock()
        
        if behavior == "normal":
            service.process_region = AsyncMock(
                side_effect=lambda *args, **kwargs: self.generate_mock_ocr_result(
                    "Sample Text", kwargs.get("language", "eng"), "high"
                )
            )
        elif behavior == "slow":
            async def slow_process(*args, **kwargs):
                await asyncio.sleep(2)  # Simulate slow processing
                return self.generate_mock_ocr_result(
                    "Slow Text", kwargs.get("language", "eng"), "medium"
                )
            service.process_region = slow_process
        elif behavior == "error_prone":
            def error_process(*args, **kwargs):
                if random.random() < 0.3:  # 30% error rate
                    return self.generate_mock_error_result("processing_error")
                return self.generate_mock_ocr_result(
                    "Error Prone Text", kwargs.get("language", "eng"), "low"
                )
            service.process_region = AsyncMock(side_effect=error_process)
        elif behavior == "cache_heavy":
            def cache_process(*args, **kwargs):
                return self.generate_mock_ocr_result(
                    "Cached Text", kwargs.get("language", "eng"), "high", cache_hit=True
                )
            service.process_region = AsyncMock(side_effect=cache_process)
        
        # Add common service methods
        service.is_healthy.return_value = True
        service.get_supported_languages.return_value = self.languages
        service.validate_language.side_effect = lambda lang: lang in self.languages
        
        return service
    
    def get_sample_text(self, language: str = "eng", category: str = "random") -> str:
        """Get sample text for testing
        
        Args:
            language: Language code
            category: Text category (random, short, long, technical)
            
        Returns:
            Sample text string
        """
        if language not in self.sample_texts:
            language = "eng"
        
        texts = self.sample_texts[language]
        
        if category == "short":
            return random.choice(texts[:3])
        elif category == "long":
            return " ".join(random.choices(texts, k=3))
        elif category == "technical":
            return f"Technical document v{random.randint(1,10)}.{random.randint(0,9)} - {random.choice(texts)}"
        else:  # random
            return random.choice(texts)

# Convenience functions
def create_mock_tesseract_response(text: str, confidence: str = "high") -> Dict[str, List[str]]:
    """Create mock Tesseract response"""
    provider = MockDataProvider()
    return provider.generate_mock_tesseract_response(text, confidence)

def create_mock_ocr_result(text: str, language: str = "eng") -> Dict[str, Any]:
    """Create mock OCR result"""
    provider = MockDataProvider()
    return provider.generate_mock_ocr_result(text, language)

def create_performance_dataset(size: int = 100) -> Dict[str, Any]:
    """Create performance test dataset"""
    provider = MockDataProvider()
    return provider.generate_performance_data(size)