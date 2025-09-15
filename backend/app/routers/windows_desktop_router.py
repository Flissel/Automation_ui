#!/usr/bin/env python3
"""
Windows Desktop Router for TRAE Remote Desktop

Provides API endpoints for Windows host desktop streaming and management.
Integrates with existing desktop switching system.

Endpoints:
- Windows desktop streaming control
- SSH connection management
- Desktop switching with Windows support
- Performance monitoring
- Configuration management

Author: TRAE Autonomous Programming Project
Version: 1.0.0
Date: 2024
"""

import asyncio
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# Import services
try:
    # Try relative imports first (when running as module)
    from ..services.windows_desktop_streaming_service import (
        get_windows_desktop_service, 
        WindowsDesktopStreamingService,
        WindowsDesktopConfig
    )
    from ..services.hybrid_desktop_websocket import (
        get_hybrid_desktop_service,
        HybridDesktopWebSocketService
    )
    from ..services.ssh_client_service import get_ssh_client_service
except ImportError:
    # Fallback to absolute imports (when running directly)
    try:
        from app.services.windows_desktop_streaming_service import (
            get_windows_desktop_service, 
            WindowsDesktopStreamingService,
            WindowsDesktopConfig
        )
        from app.services.hybrid_desktop_websocket import (
            get_hybrid_desktop_service,
            HybridDesktopWebSocketService
        )
        from app.services.ssh_client_service import get_ssh_client_service
    except ImportError:
        # Final fallback for container environment
        import sys
        import os
        sys.path.append('/app')
        from app.services.windows_desktop_streaming_service import (
            get_windows_desktop_service, 
            WindowsDesktopStreamingService,
            WindowsDesktopConfig
        )
        from app.services.hybrid_desktop_websocket import (
            get_hybrid_desktop_service,
            HybridDesktopWebSocketService
        )
        from app.services.ssh_client_service import get_ssh_client_service

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(
    tags=["windows-desktop"],
    responses={404: {"description": "Not found"}}
)

# Pydantic models for request/response
class WindowsDesktopStreamingRequest(BaseModel):
    """Request model for starting Windows desktop streaming"""
    connection_name: str = Field(default="host_system", description="SSH connection name")
    fps: Optional[int] = Field(default=8, ge=1, le=30, description="Frames per second")
    scale_factor: Optional[float] = Field(default=0.8, ge=0.1, le=2.0, description="Scale factor")
    quality: Optional[int] = Field(default=85, ge=10, le=100, description="Image quality")

class WindowsDesktopConfigRequest(BaseModel):
    """Request model for updating Windows desktop configuration"""
    fps: Optional[int] = Field(None, ge=1, le=30)
    scale_factor: Optional[float] = Field(None, ge=0.1, le=2.0)
    quality: Optional[int] = Field(None, ge=10, le=100)
    screenshot_method: Optional[str] = Field(None, pattern="^(powershell|vnc|rdp)$")
    connection_timeout: Optional[int] = Field(None, ge=5, le=120)

class DesktopSwitchRequest(BaseModel):
    """Request model for desktop switching"""
    target_id: str = Field(..., description="Target desktop ID")
    force: bool = Field(default=False, description="Force switch even if target unavailable")

class SSHConnectionTestRequest(BaseModel):
    """Request model for testing SSH connection"""
    connection_name: str = Field(..., description="SSH connection name")
    test_screenshot: bool = Field(default=True, description="Test screenshot capability")

# API Endpoints

@router.get("/status")
async def get_windows_desktop_status():
    """
    Get Windows desktop streaming status
    
    Returns current status, configuration, and performance metrics.
    """
    try:
        windows_service = await get_windows_desktop_service()
        status = windows_service.get_status()
        
        return JSONResponse({
            "success": True,
            "data": status,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error getting Windows desktop status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get status: {str(e)}")

@router.post("/start")
async def start_windows_desktop_streaming(request: WindowsDesktopStreamingRequest):
    """
    Start Windows desktop streaming
    
    Initiates streaming from Windows host via SSH connection.
    """
    try:
        windows_service = await get_windows_desktop_service()
        
        # Update configuration if provided
        if request.fps:
            windows_service.config.fps = request.fps
        if request.scale_factor:
            windows_service.config.scale_factor = request.scale_factor
        if request.quality:
            windows_service.config.quality = request.quality
        
        # Start streaming
        success = await windows_service.start_streaming(request.connection_name)
        
        if success:
            return JSONResponse({
                "success": True,
                "message": "Windows desktop streaming started",
                "data": {
                    "connection_name": request.connection_name,
                    "config": {
                        "fps": windows_service.config.fps,
                        "scale_factor": windows_service.config.scale_factor,
                        "quality": windows_service.config.quality
                    }
                },
                "timestamp": datetime.now().isoformat()
            })
        else:
            raise HTTPException(
                status_code=400, 
                detail="Failed to start Windows desktop streaming. Check SSH connection."
            )
            
    except Exception as e:
        logger.error(f"Error starting Windows desktop streaming: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start streaming: {str(e)}")

@router.post("/stop")
async def stop_windows_desktop_streaming():
    """
    Stop Windows desktop streaming
    
    Stops current Windows desktop streaming and cleans up resources.
    """
    try:
        windows_service = await get_windows_desktop_service()
        await windows_service.stop_streaming()
        
        return JSONResponse({
            "success": True,
            "message": "Windows desktop streaming stopped",
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error stopping Windows desktop streaming: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to stop streaming: {str(e)}")

@router.get("/screenshot")
async def capture_windows_screenshot():
    """
    Capture a single screenshot from Windows host
    
    Returns base64 encoded screenshot for testing purposes.
    """
    try:
        windows_service = await get_windows_desktop_service()
        
        # Ensure we're connected
        if not windows_service.current_connection:
            # Try to connect with default connection
            connected = await windows_service.connect_to_windows_host("host_system")
            if not connected:
                raise HTTPException(
                    status_code=400, 
                    detail="No active SSH connection to Windows host"
                )
        
        # Capture screenshot
        image_data, resolution = await windows_service.capture_windows_desktop()
        
        if image_data and resolution:
            return JSONResponse({
                "success": True,
                "data": {
                    "image": image_data,
                    "resolution": {
                        "width": resolution[0],
                        "height": resolution[1]
                    },
                    "connection": windows_service.current_connection
                },
                "timestamp": datetime.now().isoformat()
            })
        else:
            raise HTTPException(
                status_code=500, 
                detail="Failed to capture Windows desktop screenshot"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error capturing Windows screenshot: {e}")
        raise HTTPException(status_code=500, detail=f"Screenshot failed: {str(e)}")

@router.put("/config")
async def update_windows_desktop_config(request: WindowsDesktopConfigRequest):
    """
    Update Windows desktop streaming configuration
    
    Updates streaming parameters like FPS, quality, scale factor, etc.
    """
    try:
        windows_service = await get_windows_desktop_service()
        
        # Update configuration
        updated_fields = {}
        if request.fps is not None:
            windows_service.config.fps = request.fps
            updated_fields["fps"] = request.fps
        if request.scale_factor is not None:
            windows_service.config.scale_factor = request.scale_factor
            updated_fields["scale_factor"] = request.scale_factor
        if request.quality is not None:
            windows_service.config.quality = request.quality
            updated_fields["quality"] = request.quality
        if request.screenshot_method is not None:
            windows_service.config.screenshot_method = request.screenshot_method
            updated_fields["screenshot_method"] = request.screenshot_method
        if request.connection_timeout is not None:
            windows_service.config.connection_timeout = request.connection_timeout
            updated_fields["connection_timeout"] = request.connection_timeout
        
        return JSONResponse({
            "success": True,
            "message": "Windows desktop configuration updated",
            "data": {
                "updated_fields": updated_fields,
                "current_config": {
                    "fps": windows_service.config.fps,
                    "scale_factor": windows_service.config.scale_factor,
                    "quality": windows_service.config.quality,
                    "screenshot_method": windows_service.config.screenshot_method,
                    "connection_timeout": windows_service.config.connection_timeout
                }
            },
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error updating Windows desktop config: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update config: {str(e)}")

@router.post("/test-connection")
async def test_ssh_connection(request: SSHConnectionTestRequest):
    """
    Test SSH connection to Windows host
    
    Tests connectivity and optionally screenshot capability.
    """
    try:
        windows_service = await get_windows_desktop_service()
        
        # Test connection
        connected = await windows_service.connect_to_windows_host(request.connection_name)
        
        result = {
            "connection_name": request.connection_name,
            "connected": connected,
            "timestamp": datetime.now().isoformat()
        }
        
        if connected and request.test_screenshot:
            # Test screenshot capability
            image_data, resolution = await windows_service.capture_windows_desktop()
            result["screenshot_test"] = {
                "success": image_data is not None,
                "resolution": resolution if resolution else None
            }
        
        return JSONResponse({
            "success": True,
            "data": result
        })
        
    except Exception as e:
        logger.error(f"Error testing SSH connection: {e}")
        raise HTTPException(status_code=500, detail=f"Connection test failed: {str(e)}")

@router.get("/connections")
async def get_ssh_connections():
    """
    Get available SSH connections for Windows desktop streaming
    
    Returns list of configured SSH connections that can be used for desktop streaming.
    """
    try:
        ssh_service = await get_ssh_client_service()
        connections = []
        
        for name, config in ssh_service.connections.items():
            status = ssh_service.connection_status.get(name)
            connections.append({
                "name": name,
                "host": config.host,
                "port": config.port,
                "username": config.username,
                "desktop_type": config.desktop_type,
                "connected": status.connected if status else False,
                "last_connected": status.last_connected.isoformat() if status and status.last_connected else None
            })
        
        return JSONResponse({
            "success": True,
            "data": {
                "connections": connections,
                "total": len(connections)
            },
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error getting SSH connections: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get connections: {str(e)}")

# Hybrid Desktop Integration

@router.post("/switch-desktop")
async def switch_desktop_target(request: DesktopSwitchRequest):
    """
    Switch desktop target (integrated with hybrid desktop service)
    
    Switches between Linux container desktop and Windows host desktop.
    """
    try:
        hybrid_service = await get_hybrid_desktop_service()
        
        # Perform desktop switch
        success = await hybrid_service.switch_desktop(request.target_id)
        
        if success:
            return JSONResponse({
                "success": True,
                "message": f"Successfully switched to desktop: {request.target_id}",
                "data": {
                    "target_id": request.target_id,
                    "current_desktop": hybrid_service.current_desktop,
                    "available_desktops": await hybrid_service.get_available_desktops()
                },
                "timestamp": datetime.now().isoformat()
            })
        else:
            if request.force:
                # Force switch even if failed
                hybrid_service.current_desktop = request.target_id
                return JSONResponse({
                    "success": True,
                    "message": f"Force switched to desktop: {request.target_id}",
                    "data": {
                        "target_id": request.target_id,
                        "current_desktop": hybrid_service.current_desktop,
                        "forced": True
                    },
                    "timestamp": datetime.now().isoformat()
                })
            else:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Failed to switch to desktop: {request.target_id}"
                )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error switching desktop: {e}")
        raise HTTPException(status_code=500, detail=f"Desktop switch failed: {str(e)}")

@router.get("/hybrid-status")
async def get_hybrid_desktop_status():
    """
    Get hybrid desktop service status
    
    Returns status of both Linux and Windows desktop streaming capabilities.
    """
    try:
        hybrid_service = await get_hybrid_desktop_service()
        status = hybrid_service.get_status()
        
        # Add additional information
        status["available_desktops"] = await hybrid_service.get_available_desktops()
        status["capabilities"] = await hybrid_service.get_capabilities()
        
        return JSONResponse({
            "success": True,
            "data": status,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error getting hybrid desktop status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get hybrid status: {str(e)}")

# WebSocket endpoint for hybrid desktop streaming

@router.websocket("/stream")
async def windows_desktop_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for Windows desktop streaming
    
    Provides real-time desktop streaming with support for desktop switching.
    """
    await websocket.accept()
    
    try:
        hybrid_service = await get_hybrid_desktop_service()
        await hybrid_service.register_client(websocket)
        
        logger.info("Windows desktop WebSocket client connected")
        
        # Handle incoming messages
        while True:
            try:
                message = await websocket.receive_text()
                await hybrid_service.handle_client_message(websocket, message)
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"WebSocket message error: {e}")
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "data": {"message": f"Message processing error: {str(e)}"}
                }))
                
    except WebSocketDisconnect:
        logger.info("Windows desktop WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
    finally:
        try:
            hybrid_service = await get_hybrid_desktop_service()
            await hybrid_service.unregister_client(websocket)
        except:
            pass

# Health check endpoint

@router.get("/health")
async def health_check():
    """
    Health check for Windows desktop streaming service
    
    Returns service health status and basic diagnostics.
    """
    try:
        health_status = {
            "service": "windows-desktop",
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "checks": {}
        }
        
        # Check Windows desktop service
        try:
            windows_service = await get_windows_desktop_service()
            health_status["checks"]["windows_service"] = "available"
        except Exception as e:
            health_status["checks"]["windows_service"] = f"error: {str(e)}"
            health_status["status"] = "degraded"
        
        # Check SSH service
        try:
            ssh_service = await get_ssh_client_service()
            health_status["checks"]["ssh_service"] = "available"
        except Exception as e:
            health_status["checks"]["ssh_service"] = f"error: {str(e)}"
            health_status["status"] = "degraded"
        
        # Check hybrid service
        try:
            hybrid_service = await get_hybrid_desktop_service()
            health_status["checks"]["hybrid_service"] = "available"
        except Exception as e:
            health_status["checks"]["hybrid_service"] = f"error: {str(e)}"
            health_status["status"] = "degraded"
        
        return JSONResponse(health_status)
        
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return JSONResponse({
            "service": "windows-desktop",
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }, status_code=500)