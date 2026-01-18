"""
Node System Router for TRAE Backend

Provides endpoints for node templates, graph execution, and workflow management.
"""

import uuid
from typing import Any, Dict, List

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from ..exceptions import GraphValidationError, NodeExecutionError
from ..logging import get_logger, log_api_request
from ..services import (get_click_automation_service,
                        get_desktop_automation_service,
                        get_graph_execution_service, get_ocr_service,
                        get_websocket_manager)

logger = get_logger("node_system")

router = APIRouter()


# Request Models
class NodeValidationRequest(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]


class NodeExecutionRequest(BaseModel):
    graph_id: str
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    execution_mode: str = "sequential"
    parameters: Dict[str, Any] = {}


@router.get("/nodes")
@log_api_request(logger)
async def list_available_nodes(request: Request):
    """List available nodes"""
    try:
        graph_service = get_graph_execution_service(
            websocket_manager=get_websocket_manager(),
            click_service=get_click_automation_service(),
            desktop_service=get_desktop_automation_service(),
            ocr_service=get_ocr_service(),
        )
        templates = graph_service.get_node_templates()

        return JSONResponse(
            content={
                "success": True,
                "nodes": templates,
                "categories": [
                    "Input",
                    "Processing",
                    "Automation",
                    "Logic",
                    "Integration",
                    "Workflow",
                ],
                "total_count": len(templates),
            }
        )

    except Exception as e:
        logger.error(f"Failed to get available nodes: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/validate")
@log_api_request(logger)
async def validate_node_system(request: NodeValidationRequest):
    """Validate node system"""
    try:
        graph_service = get_graph_execution_service(
            websocket_manager=get_websocket_manager(),
            click_service=get_click_automation_service(),
            desktop_service=get_desktop_automation_service(),
            ocr_service=get_ocr_service(),
        )

        # Basic validation of nodes and edges structure
        validation_result = {"valid": True, "errors": [], "warnings": []}

        # Validate nodes
        if not request.nodes:
            validation_result["errors"].append("No nodes provided")
            validation_result["valid"] = False

        # Validate edges
        node_ids = {node.get("id") for node in request.nodes if node.get("id")}
        for edge in request.edges:
            source_id = edge.get("source")
            target_id = edge.get("target")

            if source_id not in node_ids:
                validation_result["errors"].append(
                    f"Edge source '{source_id}' not found in nodes"
                )
                validation_result["valid"] = False

            if target_id not in node_ids:
                validation_result["errors"].append(
                    f"Edge target '{target_id}' not found in nodes"
                )
                validation_result["valid"] = False

        return JSONResponse(
            content={
                "success": True,
                "validation": validation_result,
                "node_count": len(request.nodes),
                "edge_count": len(request.edges),
            }
        )

    except Exception as e:
        logger.error(f"Node system validation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/templates")
@log_api_request(logger)
async def get_node_templates(request: Request):
    """Get all available node templates"""
    try:
        graph_service = get_graph_execution_service(
            websocket_manager=get_websocket_manager(),
            click_service=get_click_automation_service(),
            desktop_service=get_desktop_automation_service(),
            ocr_service=get_ocr_service(),
        )
        templates = graph_service.get_node_templates()

        return JSONResponse(
            content={
                "success": True,
                "templates": templates,
                "categories": [
                    "Input",
                    "Processing",
                    "Automation",
                    "Logic",
                    "Integration",
                    "Workflow",
                ],
                "total_count": len(templates),
            }
        )

    except Exception as e:
        logger.error(f"Failed to get node templates: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/graphs/execute")
@log_api_request(logger)
async def execute_graph(
    request: NodeExecutionRequest, background_tasks: BackgroundTasks
):
    """Execute a node graph"""
    try:
        execution_id = str(uuid.uuid4())

        # Start graph execution in background
        background_tasks.add_task(
            execute_graph_background, execution_id, request.dict()
        )

        return JSONResponse(
            content={
                "success": True,
                "execution_id": execution_id,
                "status": "started",
                "message": "Graph execution started",
            }
        )

    except Exception as e:
        logger.error(f"Graph execution error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


async def execute_graph_background(execution_id: str, request_data: Dict[str, Any]):
    """Background task for graph execution"""
    try:
        graph_service = get_graph_execution_service(
            websocket_manager=get_websocket_manager(),
            click_service=get_click_automation_service(),
            desktop_service=get_desktop_automation_service(),
            ocr_service=get_ocr_service(),
        )

        result = await graph_service.execute_graph(
            execution_id=execution_id,
            nodes=request_data["nodes"],
            edges=request_data["edges"],
            execution_mode=request_data.get("execution_mode", "sequential"),
            parameters=request_data.get("parameters", {}),
        )

        logger.info(f"Graph execution completed: {execution_id}")

    except Exception as e:
        logger.error(f"Background graph execution error: {e}", exc_info=True)


@router.get("/executions/{execution_id}")
@log_api_request(logger)
async def get_execution_status(execution_id: str, request: Request):
    """Get execution status"""
    try:
        graph_service = get_graph_execution_service(
            websocket_manager=get_websocket_manager(),
            click_service=get_click_automation_service(),
            desktop_service=get_desktop_automation_service(),
            ocr_service=get_ocr_service(),
        )
        status = await graph_service.get_execution_status(execution_id)

        if not status:
            raise HTTPException(status_code=404, detail="Execution not found")

        return JSONResponse(content={"success": True, "execution": status})

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get execution status error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
