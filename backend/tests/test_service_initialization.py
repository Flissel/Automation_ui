#!/usr/bin/env python3
"""
Test Service Initialization Debug Script
Tests the service manager initialization to identify import issues.
"""

import sys
import os
import asyncio

# Add the backend directory to Python path
backend_path = os.path.dirname(os.path.abspath(__file__))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

async def test_service_initialization():
    """Test service manager initialization"""
    print("=== TRAE Backend Service Initialization Test ===")
    
    try:
        # Import service manager
        from app.services.manager import ServiceManager, get_service_manager
        from app.config import get_settings
        
        print("✓ Successfully imported ServiceManager and settings")
        
        # Get settings
        settings = get_settings()
        print(f"✓ Settings loaded - OCR: {settings.enable_ocr}, Desktop: {settings.enable_desktop_streaming}, FileWatcher: {settings.enable_file_watcher}")
        
        # Create service manager
        service_manager = ServiceManager()
        print("✓ ServiceManager instance created")
        
        # Test individual service imports
        print("\n=== Testing Individual Service Imports ===")
        
        # Test import paths
        services_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'services')
        print(f"Services path: {services_path}")
        print(f"Services path exists: {os.path.exists(services_path)}")
        
        if services_path not in sys.path:
            sys.path.insert(0, services_path)
            print(f"✓ Added services path to sys.path")
        
        # Test each service import
        services_to_test = [
            ('graph_execution_service', 'GraphExecutionService'),
            ('websocket_service', 'WebSocketService'),
            ('click_automation_service', 'ClickAutomationService'),
            ('live_desktop_service', 'LiveDesktopService'),
            ('file_watcher_service', 'FileWatcherService'),
            ('ocr_monitoring_service', 'OCRMonitoringService'),
        ]
        
        successful_imports = []
        failed_imports = []
        
        for module_name, class_name in services_to_test:
            try:
                module = __import__(module_name)
                service_class = getattr(module, class_name)
                print(f"✓ {module_name}.{class_name} - Success")
                successful_imports.append((module_name, class_name))
            except Exception as e:
                print(f"✗ {module_name}.{class_name} - Failed: {e}")
                failed_imports.append((module_name, class_name, str(e)))
        
        print(f"\n=== Import Summary ===")
        print(f"Successful imports: {len(successful_imports)}")
        print(f"Failed imports: {len(failed_imports)}")
        
        # Try to initialize service manager
        print(f"\n=== Testing Service Manager Initialization ===")
        try:
            await service_manager.initialize()
            print("✓ Service manager initialized successfully")
            
            # Check services
            service_list = service_manager.get_service_list()
            health_status = service_manager.get_health_status()
            
            print(f"Available services: {service_list}")
            print(f"Health status: {health_status}")
            
            # Test service getters
            print(f"\n=== Testing Service Getters ===")
            from app.services import (
                get_websocket_service,
                get_live_desktop_service,
                get_file_watcher_service,
                get_click_automation_service
            )
            
            getters_to_test = [
                ('websocket', get_websocket_service),
                ('live_desktop', get_live_desktop_service),
                ('file_watcher', get_file_watcher_service),
                ('click_automation', get_click_automation_service),
            ]
            
            for service_name, getter_func in getters_to_test:
                try:
                    service = getter_func()
                    print(f"✓ {service_name} service getter: {service is not None}")
                except Exception as e:
                    print(f"✗ {service_name} service getter failed: {e}")
            
            # Cleanup
            await service_manager.cleanup()
            print("✓ Service manager cleaned up")
            
        except Exception as e:
            print(f"✗ Service manager initialization failed: {e}")
            import traceback
            traceback.print_exc()
        
    except Exception as e:
        print(f"✗ Script failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_service_initialization())