#!/usr/bin/env python3

import requests
import json

def test_endpoint(url, description):
    """Test a single endpoint and return results"""
    print(f"\n=== Testing {description} ===")
    print(f"URL: {url}")
    
    try:
        response = requests.get(url, timeout=5)
        print(f"Status Code: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"Response: {json.dumps(data, indent=2)}")
            except:
                print(f"Response Text: {response.text}")
        else:
            print(f"Error Response: {response.text}")
            
        return response.status_code == 200
        
    except Exception as e:
        print(f"Exception: {str(e)}")
        return False

if __name__ == "__main__":
    base_url = "http://localhost:8000"
    
    print("=== V3 API Direct Endpoint Testing ===")
    
    # Test both endpoints
    results = {}
    results["health"] = test_endpoint(f"{base_url}/api/v3/health", "V3 Health Endpoint")
    results["node-templates"] = test_endpoint(f"{base_url}/api/v3/node-templates", "V3 Node Templates Endpoint")
    
    # Test for comparison - a working endpoint
    results["main-health"] = test_endpoint(f"{base_url}/api/health", "Main Health Endpoint")
    
    print(f"\n=== SUMMARY ===")
    for endpoint, success in results.items():
        status = "✓ SUCCESS" if success else "✗ FAILED"
        print(f"{endpoint}: {status}")