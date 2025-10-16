"""TRAE Backend FastAPI Application Factory

Creates and configures the FastAPI application with all necessary
routers, middleware, and service integrations.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .routers import (
    health_router,
    desktop_router,
    websocket_router,
    node_configs_router,
    shell_router,
    workflows_router,
    api_v1_router,
    ocr_router,
    # Temporarily disabled routers - missing services
    # node_system_router,
    # filesystem_router,
    # windows_desktop_router
)
from .routers.automation import router as automation_router
from .services.manager import ServiceManager
from .logger_config import get_logger

logger = get_logger("main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("Starting TRAE Backend services...")

    try:
        # Initialize service manager
        service_manager = ServiceManager()
        await service_manager.initialize()

        # Store in app state for router access
        app.state.service_manager = service_manager

        logger.info("All services initialized successfully")

        yield

    except Exception as e:
        logger.error(f"Service initialization failed: {e}")
        raise
    finally:
        # Shutdown
        logger.info("Shutting down TRAE Backend services...")
        if hasattr(app.state, 'service_manager'):
            await app.state.service_manager.cleanup()
        logger.info("Cleanup completed")

def create_app() -> FastAPI:
    """Create and configure FastAPI application"""
    
    app = FastAPI(
        title="TRAE Backend API",
        description="Visual Node-Based Automation Backend with Live Desktop Integration",
        version="2.0.0",
        lifespan=lifespan
    )
    
    # CORS configuration for frontend integration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",  # Vite dev server
            "http://localhost:5174",  # Alternative Vite dev server
            "http://localhost:5175",  # Alternative Vite dev server
            "http://localhost:3000",  # Alternative dev port
            "http://localhost:8007",  # Backend API port
            "http://192.168.178.117:5173",  # Network IP
            "http://192.168.178.117:5174",  # Network IP with alternative port
            "http://192.168.178.117:5175",  # Network IP with alternative port
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Include routers with prefixes
    app.include_router(health_router, prefix="/api/health", tags=["Health"])
    app.include_router(desktop_router, prefix="/api/desktop", tags=["Desktop"])
    app.include_router(websocket_router, prefix="/ws", tags=["WebSocket"])
    app.include_router(node_configs_router, prefix="/api/node-configs", tags=["Node Configurations"])
    app.include_router(shell_router, prefix="/api/shell", tags=["Shell"])
    
    # Enable automation router for click functionality
    app.include_router(automation_router, prefix="/api/automation", tags=["Automation"])
    
    # Enable workflow and API v1 routers
    app.include_router(workflows_router, prefix="/api/workflows", tags=["Workflows"])

    # Enable OCR router first to avoid routing conflicts
    app.include_router(ocr_router, prefix="/api/v1/ocr", tags=["OCR"])

    # Include API v1 router last (it also has OCR endpoints but they should be overridden)
    app.include_router(api_v1_router, prefix="/api/v1", tags=["API v1"])

    # Temporarily disabled routers - missing services
    # app.include_router(node_system_router, prefix="/api/nodes", tags=["Nodes"])
    # app.include_router(ocr_monitoring_router, prefix="/api/ocr-monitoring", tags=["OCR Monitoring"])
    # app.include_router(filesystem_router, prefix="/api/filesystem", tags=["Filesystem"])
    # app.include_router(windows_desktop_router, prefix="/api/windows-desktop", tags=["Windows Desktop"])
    
    logger.info("FastAPI application created with all routers")

    return app

# Create app instance for uvicorn
app = create_app()