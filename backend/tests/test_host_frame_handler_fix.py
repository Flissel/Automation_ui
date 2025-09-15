#!/usr/bin/env python3
"""
Test Host Frame Handler Fix
Quick test to verify that the hasattr check now works for set_host_frame method
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'services'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

def test_service_method_detection():
    """Test that we can detect the set_host_frame method"""
    print("Testing service method detection...")
    
    try:
        # Test 1: Import the service directly
        from services.live_desktop_service import get_live_desktop_service
        print("✅ Successfully imported get_live_desktop_service from services")
        
        # Get service instance
        desktop_service = get_live_desktop_service()
        print(f"✅ Got service instance: {type(desktop_service)}")
        
        # Test hasattr check
        has_method = hasattr(desktop_service, 'set_host_frame')
        print(f"✅ hasattr(desktop_service, 'set_host_frame'): {has_method}")
        
        if has_method:
            print("✅ Method detection SUCCESS - set_host_frame is now detectable!")
            
            # Test method signature
            import inspect
            sig = inspect.signature(desktop_service.set_host_frame)
            print(f"✅ Method signature: {sig}")
            
            # Test if it's callable
            print(f"✅ Method is callable: {callable(desktop_service.set_host_frame)}")
            
        else:
            print("❌ Method detection FAILED - set_host_frame still not detectable")
            
    except Exception as e:
        print(f"❌ Error testing service method detection: {e}")
        return False
        
    try:
        # Test 2: Import through app services
        from app.services import get_live_desktop_service as app_get_service
        print("✅ Successfully imported get_live_desktop_service from app.services")
        
        # Get service instance
        app_desktop_service = app_get_service()
        if app_desktop_service:
            print(f"✅ Got app service instance: {type(app_desktop_service)}")
            
            # Test hasattr check
            app_has_method = hasattr(app_desktop_service, 'set_host_frame')
            print(f"✅ hasattr(app_desktop_service, 'set_host_frame'): {app_has_method}")
            
            if app_has_method:
                print("✅ App service method detection SUCCESS!")
            else:
                print("❌ App service method detection FAILED")
        else:
            print("⚠️ App service instance is None (service manager not initialized)")
            
    except Exception as e:
        print(f"❌ Error testing app service method detection: {e}")
        return False
        
    return True

def simulate_router_check():
    """Simulate the router's hasattr check"""
    print("\n" + "="*60)
    print("SIMULATING ROUTER CHECK")
    print("="*60)
    
    try:
        # Import the exact same way the router does
        from app.services import get_live_desktop_service
        
        # Get service the same way
        desktop_service = get_live_desktop_service()
        
        if desktop_service is None:
            print("❌ Router simulation: desktop_service is None")
            return False
            
        print(f"✅ Router simulation: Got service {type(desktop_service)}")
        
        # Perform the exact hasattr check from the router
        has_handler = hasattr(desktop_service, 'set_host_frame')
        print(f"✅ Router simulation: hasattr result = {has_handler}")
        
        if has_handler:
            print("🎉 ROUTER CHECK SHOULD NOW PASS!")
            return True
        else:
            print("❌ ROUTER CHECK WOULD STILL FAIL")
            return False
            
    except Exception as e:
        print(f"❌ Router simulation error: {e}")
        return False

if __name__ == "__main__":
    print("Testing Host Frame Handler Fix")
    print("="*60)
    
    success1 = test_service_method_detection()
    success2 = simulate_router_check()
    
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    if success1 and success2:
        print("🎉 ALL TESTS PASSED - Handler fix is working!")
        print("The router should now detect set_host_frame method correctly")
    else:
        print("❌ Some tests failed - handler fix needs more work")