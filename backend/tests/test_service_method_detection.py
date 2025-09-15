#!/usr/bin/env python3
"""
Direct Service Method Detection Test

Test the live desktop service instantiation and method detection.
"""

import sys
import os
import asyncio

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from backend.app.services import get_live_desktop_service

async def test_service_method_detection():
    """Test service method detection directly"""
    print("=== Testing Service Method Detection ===")
    
    try:
        # Get the service instance
        print("1. Getting live desktop service...")
        desktop_service = get_live_desktop_service()
        
        print(f"2. Service instance: {desktop_service}")
        print(f"   Type: {type(desktop_service)}")
        
        if desktop_service is None:
            print("   ERROR: Service is None!")
            return False
        
        # Check for set_host_frame method
        print("3. Checking for set_host_frame method...")
        has_method = hasattr(desktop_service, 'set_host_frame')
        print(f"   hasattr(desktop_service, 'set_host_frame'): {has_method}")
        
        # List all methods
        print("4. Available methods:")
        methods = [method for method in dir(desktop_service) if not method.startswith('_')]
        for method in sorted(methods):
            print(f"   - {method}")
        
        # Check if it's callable
        if has_method:
            method_obj = getattr(desktop_service, 'set_host_frame')
            print(f"5. Method object: {method_obj}")
            print(f"   Callable: {callable(method_obj)}")
        
        # Test the service path
        print(f"6. Service module: {desktop_service.__class__.__module__}")
        print(f"   Service class: {desktop_service.__class__.__name__}")
        
        return has_method
        
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    result = asyncio.run(test_service_method_detection())
    print(f"\n=== Result: {'SUCCESS' if result else 'FAILURE'} ===")