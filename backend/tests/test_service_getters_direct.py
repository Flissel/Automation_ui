#!/usr/bin/env python3

import asyncio
import requests
import json

def test_service_getters_endpoint():
    """Test service getters through a dedicated endpoint"""
    try:
        # Test the service getters by hitting an endpoint that uses them
        response = requests.get("http://localhost:8007/api/desktop/screenshot", timeout=15)
        print(f"Desktop Screenshot API Status: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Desktop screenshot API works - live_desktop_service is accessible")
            # Try to check content type
            print(f"Content-Type: {response.headers.get('content-type', 'unknown')}")
            print(f"Content-Length: {response.headers.get('content-length', 'unknown')} bytes")
        else:
            print(f"❌ Desktop screenshot failed: {response.status_code}")
            try:
                error_data = response.json()
                print(f"Error details: {json.dumps(error_data, indent=2)}")
            except:
                print(f"Error text: {response.text}")
                
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend server - is it running on port 8007?")
    except Exception as e:
        print(f"❌ Error testing service getters: {e}")

async def test_websocket_service_import():
    """Test importing service getters directly in runtime context"""
    try:
        # Import the service managers directly
        import sys
        import os
        sys.path.insert(0, os.path.dirname(__file__))
        
        # Import the service getters from the actual module
        from app.services import (
            get_websocket_service,
            get_live_desktop_service, 
            get_file_watcher_service,
            get_click_automation_service
        )
        from app.services.manager import manager
        
        print("=== Direct Service Getter Test ===")
        print(f"Manager initialized: {manager._initialized}")
        print(f"Manager services count: {len(manager._services) if hasattr(manager, '_services') else 'N/A'}")
        
        # Test each service getter
        services_to_test = [
            ("websocket", get_websocket_service),
            ("live_desktop", get_live_desktop_service), 
            ("file_watcher", get_file_watcher_service),
            ("click_automation", get_click_automation_service)
        ]
        
        for service_name, getter_func in services_to_test:
            try:
                service = getter_func()
                print(f"🔍 {service_name}_service: {service is not None} ({type(service).__name__ if service else 'None'})")
            except Exception as e:
                print(f"❌ {service_name}_service error: {e}")
                
        return True
        
    except Exception as e:
        print(f"❌ Error in direct service test: {e}")
        return False

def main():
    print("=== Testing Service Getters ===")
    
    # Test through HTTP endpoint first
    test_service_getters_endpoint()
    print()
    
    # Test direct service imports
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        success = loop.run_until_complete(test_websocket_service_import())
        loop.close()
    except Exception as e:
        print(f"❌ Async test failed: {e}")

if __name__ == "__main__":
    main()