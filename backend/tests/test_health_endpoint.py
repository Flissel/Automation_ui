#!/usr/bin/env python3

import requests
import json

def test_health_endpoint():
    """Test the health endpoint"""
    try:
        response = requests.get("http://localhost:8007/api/health", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            health_data = response.json()
            print("Health Response:")
            print(json.dumps(health_data, indent=2))
            
            # Check specific service states
            services = health_data.get('services', {})
            print("\nService States:")
            for service_name, service_info in services.items():
                status = service_info.get('status', 'unknown')
                print(f"  {service_name}: {status}")
                
        else:
            print(f"Health check failed with status {response.status_code}")
            print(response.text)
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend server - is it running on port 8007?")
    except Exception as e:
        print(f"❌ Error testing health endpoint: {e}")

if __name__ == "__main__":
    test_health_endpoint()