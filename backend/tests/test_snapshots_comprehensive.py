#!/usr/bin/env python3
"""
Comprehensive test of all snapshots router endpoints
"""

import requests
import json
import base64
from datetime import datetime

BASE_URL = "http://localhost:8000"

def test_health_endpoint():
    """Test health endpoint"""
    print("=== Testing Health Endpoint ===")
    try:
        response = requests.get(f"{BASE_URL}/api/snapshots/health", timeout=10)
        print(f"GET /api/snapshots/health: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"  Status: {data.get('status')}")
            print(f"  Service: {data.get('service')}")
            print(f"  Version: {data.get('version')}")
        return response.status_code == 200
    except Exception as e:
        print(f"Health endpoint error: {e}")
        return False

def test_create_snapshot():
    """Test snapshot creation"""
    print("\n=== Testing Snapshot Creation ===")
    try:
        payload = {
            "monitor_index": 0,
            "include_metadata": True,
            "format": "png",
            "quality": 95
        }
        response = requests.post(f"{BASE_URL}/api/snapshots/create", json=payload, timeout=10)
        print(f"POST /api/snapshots/create: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"  Snapshot ID: {data.get('id')}")
            print(f"  Resolution: {data.get('metadata', {}).get('resolution')}")
            print(f"  File size: {data.get('metadata', {}).get('file_size')} bytes")
            return data.get('id')
        return None
    except Exception as e:
        print(f"Snapshot creation error: {e}")
        return None

def test_get_templates():
    """Test template listing"""
    print("\n=== Testing Template Listing ===")
    try:
        response = requests.get(f"{BASE_URL}/api/snapshots/templates", timeout=10)
        print(f"GET /api/snapshots/templates: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"  Total templates: {data.get('total_count', 0)}")
            print(f"  Templates on page: {len(data.get('templates', []))}")
            return True
        return False
    except Exception as e:
        print(f"Template listing error: {e}")
        return False

def test_save_template():
    """Test template saving"""
    print("\n=== Testing Template Saving ===")
    try:
        template_data = {
            "name": "Test Template",
            "description": "Test template created by comprehensive test",
            "snapshot_metadata": {
                "timestamp": datetime.now().isoformat(),
                "resolution": {"width": 1920, "height": 1080},
                "monitor_index": 0,
                "format": "png",
                "file_size": 1024000
            },
            "ocr_zones": [
                {
                    "id": "zone1",
                    "x": 100,
                    "y": 100,
                    "width": 200,
                    "height": 50,
                    "label": "Test Zone",
                    "language": "eng",
                    "confidence_threshold": 0.8
                }
            ],
            "click_actions": [
                {
                    "id": "click1",
                    "x": 150,
                    "y": 125,
                    "label": "Test Click",
                    "action": "left",
                    "wait_before": 0,
                    "wait_after": 500,
                    "retry_count": 3,
                    "timeout": 5000
                }
            ],
            "tags": ["test", "automated"]
        }
        
        response = requests.post(f"{BASE_URL}/api/snapshots/templates", json=template_data, timeout=10)
        print(f"POST /api/snapshots/templates: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            template_id = data.get('template_id')
            print(f"  Template ID: {template_id}")
            return template_id
        return None
    except Exception as e:
        print(f"Template saving error: {e}")
        return None

def test_get_template(template_id):
    """Test specific template retrieval"""
    print(f"\n=== Testing Template Retrieval (ID: {template_id}) ===")
    try:
        response = requests.get(f"{BASE_URL}/api/snapshots/templates/{template_id}", timeout=10)
        print(f"GET /api/snapshots/templates/{template_id}: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"  Template name: {data.get('name')}")
            print(f"  OCR zones: {len(data.get('ocr_zones', []))}")
            print(f"  Click actions: {len(data.get('click_actions', []))}")
            return True
        return False
    except Exception as e:
        print(f"Template retrieval error: {e}")
        return False

def test_get_snapshot(snapshot_id):
    """Test specific snapshot retrieval"""
    if not snapshot_id:
        print("\n=== Skipping Snapshot Retrieval (no snapshot ID) ===")
        return False
        
    print(f"\n=== Testing Snapshot Retrieval (ID: {snapshot_id}) ===")
    try:
        response = requests.get(f"{BASE_URL}/api/snapshots/{snapshot_id}", timeout=10)
        print(f"GET /api/snapshots/{snapshot_id}: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"  Snapshot ID: {data.get('id')}")
            print(f"  Image data length: {len(data.get('image_data', ''))} chars")
            print(f"  Resolution: {data.get('metadata', {}).get('resolution')}")
            return True
        return False
    except Exception as e:
        print(f"Snapshot retrieval error: {e}")
        return False

def test_execute_click():
    """Test click execution"""
    print("\n=== Testing Click Execution ===")
    try:
        click_data = {
            "action_config": {
                "id": "test_click",
                "x": 100,
                "y": 100,
                "label": "Test Click",
                "action": "left",
                "wait_before": 0,
                "wait_after": 500,
                "retry_count": 3,
                "timeout": 5000
            },
            "dry_run": True  # Use dry run to avoid actual clicking
        }
        
        response = requests.post(f"{BASE_URL}/api/snapshots/execute-click", json=click_data, timeout=10)
        print(f"POST /api/snapshots/execute-click: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"  Success: {data.get('success')}")
            print(f"  Message: {data.get('message')}")
            print(f"  Dry run: {data.get('dry_run')}")
            return True
        return False
    except Exception as e:
        print(f"Click execution error: {e}")
        return False

def test_delete_template(template_id):
    """Test template deletion"""
    if not template_id:
        print("\n=== Skipping Template Deletion (no template ID) ===")
        return False
        
    print(f"\n=== Testing Template Deletion (ID: {template_id}) ===")
    try:
        response = requests.delete(f"{BASE_URL}/api/snapshots/templates/{template_id}", timeout=10)
        print(f"DELETE /api/snapshots/templates/{template_id}: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"  Message: {data.get('message')}")
            return True
        return False
    except Exception as e:
        print(f"Template deletion error: {e}")
        return False

def main():
    """Run comprehensive tests"""
    print("TRAE Backend - Comprehensive Snapshots Router Test")
    print("=" * 60)
    
    results = {}
    
    # Test basic functionality
    results['health'] = test_health_endpoint()
    results['create_snapshot'] = test_create_snapshot()
    results['templates_list'] = test_get_templates()
    results['execute_click'] = test_execute_click()
    
    # Test template operations
    template_id = test_save_template()
    results['save_template'] = template_id is not None
    results['get_template'] = test_get_template(template_id)
    results['delete_template'] = test_delete_template(template_id)
    
    # Test snapshot retrieval
    snapshot_id = results['create_snapshot']
    results['get_snapshot'] = test_get_snapshot(snapshot_id)
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name:20} {status}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 ALL TESTS PASSED! Snapshots router is fully functional!")
    else:
        print(f"⚠️  {total - passed} tests failed. Check the logs above.")

if __name__ == "__main__":
    main()