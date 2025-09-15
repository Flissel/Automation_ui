#!/usr/bin/env python3
"""
OCR Monitoring Workflow Test Script

Tests the complete workflow:
1. Start backend server
2. Test desktop streaming
3. Test OCR functionality
4. Test webhook integration
5. Test complete monitoring workflow

Usage:
    python test_ocr_monitoring_workflow.py
"""

import asyncio
import json
import time
from typing import Dict, Any
from pathlib import Path

import aiohttp
import requests

# Test configuration
BACKEND_URL = "http://localhost:8011"
WEBHOOK_URL = "http://localhost:5678/webhook/529382c3-7bb8-432c-95c1-901bb3973a28"

# Test region (adjust these coordinates for your screen)
TEST_REGION = {
    "x": 100,
    "y": 100,
    "width": 400,
    "height": 200,
    "name": "test_region"
}

class ColorOutput:
    """Simple colored output for better readability"""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    ENDC = '\033[0m'
    
    @staticmethod
    def success(msg: str) -> str:
        return f"{ColorOutput.GREEN}✓ {msg}{ColorOutput.ENDC}"
    
    @staticmethod
    def error(msg: str) -> str:
        return f"{ColorOutput.RED}✗ {msg}{ColorOutput.ENDC}"
    
    @staticmethod
    def warning(msg: str) -> str:
        return f"{ColorOutput.YELLOW}⚠ {msg}{ColorOutput.ENDC}"
    
    @staticmethod
    def info(msg: str) -> str:
        return f"{ColorOutput.BLUE}ℹ {msg}{ColorOutput.ENDC}"

class OCRMonitoringTester:
    """Comprehensive tester for OCR monitoring workflow"""
    
    def __init__(self):
        self.session = None
        self.backend_url = BACKEND_URL
        self.webhook_url = WEBHOOK_URL
        self.test_results = []
    
    async def run_tests(self):
        """Run all tests"""
        print(f"\n{ColorOutput.info('Starting OCR Monitoring Workflow Tests')}")
        print("=" * 60)
        
        # Create HTTP session
        self.session = aiohttp.ClientSession()
        
        try:
            # Test sequence
            await self.test_backend_health()
            await self.test_desktop_service()
            await self.test_ocr_service()
            await self.test_webhook_endpoint()
            await self.test_ocr_monitoring_service()
            await self.test_ocr_region()
            await self.test_complete_workflow()
            
            # Print summary
            self.print_summary()
            
        except Exception as e:
            print(f"{ColorOutput.error(f'Test execution failed: {e}')}")
        finally:
            if self.session:
                await self.session.close()
    
    async def test_backend_health(self):
        """Test backend health endpoint"""
        print(f"\n{ColorOutput.info('Testing Backend Health')}")
        
        try:
            async with self.session.get(f"{self.backend_url}/api/health") as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"{ColorOutput.success('Backend is healthy')}")
                    self.test_results.append(("Backend Health", True, "OK"))
                else:
                    print(f"{ColorOutput.error(f'Backend health check failed: {response.status}')}")
                    self.test_results.append(("Backend Health", False, f"Status: {response.status}"))
        except Exception as e:
            print(f"{ColorOutput.error(f'Backend health check error: {e}')}")
            self.test_results.append(("Backend Health", False, str(e)))
    
    async def test_desktop_service(self):
        """Test desktop streaming service"""
        print(f"\n{ColorOutput.info('Testing Desktop Service')}")
        
        try:
            async with self.session.get(f"{self.backend_url}/api/desktop/status") as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"{ColorOutput.success('Desktop service is available')}")
                    self.test_results.append(("Desktop Service", True, "OK"))
                else:
                    print(f"{ColorOutput.error(f'Desktop service test failed: {response.status}')}")
                    self.test_results.append(("Desktop Service", False, f"Status: {response.status}"))
        except Exception as e:
            print(f"{ColorOutput.error(f'Desktop service test error: {e}')}")
            self.test_results.append(("Desktop Service", False, str(e)))
    
    async def test_ocr_service(self):
        """Test OCR service"""
        print(f"\n{ColorOutput.info('Testing OCR Service')}")
        
        try:
            async with self.session.get(f"{self.backend_url}/api/ocr/languages") as response:
                if response.status == 200:
                    data = await response.json()
                    languages = data.get("languages", [])
                    print(f"{ColorOutput.success(f'OCR service supports {len(languages)} languages')}")
                    self.test_results.append(("OCR Service", True, f"{len(languages)} languages"))
                else:
                    print(f"{ColorOutput.error(f'OCR service test failed: {response.status}')}")
                    self.test_results.append(("OCR Service", False, f"Status: {response.status}"))
        except Exception as e:
            print(f"{ColorOutput.error(f'OCR service test error: {e}')}")
            self.test_results.append(("OCR Service", False, str(e)))
    
    async def test_webhook_endpoint(self):
        """Test webhook endpoint"""
        print(f"\n{ColorOutput.info('Testing Webhook Endpoint')}")
        
        try:
            async with self.session.post(f"{self.backend_url}/api/ocr-monitoring/test-webhook") as response:
                if response.status == 200:
                    data = await response.json()
                    result = data.get("result", {})
                    if result.get("success"):
                        print(f"{ColorOutput.success('Webhook test successful')}")
                        self.test_results.append(("Webhook Test", True, "OK"))
                    else:
                        print(f"{ColorOutput.warning('Webhook test failed')}")
                        self.test_results.append(("Webhook Test", False, result.get("error", "Unknown error")))
                else:
                    print(f"{ColorOutput.error(f'Webhook test endpoint failed: {response.status}')}")
                    self.test_results.append(("Webhook Test", False, f"Status: {response.status}"))
        except Exception as e:
            print(f"{ColorOutput.error(f'Webhook test error: {e}')}")
            self.test_results.append(("Webhook Test", False, str(e)))
    
    async def test_ocr_monitoring_service(self):
        """Test OCR monitoring service"""
        print(f"\n{ColorOutput.info('Testing OCR Monitoring Service')}")
        
        try:
            async with self.session.get(f"{self.backend_url}/api/ocr-monitoring/health") as response:
                if response.status == 200:
                    data = await response.json()
                    health = data.get("health", {})
                    if health.get("healthy"):
                        print(f"{ColorOutput.success('OCR monitoring service is healthy')}")
                        self.test_results.append(("OCR Monitoring Service", True, "Healthy"))
                    else:
                        print(f"{ColorOutput.warning('OCR monitoring service is not healthy')}")
                        self.test_results.append(("OCR Monitoring Service", False, "Not healthy"))
                else:
                    print(f"{ColorOutput.error(f'OCR monitoring service health check failed: {response.status}')}")
                    self.test_results.append(("OCR Monitoring Service", False, f"Status: {response.status}"))
        except Exception as e:
            print(f"{ColorOutput.error(f'OCR monitoring service test error: {e}')}")
            self.test_results.append(("OCR Monitoring Service", False, str(e)))
    
    async def test_ocr_region(self):
        """Test OCR region extraction"""
        print(f"\n{ColorOutput.info('Testing OCR Region Extraction')}")
        
        try:
            payload = {"region": TEST_REGION}
            async with self.session.post(
                f"{self.backend_url}/api/ocr-monitoring/test-region",
                json=payload
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    result = data.get("result", {}).get("result", {})
                    text = result.get("text", "")
                    confidence = result.get("confidence", 0)
                    
                    print(f"{ColorOutput.success(f'OCR region test successful')}")
                    print(f"  Text extracted: '{text[:50]}...' (confidence: {confidence:.2f})")
                    self.test_results.append(("OCR Region Test", True, f"Text: {len(text)} chars, Confidence: {confidence:.2f}"))
                else:
                    print(f"{ColorOutput.error(f'OCR region test failed: {response.status}')}")
                    self.test_results.append(("OCR Region Test", False, f"Status: {response.status}"))
        except Exception as e:
            print(f"{ColorOutput.error(f'OCR region test error: {e}')}")
            self.test_results.append(("OCR Region Test", False, str(e)))
    
    async def test_complete_workflow(self):
        """Test complete monitoring workflow"""
        print(f"\n{ColorOutput.info('Testing Complete Monitoring Workflow')}")
        
        try:
            # Start monitoring
            start_payload = {
                "region": TEST_REGION,
                "config": {
                    "monitoring_interval": 5,  # 5 seconds for testing
                    "similarity_threshold": 0.8
                }
            }
            
            async with self.session.post(
                f"{self.backend_url}/api/ocr-monitoring/start",
                json=start_payload
            ) as response:
                if response.status == 200:
                    print(f"{ColorOutput.success('OCR monitoring started')}")
                    
                    # Wait for monitoring to run
                    print(f"{ColorOutput.info('Waiting 15 seconds for monitoring to collect data...')}")
                    await asyncio.sleep(15)
                    
                    # Check status
                    async with self.session.get(f"{self.backend_url}/api/ocr-monitoring/status") as status_response:
                        if status_response.status == 200:
                            status_data = await status_response.json()
                            status = status_data.get("status", {})
                            
                            if status.get("monitoring"):
                                print(f"{ColorOutput.success('Monitoring is active')}")
                                print(f"  Current text length: {status.get('current_text_length', 0)} characters")
                                self.test_results.append(("Complete Workflow", True, "Monitoring active"))
                            else:
                                print(f"{ColorOutput.warning('Monitoring is not active')}")
                                self.test_results.append(("Complete Workflow", False, "Monitoring not active"))
                        else:
                            print(f"{ColorOutput.error('Could not check monitoring status')}")
                            self.test_results.append(("Complete Workflow", False, "Status check failed"))
                    
                    # Stop monitoring
                    async with self.session.post(f"{self.backend_url}/api/ocr-monitoring/stop") as stop_response:
                        if stop_response.status == 200:
                            print(f"{ColorOutput.success('OCR monitoring stopped')}")
                        else:
                            print(f"{ColorOutput.warning('Failed to stop monitoring')}")
                else:
                    print(f"{ColorOutput.error(f'Failed to start monitoring: {response.status}')}")
                    self.test_results.append(("Complete Workflow", False, f"Start failed: {response.status}"))
        except Exception as e:
            print(f"{ColorOutput.error(f'Complete workflow test error: {e}')}")
            self.test_results.append(("Complete Workflow", False, str(e)))
    
    def print_summary(self):
        """Print test summary"""
        print(f"\n{ColorOutput.info('Test Summary')}")
        print("=" * 60)
        
        passed = sum(1 for _, success, _ in self.test_results if success)
        failed = len(self.test_results) - passed
        
        for test_name, success, details in self.test_results:
            status = ColorOutput.success("PASS") if success else ColorOutput.error("FAIL")
            print(f"{test_name:<25} {status} {details}")
        
        print("-" * 60)
        print(f"Total Tests: {len(self.test_results)}")
        print(f"Passed: {ColorOutput.success(str(passed))}")
        print(f"Failed: {ColorOutput.error(str(failed))}")
        
        if failed == 0:
            print(f"\n{ColorOutput.success('All tests passed! 🎉')}")
        else:
            print(f"\n{ColorOutput.warning(f'{failed} test(s) failed. Check the output above for details.')}")

async def main():
    """Main test execution"""
    print(f"{ColorOutput.info('OCR Monitoring Workflow Test Suite')}")
    print("This will test the complete OCR monitoring workflow.")
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Webhook URL: {WEBHOOK_URL}")
    print(f"Test Region: {TEST_REGION}")
    
    input("\nPress Enter to continue...")
    
    tester = OCRMonitoringTester()
    await tester.run_tests()

if __name__ == "__main__":
    asyncio.run(main()) 