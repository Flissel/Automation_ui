#!/usr/bin/env python3
"""
Comprehensive API Endpoint Testing for TRAE Backend

Tests all HTTP API endpoints to ensure they are functional and responding correctly.
"""

import asyncio
import aiohttp
import json
import time
from typing import Dict, List, Tuple, Any
from dataclasses import dataclass

@dataclass
class EndpointTest:
    """Test configuration for an API endpoint"""
    method: str
    path: str
    description: str
    expected_status: int = 200
    payload: Dict[str, Any] = None
    headers: Dict[str, str] = None

class APIEndpointTester:
    """Comprehensive API endpoint testing"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.results = []
        self.session = None
        
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=10),
            connector=aiohttp.TCPConnector(limit=100)
        )
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()

    async def test_endpoint(self, test: EndpointTest) -> Dict[str, Any]:
        """Test a single endpoint"""
        url = f"{self.base_url}{test.path}"
        start_time = time.time()
        
        try:
            headers = test.headers or {}
            if test.payload:
                headers['Content-Type'] = 'application/json'
            
            async with self.session.request(
                test.method,
                url,
                json=test.payload,
                headers=headers
            ) as response:
                duration = time.time() - start_time
                response_text = await response.text()
                
                # Try to parse as JSON
                try:
                    response_data = json.loads(response_text)
                except json.JSONDecodeError:
                    response_data = response_text[:200] + "..." if len(response_text) > 200 else response_text
                
                status_match = response.status == test.expected_status
                
                result = {
                    'test': test.description,
                    'method': test.method,
                    'path': test.path,
                    'status': response.status,
                    'expected_status': test.expected_status,
                    'success': status_match,
                    'duration': duration,
                    'response_size': len(response_text),
                    'response_preview': str(response_data)[:300] + "..." if len(str(response_data)) > 300 else str(response_data),
                    'error': None
                }
                
                return result
                
        except Exception as e:
            duration = time.time() - start_time
            return {
                'test': test.description,
                'method': test.method,
                'path': test.path,
                'status': 0,
                'expected_status': test.expected_status,
                'success': False,
                'duration': duration,
                'response_size': 0,
                'response_preview': f"Exception: {str(e)}",
                'error': str(e)
            }

    def get_test_endpoints(self) -> List[EndpointTest]:
        """Define all endpoints to test"""
        return [
            # Root endpoint
            EndpointTest("GET", "/", "Root API info"),
            
            # Health endpoints
            EndpointTest("GET", "/api/health", "Health check"),
            EndpointTest("GET", "/api/health/detailed", "Detailed health check"),
            
            # Node System endpoints
            EndpointTest("GET", "/api/node-system/nodes", "List available nodes"),
            EndpointTest("POST", "/api/node-system/validate", "Validate node system", 200, {
                "nodes": [{"id": "test-node", "type": "input"}],
                "edges": []
            }),
            
            # OCR endpoints
            EndpointTest("GET", "/api/ocr/status", "OCR service status"),
            EndpointTest("GET", "/api/ocr/engines", "Available OCR engines"),
            
            # OCR Monitoring endpoints  
            EndpointTest("GET", "/api/ocr-monitoring/status", "OCR monitoring status"),
            EndpointTest("GET", "/api/ocr-monitoring/stats", "OCR monitoring statistics"),
            
            # Desktop endpoints
            EndpointTest("GET", "/api/desktop/status", "Desktop service status"),
            EndpointTest("GET", "/api/desktop/screenshot", "Get desktop screenshot"),
            
            # Automation endpoints
            EndpointTest("GET", "/api/automation/status", "Automation service status"),
            EndpointTest("GET", "/api/automation/capabilities", "Automation capabilities"),
            
            # Filesystem endpoints
            EndpointTest("GET", "/api/filesystem/status", "Filesystem service status"),
            
            # Workflows endpoints
            EndpointTest("GET", "/api/workflows/status", "Workflows service status"),
            EndpointTest("GET", "/api/workflows/list", "List workflows"),
            
            # Snapshots endpoints (already tested but included for completeness)
            EndpointTest("GET", "/api/snapshots", "List snapshots"),
            
            # Playwright endpoints
            EndpointTest("GET", "/playwright/status", "Playwright service status"),
            
            # VM Management endpoints
            EndpointTest("GET", "/vm/status", "VM management status"),
            EndpointTest("GET", "/vm/list", "List virtual machines"),
            
            # Desktop Switching endpoints
            EndpointTest("GET", "/desktop-switching/status", "Desktop switching status"),
            
            # Windows Desktop endpoints
            EndpointTest("GET", "/windows-desktop/status", "Windows desktop service status"),
            
            # WebRTC endpoints
            EndpointTest("GET", "/api/webrtc/status", "WebRTC service status"),
        ]

    async def run_tests(self) -> Dict[str, Any]:
        """Run all endpoint tests"""
        print("🧪 TRAE Backend API Endpoint Tests")
        print("=" * 50)
        print(f"Testing API endpoints on {self.base_url}")
        print()
        
        test_endpoints = self.get_test_endpoints()
        print(f"🚀 Starting {len(test_endpoints)} API endpoint tests...")
        print("=" * 70)
        
        results = []
        successful_tests = 0
        failed_tests = 0
        
        for i, test in enumerate(test_endpoints, 1):
            print(f"🧪 Testing [{i:2d}/{len(test_endpoints)}]: {test.method} {test.path}")
            print(f"   Description: {test.description}")
            
            result = await self.test_endpoint(test)
            results.append(result)
            
            if result['success']:
                successful_tests += 1
                status_icon = "✅"
                print(f"   {status_icon} Status: {result['status']} ({result['duration']:.3f}s)")
                if result['response_size'] > 0:
                    print(f"   📄 Response: {result['response_preview']}")
            else:
                failed_tests += 1
                status_icon = "❌"
                print(f"   {status_icon} Status: {result['status']} (expected {result['expected_status']}) ({result['duration']:.3f}s)")
                print(f"   ❌ Error: {result['response_preview']}")
            
            print("-" * 50)
        
        # Summary
        print()
        print("=" * 70)
        print("📊 API ENDPOINT TEST RESULTS SUMMARY")
        print("=" * 70)
        print(f"Total endpoints tested: {len(test_endpoints)}")
        print(f"Successful tests: {successful_tests}")
        print(f"Failed tests: {failed_tests}")
        print(f"Success rate: {(successful_tests / len(test_endpoints) * 100):.1f}%")
        print()
        
        # Group results by status
        success_results = [r for r in results if r['success']]
        failed_results = [r for r in results if not r['success']]
        
        if success_results:
            print("✅ WORKING ENDPOINTS:")
            for result in success_results:
                print(f"   {result['method']} {result['path']} - {result['test']}")
                print(f"      Status: {result['status']}, Duration: {result['duration']:.3f}s")
            print()
        
        if failed_results:
            print("❌ FAILED ENDPOINTS:")
            for result in failed_results:
                print(f"   {result['method']} {result['path']} - {result['test']}")
                print(f"      Status: {result['status']} (expected {result['expected_status']})")
                print(f"      Error: {result['error'] or 'Status code mismatch'}")
            print()
        
        # Overall result
        if failed_tests == 0:
            print("🎉 All API endpoints are working correctly!")
        elif successful_tests > failed_tests:
            print(f"⚠️  Most endpoints working ({successful_tests}/{len(test_endpoints)}), but {failed_tests} need attention.")
        else:
            print(f"🚨 Many endpoints failing ({failed_tests}/{len(test_endpoints)}), system may have issues.")
        
        print()
        print("✨ API endpoint testing completed!")
        
        return {
            'total': len(test_endpoints),
            'successful': successful_tests,
            'failed': failed_tests,
            'results': results,
            'success_rate': successful_tests / len(test_endpoints) * 100
        }

async def main():
    """Main test runner"""
    async with APIEndpointTester() as tester:
        await tester.run_tests()

if __name__ == "__main__":
    asyncio.run(main())