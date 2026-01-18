"""
Filesystem Router for TRAE Backend

Provides endpoints for file watching and filesystem operations.
"""

from typing import Dict, List

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from ..logging import get_logger, log_api_request
from ..services import get_file_watcher_service

logger = get_logger("filesystem")

router = APIRouter()


class FileWatchRequest(BaseModel):
    path: str
    event_types: List[str] = ["created", "modified", "deleted"]
    file_patterns: List[str] = ["*"]
    recursive: bool = True


@router.get("/status")
@log_api_request(logger)
async def get_filesystem_status(request: Request):
    """Get filesystem service status"""
    try:
        file_watcher_service = get_file_watcher_service()

        status_info = {
            "available": file_watcher_service is not None,
            "healthy": True,
            "initialized": True,
            "active_watchers": 0,
            "supported_events": [],
        }

        if file_watcher_service:
            if hasattr(file_watcher_service, "is_healthy"):
                status_info["healthy"] = file_watcher_service.is_healthy()

            if hasattr(file_watcher_service, "get_active_watchers_count"):
                status_info["active_watchers"] = (
                    file_watcher_service.get_active_watchers_count()
                )
            elif hasattr(file_watcher_service, "watchers") and hasattr(
                file_watcher_service.watchers, "__len__"
            ):
                status_info["active_watchers"] = len(file_watcher_service.watchers)

            # Supported file system events
            status_info["supported_events"] = [
                "created",
                "modified",
                "deleted",
                "moved",
            ]
        else:
            status_info["healthy"] = False
            status_info["initialized"] = False

        return JSONResponse(
            content={
                "success": True,
                "status": status_info,
                "service_name": "file_watcher_service",
            }
        )

    except Exception as e:
        logger.error(f"Filesystem status error: {e}", exc_info=True)
        return JSONResponse(
            content={
                "success": False,
                "status": {
                    "available": False,
                    "healthy": False,
                    "initialized": False,
                    "error": str(e),
                },
                "service_name": "file_watcher_service",
            }
        )


@router.post("/watch")
@log_api_request(logger)
async def start_file_watcher(request: FileWatchRequest):
    """Start file system watching"""
    try:
        file_watcher_service = get_file_watcher_service()
        watcher_id = await file_watcher_service.start_watching(
            path=request.path,
            event_types=request.event_types,
            file_patterns=request.file_patterns,
            recursive=request.recursive,
        )

        return JSONResponse(
            content={
                "success": True,
                "watcher_id": watcher_id,
                "path": request.path,
                "message": f"Started watching {request.path}",
            }
        )

    except Exception as e:
        logger.error(f"File watcher start error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/watchers")
@log_api_request(logger)
async def list_file_watchers(request: Request):
    """List active file watchers"""
    try:
        file_watcher_service = get_file_watcher_service()
        watchers = await file_watcher_service.list_watchers()

        return JSONResponse(
            content={
                "success": True,
                "watchers": watchers,
                "total_count": len(watchers),
            }
        )

    except Exception as e:
        logger.error(f"List file watchers error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
