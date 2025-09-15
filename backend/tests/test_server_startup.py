#!/usr/bin/env python3
"""
Test server startup directly to see any errors
"""
import sys
import os
import traceback

# Add backend directory to path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(backend_dir)

def test_server_startup():
    """Test server startup components"""
    print("=== Server Startup Test ===")
    
    try:
        print("1. Testing main app import...")
        from app.main import app
        print("✓ Main app imported successfully")
        
        print("\n2. Testing FastAPI app creation...")
        print(f"✓ App type: {type(app)}")
        
        print("\n3. Testing routes...")
        routes = []
        for route in app.routes:
            if hasattr(route, 'path'):
                routes.append(f"{route.path}")
        
        print(f"✓ Found {len(routes)} routes:")
        v3_routes = [r for r in routes if '/api/v3' in r]
        print(f"✓ V3 API routes: {len(v3_routes)}")
        for route in v3_routes[:5]:  # Show first 5
            print(f"  - {route}")
        
        print("\n4. Testing direct V3 API import...")
        from api_v3 import router as v3_router
        print(f"✓ V3 router imported: {type(v3_router)}")
        
        return True
        
    except Exception as e:
        print(f"✗ Server startup error: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        return False

def main():
    success = test_server_startup()
    if success:
        print("\n✓ Server components are working correctly!")
        print("The issue might be with the uvicorn server process.")
    else:
        print("\n✗ Server startup has issues that need to be resolved")
    
    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)