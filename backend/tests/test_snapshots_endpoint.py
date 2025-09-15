#!/usr/bin/env python3
"""Test script for snapshots endpoints."""

import requests
import json

def test_snapshots_health():
    """Test the snapshots health endpoint."""
    try:
        url = "http://localhost:8000/api/snapshots/health"
        print(f"Testing: {url}")
        
        response = requests.get(url, headers={"accept": "application/json"})
        print(f"Status Code: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("✓ Snapshots health endpoint working!")
            return True
        else:
            print(f"✗ Snapshots health endpoint failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"✗ Error testing snapshots health: {e}")
        return False

def test_openapi_schema():
    """Test if snapshots endpoints appear in OpenAPI schema."""
    try:
        url = "http://localhost:8000/openapi.json"
        print(f"\nTesting OpenAPI schema: {url}")
        
        response = requests.get(url)
        if response.status_code == 200:
            openapi_data = response.json()
            paths = openapi_data.get("paths", {})
            
            # Look for snapshots paths
            snapshot_paths = [path for path in paths.keys() if "snapshots" in path]
            print(f"Snapshot paths in OpenAPI: {snapshot_paths}")
            
            if snapshot_paths:
                print("✓ Snapshots paths found in OpenAPI schema!")
                return True
            else:
                print("✗ No snapshots paths found in OpenAPI schema")
                return False
        else:
            print(f"✗ Failed to get OpenAPI schema: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"✗ Error testing OpenAPI schema: {e}")
        return False

def test_health_endpoint():
    """Test the regular health endpoint for comparison."""
    try:
        url = "http://localhost:8000/api/health"
        print(f"\nTesting health endpoint for comparison: {url}")
        
        response = requests.get(url, headers={"accept": "application/json"})
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("✓ Health endpoint working!")
            return True
        else:
            print(f"✗ Health endpoint failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"✗ Error testing health endpoint: {e}")
        return False

if __name__ == "__main__":
    print("Testing snapshots endpoints...")
    print("=" * 50)
    
    # Test regular health endpoint first
    test_health_endpoint()
    
    # Test snapshots health endpoint
    test_snapshots_health()
    
    # Test OpenAPI schema
    test_openapi_schema()
    
    print("\n" + "=" * 50)
    print("Testing complete!")