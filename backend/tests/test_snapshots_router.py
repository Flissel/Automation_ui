#!/usr/bin/env python3

"""Test script to verify snapshots router can be imported and initialized properly."""

import sys
sys.path.insert(0, '.')

try:
    print("Testing snapshots router import...")
    from app.routers.snapshots import router as snapshots_router
    print("✓ Snapshots router imported successfully")
    
    print(f"✓ Router prefix: {snapshots_router.prefix}")
    print(f"✓ Router tags: {snapshots_router.tags}")
    
    # Check if routes are defined
    print(f"✓ Number of routes: {len(snapshots_router.routes)}")
    
    # List all routes
    print("\nRoutes in snapshots router:")
    for route in snapshots_router.routes:
        if hasattr(route, 'methods') and hasattr(route, 'path'):
            print(f"  {route.methods} {route.path}")
        else:
            print(f"  {type(route).__name__}: {route}")
    
    print("\n✓ Snapshots router is properly configured")
    
except Exception as e:
    print(f"✗ Error with snapshots router: {e}")
    import traceback
    traceback.print_exc()