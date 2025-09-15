"""
Simple backend status check
"""

import requests
import sys

def test_backend_status():
    try:
        # Test basic connectivity
        response = requests.get("http://localhost:8007/api/health", timeout=3)
        print(f"Backend status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Services: {data.get('service_count', 0)} services")
            print(f"Live desktop service: {data.get('services', {}).get('live_desktop', 'unknown')}")
        
        return response.status_code == 200
        
    except requests.exceptions.ConnectRefused:
        print("❌ Backend server is not running")
        return False
    except requests.exceptions.Timeout:
        print("❌ Backend server timeout")
        return False
    except Exception as e:
        print(f"❌ Backend server error: {e}")
        return False

if __name__ == "__main__":
    success = test_backend_status()
    sys.exit(0 if success else 1)