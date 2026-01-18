"""
API Routers Package for TRAE Backend

Contains all FastAPI router modules organized by functionality.
"""

# from .windows_desktop_router import router as windows_desktop_router
from .api_v1 import router as api_v1_router
from .client_manager import router as client_manager_router
from .desktop import router as desktop_router
from .health import router as health_router
from .mcp_bridge import router as mcp_bridge_router
from .node_configs import router as node_configs_router
# Temporarily disabled routers - missing services
# from .node_system import router as node_system_router
from .ocr import router as ocr_router
from .shell import router as shell_router
from .websocket import router as websocket_router
# from .ocr_monitoring import router as ocr_monitoring_router
# from .automation import router as automation_router
# from .filesystem import router as filesystem_router
from .workflows import router as workflows_router

# VM router and others missing - temporarily removed to fix startup
# from .vm_router import router as vm_router
# from .desktop_switching_router import router as desktop_switching_router
# from .webrtc_router import router as webrtc_router

__all__ = [
    "health_router",
    "desktop_router",
    "websocket_router",
    "node_configs_router",
    "shell_router",
    "workflows_router",
    "api_v1_router",
    "ocr_router",
    "client_manager_router",
    "mcp_bridge_router",
    # Temporarily disabled routers
    # "node_system_router",
    # "ocr_monitoring_router",
    # "automation_router",
    # "filesystem_router",
    # "windows_desktop_router",
    # "vm_router",
    # "desktop_switching_router",
    # "webrtc_router",
]
