#!/usr/bin/env python3

"""Test script to debug service imports in WebSocket router"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_service_imports():
    print("=== Testing Service Imports ===")
    
    try:
        from app.services import get_live_desktop_service
        print("✅ Import successful: get_live_desktop_service")
        
        service = get_live_desktop_service()
        print(f"Live desktop service: {service}")
        print(f"Service type: {type(service)}")
        
        if service:
            print("✅ Service available")
            if hasattr(service, 'handle_websocket'):
                print("✅ Service has handle_websocket method")
            else:
                print("❌ Service missing handle_websocket method")
        else:
            print("❌ Service is None")
            
    except ImportError as e:
        print(f"❌ Import error: {e}")
    except Exception as e:
        print(f"❌ General error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_service_imports()