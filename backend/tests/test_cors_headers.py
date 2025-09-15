#!/usr/bin/env python3

import requests

def test_cors_headers():
    """Test CORS headers from the API"""
    
    # Test with Origin header
    headers = {
        "Origin": "http://localhost:5174"
    }
    
    try:
        response = requests.get("http://localhost:8000/api/v3/node-templates", headers=headers)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers:")
        for key, value in response.headers.items():
            if 'cors' in key.lower() or 'access-control' in key.lower() or 'origin' in key.lower():
                print(f"  {key}: {value}")
        
        print(f"\nAll Headers:")
        for key, value in response.headers.items():
            print(f"  {key}: {value}")
            
        # Test OPTIONS preflight request
        print(f"\n\n=== Testing OPTIONS Preflight ===")
        options_response = requests.options("http://localhost:8000/api/v3/node-templates", headers=headers)
        print(f"OPTIONS Status Code: {options_response.status_code}")
        print(f"OPTIONS Response Headers:")
        for key, value in options_response.headers.items():
            print(f"  {key}: {value}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_cors_headers()