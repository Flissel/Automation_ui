#!/usr/bin/env python3

import asyncio
import sys
import os
sys.path.append('.')

from app.services.manager import ServiceManager
from app.config import get_settings

async def test_service_initialization():
    """Test service manager initialization to debug live desktop service issue"""
    
    print("🔧 [DEBUG] Testing service manager initialization...")
    
    # Check settings first
    settings = get_settings()
    print(f"📋 [SETTINGS] enable_desktop_streaming: {settings.enable_desktop_streaming}")
    print(f"📋 [SETTINGS] enable_ocr: {settings.enable_ocr}")
    print(f"📋 [SETTINGS] enable_websockets: {settings.enable_websockets}")
    
    # Create service manager
    service_manager = ServiceManager()
    
    try:
        print("\n🚀 [DEBUG] Initializing service manager...")
        await service_manager.initialize()
        
        print(f"✅ [DEBUG] Service manager initialized: {service_manager._initialized}")
        
        # List all services
        services = service_manager.get_service_list()
        print(f"📋 [SERVICES] Available services: {services}")
        
        # Check specific services
        for service_name in ['live_desktop', 'websocket', 'graph_execution']:
            has_service = service_manager.has_service(service_name)
            print(f"🔍 [SERVICE] {service_name}: {'✅ Available' if has_service else '❌ Not Available'}")
            
            if has_service:
                try:
                    service = service_manager.get_service(service_name)
                    is_healthy = service_manager.is_service_healthy(service_name)
                    print(f"   └─ Health: {'✅ Healthy' if is_healthy else '❌ Unhealthy'}")
                    print(f"   └─ Type: {type(service).__name__}")
                except Exception as e:
                    print(f"   └─ Error getting service: {e}")
        
        # Check health status
        health_status = service_manager.get_health_status()
        print(f"\n📊 [HEALTH] Overall health status: {health_status}")
        
    except Exception as e:
        print(f"💥 [ERROR] Failed to initialize service manager: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        try:
            await service_manager.cleanup()
            print("🧹 [CLEANUP] Service manager cleanup completed")
        except Exception as e:
            print(f"⚠️ [CLEANUP] Error during cleanup: {e}")

if __name__ == "__main__":
    asyncio.run(test_service_initialization())