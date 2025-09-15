#!/usr/bin/env python3

import asyncio
import aiohttp
import json
from datetime import datetime

async def test_snapshots_endpoints():
    """Test all snapshots endpoints after fixing dependency injection"""
    
    base_url = "http://localhost:8000"
    
    async with aiohttp.ClientSession() as session:
        print("Testing Snapshots Endpoints After Fix")
        print("=" * 50)
        
        # Test endpoints
        endpoints = [
            ("GET", "/api/snapshots/health", "Health check"),
            ("GET", "/api/snapshots/templates", "List templates"),
            ("POST", "/api/snapshots/templates", "Save template"),
            ("GET", "/api/snapshots/templates/test-id", "Get template"),
            ("DELETE", "/api/snapshots/templates/test-id", "Delete template"),
            ("POST", "/api/snapshots/create", "Create snapshot"),
            ("GET", "/api/snapshots/test-id", "Get snapshot"),
            ("POST", "/api/snapshots/process-ocr", "Process OCR"),
            ("POST", "/api/snapshots/execute-click", "Execute click")
        ]
        
        for method, endpoint, description in endpoints:
            try:
                url = f"{base_url}{endpoint}"
                print(f"\n{method} {endpoint} - {description}")
                
                # Prepare request data based on endpoint
                data = None
                if method == "POST":
                    if "create" in endpoint:
                        data = {
                            "monitor_index": 0,
                            "include_metadata": True,
                            "format": "png"
                        }
                    elif "templates" in endpoint and not endpoint.endswith("templates"):
                        # Skip for now as we don't have a valid template structure
                        print("  → Skipping template creation test")
                        continue
                    elif "process-ocr" in endpoint:
                        data = {
                            "snapshot_id": "test-id",
                            "zone_config": {
                                "id": "test-zone",
                                "x": 0,
                                "y": 0,
                                "width": 100,
                                "height": 50,
                                "label": "Test Zone"
                            }
                        }
                    elif "execute-click" in endpoint:
                        data = {
                            "action_config": {
                                "id": "test-click",
                                "x": 100,
                                "y": 100,
                                "label": "Test Click",
                                "action": "left"
                            },
                            "dry_run": True
                        }
                
                # Make request
                if method == "GET":
                    async with session.get(url) as response:
                        status = response.status
                        try:
                            result = await response.json()
                        except:
                            result = await response.text()
                elif method == "POST":
                    async with session.post(url, json=data) as response:
                        status = response.status
                        try:
                            result = await response.json()
                        except:
                            result = await response.text()
                elif method == "DELETE":
                    async with session.delete(url) as response:
                        status = response.status
                        try:
                            result = await response.json()
                        except:
                            result = await response.text()
                
                # Display results
                print(f"  Status: {status}")
                if status == 200:
                    print("  ✅ SUCCESS")
                    if isinstance(result, dict):
                        if "status" in result:
                            print(f"  Service Status: {result['status']}")
                        elif "message" in result:
                            print(f"  Message: {result['message']}")
                        elif "templates" in result:
                            print(f"  Templates Count: {len(result['templates'])}")
                        elif "success" in result:
                            print(f"  Success: {result['success']}")
                elif status == 404:
                    print("  ❌ NOT FOUND")
                    if isinstance(result, dict) and "detail" in result:
                        if "not found" in result["detail"]:
                            print(f"  Expected 404: {result['detail']}")
                        else:
                            print(f"  Unexpected 404: {result['detail']}")
                elif status == 422:
                    print("  ⚠️  VALIDATION ERROR")
                    if isinstance(result, dict) and "detail" in result:
                        print(f"  Validation Details: {result['detail']}")
                else:
                    print(f"  ❌ ERROR: {status}")
                    if isinstance(result, dict) and "detail" in result:
                        print(f"  Error: {result['detail']}")
                    else:
                        print(f"  Response: {result}")
                        
            except Exception as e:
                print(f"  ❌ EXCEPTION: {e}")
        
        print("\n" + "=" * 50)
        print("Snapshots Endpoints Test Complete")

if __name__ == "__main__":
    asyncio.run(test_snapshots_endpoints())