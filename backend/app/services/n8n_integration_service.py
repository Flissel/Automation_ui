"""n8n Integration Service for Unity AI Platform

This service provides integration with n8n workflow engine for orchestrating
complex automation workflows in the Unity AI Platform.

Features:
- Workflow creation and management
- Execution monitoring and control
- Webhook integration
- Event-driven workflow triggers
- Unity AI Platform compliance
"""

import asyncio
import json
import logging
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional, Union
from urllib.parse import urljoin

import aiohttp
import yaml

# Unity AI Platform imports
try:
    from .event_broker_service import (AgentType, EventBrokerService,
                                       EventType, UnityAIEvent)
except ImportError:
    # Fallback for standalone usage
    EventBrokerService = None
    UnityAIEvent = None
    EventType = None
    AgentType = None

logger = logging.getLogger(__name__)


class WorkflowStatus(Enum):
    """Workflow execution status"""

    IDLE = "idle"
    RUNNING = "running"
    SUCCESS = "success"
    ERROR = "error"
    WAITING = "waiting"
    CANCELED = "canceled"
    CRASHED = "crashed"
    NEW = "new"


class TriggerType(Enum):
    """Workflow trigger types"""

    MANUAL = "manual"
    WEBHOOK = "webhook"
    SCHEDULE = "schedule"
    EVENT = "event"
    FILE_CHANGE = "file_change"
    DESKTOP_ACTION = "desktop_action"
    OCR_RESULT = "ocr_result"
    CLICK_ACTION = "click_action"
    QUALITY_GATE = "quality_gate"


class NodeType(Enum):
    """n8n node types for Unity AI Platform"""

    DESKTOP_STREAM = "unity-ai-desktop-stream"
    OCR_PROCESSOR = "unity-ai-ocr"
    CLICK_ACTION = "unity-ai-click"
    FILE_WATCHER = "unity-ai-file-watcher"
    LOGGER = "unity-ai-logger"
    QUALITY_GATE = "unity-ai-quality-gate"
    WEBHOOK = "n8n-nodes-base.webhook"
    HTTP_REQUEST = "n8n-nodes-base.httpRequest"
    CODE = "n8n-nodes-base.code"
    IF = "n8n-nodes-base.if"
    SWITCH = "n8n-nodes-base.switch"
    WAIT = "n8n-nodes-base.wait"
    SET = "n8n-nodes-base.set"


@dataclass
class N8nConfig:
    """n8n service configuration"""

    base_url: str = "http://localhost:5678"
    api_key: Optional[str] = None
    webhook_base_url: str = "http://localhost:5678/webhook"
    timeout: int = 30
    retry_attempts: int = 3
    retry_delay: float = 1.0

    # Unity AI Platform specific
    unity_ai_enabled: bool = True
    event_broker_enabled: bool = True
    auto_create_webhooks: bool = True
    workflow_templates_path: str = "./workflows/templates"

    # Monitoring
    health_check_interval: int = 60  # seconds
    execution_timeout: int = 300  # seconds
    max_concurrent_executions: int = 10

    # Logging
    log_executions: bool = True
    log_level: str = "INFO"


@dataclass
class WorkflowDefinition:
    """Unity AI Platform workflow definition"""

    id: str
    name: str
    description: str
    nodes: List[Dict[str, Any]]
    connections: Dict[str, Any]
    triggers: List[Dict[str, Any]]
    settings: Dict[str, Any]

    # Unity AI Platform metadata
    unity_ai_version: str = "2.0"
    agent_type: str = "workflow_orchestrator"
    prompt_based: bool = False
    auto_healing: bool = True
    quality_gates: List[Dict[str, Any]] = None

    def __post_init__(self):
        if self.quality_gates is None:
            self.quality_gates = []


@dataclass
class WorkflowExecution:
    """Workflow execution information"""

    id: str
    workflow_id: str
    status: WorkflowStatus
    started_at: datetime
    finished_at: Optional[datetime] = None
    data: Dict[str, Any] = None
    error: Optional[str] = None

    # Unity AI Platform metadata
    triggered_by: str = "unknown"
    unity_ai_context: Dict[str, Any] = None

    def __post_init__(self):
        if self.data is None:
            self.data = {}
        if self.unity_ai_context is None:
            self.unity_ai_context = {}


class N8nIntegrationService:
    """n8n Integration Service for Unity AI Platform"""

    def __init__(self, config: N8nConfig):
        self.config = config
        self.session: Optional[aiohttp.ClientSession] = None
        self.event_broker: Optional[EventBrokerService] = None
        self.active_executions: Dict[str, WorkflowExecution] = {}
        self.workflow_cache: Dict[str, WorkflowDefinition] = {}
        self.webhook_mappings: Dict[str, str] = {}  # webhook_id -> workflow_id
        self._health_check_task: Optional[asyncio.Task] = None

        # Initialize event broker if available
        if self.config.unity_ai_enabled and EventBrokerService:
            try:
                self.event_broker = EventBrokerService()
            except Exception as e:
                logger.warning(f"Failed to initialize event broker: {e}")

    async def start(self):
        """Start the n8n integration service"""
        logger.info("Starting n8n Integration Service")

        # Create HTTP session
        headers = {}
        if self.config.api_key:
            headers["X-N8N-API-KEY"] = self.config.api_key

        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=self.config.timeout), headers=headers
        )

        # Start event broker
        if self.event_broker:
            await self.event_broker.start()
            await self._setup_event_subscriptions()

        # Start health check
        self._health_check_task = asyncio.create_task(self._health_check_loop())

        # Load workflow templates
        await self._load_workflow_templates()

        logger.info("n8n Integration Service started successfully")

    async def stop(self):
        """Stop the n8n integration service"""
        logger.info("Stopping n8n Integration Service")

        # Cancel health check
        if self._health_check_task:
            self._health_check_task.cancel()
            try:
                await self._health_check_task
            except asyncio.CancelledError:
                pass

        # Stop event broker
        if self.event_broker:
            await self.event_broker.stop()

        # Close HTTP session
        if self.session:
            await self.session.close()

        logger.info("n8n Integration Service stopped")

    async def _setup_event_subscriptions(self):
        """Setup event subscriptions for Unity AI Platform"""
        if not self.event_broker:
            return

        # Subscribe to relevant events
        await self.event_broker.subscribe(
            EventType.DESKTOP_ACTION, self._handle_desktop_action_event
        )

        await self.event_broker.subscribe(
            EventType.OCR_COMPLETED, self._handle_ocr_event
        )

        await self.event_broker.subscribe(
            EventType.FILE_CHANGED, self._handle_file_change_event
        )

        await self.event_broker.subscribe(
            EventType.QUALITY_GATE_FAILED, self._handle_quality_gate_event
        )

    async def _handle_desktop_action_event(self, event: UnityAIEvent):
        """Handle desktop action events"""
        try:
            # Find workflows triggered by desktop actions
            workflows = await self._find_workflows_by_trigger(
                TriggerType.DESKTOP_ACTION
            )

            for workflow_id in workflows:
                await self.trigger_workflow(
                    workflow_id,
                    input_data=event.payload,
                    triggered_by=f"desktop_action_{event.source}",
                )
        except Exception as e:
            logger.error(f"Error handling desktop action event: {e}")

    async def _handle_ocr_event(self, event: UnityAIEvent):
        """Handle OCR completion events"""
        try:
            workflows = await self._find_workflows_by_trigger(TriggerType.OCR_RESULT)

            for workflow_id in workflows:
                await self.trigger_workflow(
                    workflow_id,
                    input_data=event.payload,
                    triggered_by=f"ocr_result_{event.source}",
                )
        except Exception as e:
            logger.error(f"Error handling OCR event: {e}")

    async def _handle_file_change_event(self, event: UnityAIEvent):
        """Handle file change events"""
        try:
            workflows = await self._find_workflows_by_trigger(TriggerType.FILE_CHANGE)

            for workflow_id in workflows:
                await self.trigger_workflow(
                    workflow_id,
                    input_data=event.payload,
                    triggered_by=f"file_change_{event.source}",
                )
        except Exception as e:
            logger.error(f"Error handling file change event: {e}")

    async def _handle_quality_gate_event(self, event: UnityAIEvent):
        """Handle quality gate events"""
        try:
            workflows = await self._find_workflows_by_trigger(TriggerType.QUALITY_GATE)

            for workflow_id in workflows:
                await self.trigger_workflow(
                    workflow_id,
                    input_data=event.payload,
                    triggered_by=f"quality_gate_{event.source}",
                )
        except Exception as e:
            logger.error(f"Error handling quality gate event: {e}")

    async def _find_workflows_by_trigger(self, trigger_type: TriggerType) -> List[str]:
        """Find workflows that should be triggered by specific event types"""
        matching_workflows = []

        for workflow_id, workflow in self.workflow_cache.items():
            for trigger in workflow.triggers:
                if trigger.get("type") == trigger_type.value:
                    matching_workflows.append(workflow_id)
                    break

        return matching_workflows

    async def _health_check_loop(self):
        """Periodic health check loop"""
        while True:
            try:
                await asyncio.sleep(self.config.health_check_interval)
                await self._perform_health_check()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Health check error: {e}")

    async def _perform_health_check(self):
        """Perform health check on n8n instance"""
        try:
            url = urljoin(self.config.base_url, "/rest/active")
            async with self.session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    logger.debug(
                        f"n8n health check successful: {len(data)} active workflows"
                    )

                    # Update active executions
                    await self._update_active_executions(data)
                else:
                    logger.warning(f"n8n health check failed: {response.status}")
        except Exception as e:
            logger.error(f"Health check failed: {e}")

    async def _update_active_executions(self, active_data: List[Dict]):
        """Update active executions from n8n data"""
        current_executions = {exec["id"] for exec in active_data}

        # Remove completed executions
        completed = set(self.active_executions.keys()) - current_executions
        for exec_id in completed:
            execution = self.active_executions.pop(exec_id)
            execution.status = WorkflowStatus.SUCCESS
            execution.finished_at = datetime.now()

            # Publish completion event
            if self.event_broker:
                await self.event_broker.publish(
                    UnityAIEvent(
                        type=EventType.WORKFLOW_COMPLETED,
                        source="n8n_integration",
                        agent_type=AgentType.WORKFLOW_ORCHESTRATOR,
                        payload={
                            "execution_id": exec_id,
                            "workflow_id": execution.workflow_id,
                            "status": execution.status.value,
                            "duration": (
                                execution.finished_at - execution.started_at
                            ).total_seconds(),
                        },
                    )
                )

    async def _load_workflow_templates(self):
        """Load workflow templates from disk"""
        try:
            import os

            templates_path = self.config.workflow_templates_path

            if not os.path.exists(templates_path):
                logger.info(f"Workflow templates path does not exist: {templates_path}")
                return

            for filename in os.listdir(templates_path):
                if filename.endswith((".yaml", ".yml", ".json")):
                    filepath = os.path.join(templates_path, filename)
                    await self._load_workflow_template(filepath)

        except Exception as e:
            logger.error(f"Error loading workflow templates: {e}")

    async def _load_workflow_template(self, filepath: str):
        """Load a single workflow template"""
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                if filepath.endswith(".json"):
                    data = json.load(f)
                else:
                    data = yaml.safe_load(f)

            workflow = WorkflowDefinition(**data)
            self.workflow_cache[workflow.id] = workflow

            logger.info(f"Loaded workflow template: {workflow.name} ({workflow.id})")

        except Exception as e:
            logger.error(f"Error loading workflow template {filepath}: {e}")

    async def create_workflow(self, workflow: WorkflowDefinition) -> str:
        """Create a new workflow in n8n"""
        try:
            url = urljoin(self.config.base_url, "/rest/workflows")

            # Convert to n8n format
            n8n_workflow = self._convert_to_n8n_format(workflow)

            async with self.session.post(url, json=n8n_workflow) as response:
                if response.status == 200:
                    data = await response.json()
                    workflow_id = str(data["id"])

                    # Cache the workflow
                    self.workflow_cache[workflow_id] = workflow

                    logger.info(
                        f"Created workflow: {workflow.name} (ID: {workflow_id})"
                    )

                    # Create webhooks if needed
                    if self.config.auto_create_webhooks:
                        await self._create_workflow_webhooks(workflow_id, workflow)

                    return workflow_id
                else:
                    error_text = await response.text()
                    raise Exception(
                        f"Failed to create workflow: {response.status} - {error_text}"
                    )

        except Exception as e:
            logger.error(f"Error creating workflow: {e}")
            raise

    async def _convert_to_n8n_format(
        self, workflow: WorkflowDefinition
    ) -> Dict[str, Any]:
        """Convert Unity AI workflow to n8n format"""
        return {
            "name": workflow.name,
            "nodes": workflow.nodes,
            "connections": workflow.connections,
            "active": True,
            "settings": workflow.settings,
            "tags": ["unity-ai", workflow.agent_type],
        }

    async def _create_workflow_webhooks(
        self, workflow_id: str, workflow: WorkflowDefinition
    ):
        """Create webhooks for workflow triggers"""
        for trigger in workflow.triggers:
            if trigger.get("type") == TriggerType.WEBHOOK.value:
                webhook_id = trigger.get("webhook_id")
                if webhook_id:
                    self.webhook_mappings[webhook_id] = workflow_id
                    logger.info(
                        f"Mapped webhook {webhook_id} to workflow {workflow_id}"
                    )

    async def trigger_workflow(
        self,
        workflow_id: str,
        input_data: Dict[str, Any] = None,
        triggered_by: str = "api",
    ) -> str:
        """Trigger a workflow execution"""
        try:
            url = urljoin(
                self.config.base_url, f"/rest/workflows/{workflow_id}/execute"
            )

            payload = {
                "data": input_data or {},
                "meta": {
                    "triggered_by": triggered_by,
                    "unity_ai_context": {
                        "timestamp": datetime.now().isoformat(),
                        "platform_version": "2.0",
                    },
                },
            }

            async with self.session.post(url, json=payload) as response:
                if response.status == 200:
                    data = await response.json()
                    execution_id = str(data["id"])

                    # Track execution
                    execution = WorkflowExecution(
                        id=execution_id,
                        workflow_id=workflow_id,
                        status=WorkflowStatus.RUNNING,
                        started_at=datetime.now(),
                        data=input_data or {},
                        triggered_by=triggered_by,
                        unity_ai_context=payload["meta"]["unity_ai_context"],
                    )

                    self.active_executions[execution_id] = execution

                    logger.info(
                        f"Triggered workflow {workflow_id}, execution: {execution_id}"
                    )

                    # Publish event
                    if self.event_broker:
                        await self.event_broker.publish(
                            UnityAIEvent(
                                type=EventType.WORKFLOW_STARTED,
                                source="n8n_integration",
                                agent_type=AgentType.WORKFLOW_ORCHESTRATOR,
                                payload={
                                    "execution_id": execution_id,
                                    "workflow_id": workflow_id,
                                    "triggered_by": triggered_by,
                                },
                            )
                        )

                    return execution_id
                else:
                    error_text = await response.text()
                    raise Exception(
                        f"Failed to trigger workflow: {response.status} - {error_text}"
                    )

        except Exception as e:
            logger.error(f"Error triggering workflow {workflow_id}: {e}")
            raise

    async def get_execution_status(
        self, execution_id: str
    ) -> Optional[WorkflowExecution]:
        """Get execution status"""
        try:
            # Check local cache first
            if execution_id in self.active_executions:
                return self.active_executions[execution_id]

            # Query n8n API
            url = urljoin(self.config.base_url, f"/rest/executions/{execution_id}")

            async with self.session.get(url) as response:
                if response.status == 200:
                    data = await response.json()

                    # Convert to our format
                    execution = WorkflowExecution(
                        id=execution_id,
                        workflow_id=str(data["workflowId"]),
                        status=WorkflowStatus(data["status"]),
                        started_at=datetime.fromisoformat(
                            data["startedAt"].replace("Z", "+00:00")
                        ),
                        finished_at=(
                            datetime.fromisoformat(
                                data["stoppedAt"].replace("Z", "+00:00")
                            )
                            if data.get("stoppedAt")
                            else None
                        ),
                        data=data.get("data", {}),
                        error=data.get("error"),
                    )

                    return execution
                else:
                    logger.warning(
                        f"Execution {execution_id} not found: {response.status}"
                    )
                    return None

        except Exception as e:
            logger.error(f"Error getting execution status {execution_id}: {e}")
            return None

    async def cancel_execution(self, execution_id: str) -> bool:
        """Cancel a running execution"""
        try:
            url = urljoin(self.config.base_url, f"/rest/executions/{execution_id}/stop")

            async with self.session.post(url) as response:
                if response.status == 200:
                    # Update local tracking
                    if execution_id in self.active_executions:
                        execution = self.active_executions[execution_id]
                        execution.status = WorkflowStatus.CANCELED
                        execution.finished_at = datetime.now()

                    logger.info(f"Canceled execution: {execution_id}")
                    return True
                else:
                    logger.warning(
                        f"Failed to cancel execution {execution_id}: {response.status}"
                    )
                    return False

        except Exception as e:
            logger.error(f"Error canceling execution {execution_id}: {e}")
            return False

    async def list_workflows(self) -> List[Dict[str, Any]]:
        """List all workflows"""
        try:
            url = urljoin(self.config.base_url, "/rest/workflows")

            async with self.session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    return data
                else:
                    logger.warning(f"Failed to list workflows: {response.status}")
                    return []

        except Exception as e:
            logger.error(f"Error listing workflows: {e}")
            return []

    async def get_workflow(self, workflow_id: str) -> Optional[Dict[str, Any]]:
        """Get workflow details"""
        try:
            url = urljoin(self.config.base_url, f"/rest/workflows/{workflow_id}")

            async with self.session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    return data
                else:
                    logger.warning(
                        f"Workflow {workflow_id} not found: {response.status}"
                    )
                    return None

        except Exception as e:
            logger.error(f"Error getting workflow {workflow_id}: {e}")
            return None

    async def delete_workflow(self, workflow_id: str) -> bool:
        """Delete a workflow"""
        try:
            url = urljoin(self.config.base_url, f"/rest/workflows/{workflow_id}")

            async with self.session.delete(url) as response:
                if response.status == 200:
                    # Remove from cache
                    self.workflow_cache.pop(workflow_id, None)

                    # Remove webhook mappings
                    self.webhook_mappings = {
                        k: v
                        for k, v in self.webhook_mappings.items()
                        if v != workflow_id
                    }

                    logger.info(f"Deleted workflow: {workflow_id}")
                    return True
                else:
                    logger.warning(
                        f"Failed to delete workflow {workflow_id}: {response.status}"
                    )
                    return False

        except Exception as e:
            logger.error(f"Error deleting workflow {workflow_id}: {e}")
            return False

    async def create_unity_ai_workflow_template(
        self, name: str, description: str, nodes_config: List[Dict[str, Any]]
    ) -> WorkflowDefinition:
        """Create a Unity AI Platform workflow template"""

        # Generate workflow ID
        workflow_id = f"unity_ai_{name.lower().replace(' ', '_')}_{int(datetime.now().timestamp())}"

        # Create nodes with Unity AI Platform compliance
        nodes = []
        connections = {}

        for i, node_config in enumerate(nodes_config):
            node = {
                "id": f"node_{i}",
                "name": node_config.get("name", f"Node {i}"),
                "type": node_config.get("type", NodeType.CODE.value),
                "position": [100 + i * 200, 100],
                "parameters": node_config.get("parameters", {}),
                "typeVersion": 1,
            }

            # Add Unity AI Platform metadata
            node["parameters"]["unity_ai"] = {
                "enabled": True,
                "version": "2.0",
                "node_id": node["id"],
            }

            nodes.append(node)

            # Create connections
            if i > 0:
                connections[f"node_{i-1}"] = {
                    "main": [[{"node": f"node_{i}", "type": "main", "index": 0}]]
                }

        # Create triggers
        triggers = [{"type": TriggerType.MANUAL.value, "enabled": True}]

        # Create workflow definition
        workflow = WorkflowDefinition(
            id=workflow_id,
            name=name,
            description=description,
            nodes=nodes,
            connections=connections,
            triggers=triggers,
            settings={
                "executionOrder": "v1",
                "saveManualExecutions": True,
                "callerPolicy": "workflowsFromSameOwner",
            },
            unity_ai_version="2.0",
            agent_type="workflow_orchestrator",
            prompt_based=False,
            auto_healing=True,
            quality_gates=[
                {
                    "type": "execution_time",
                    "threshold": 300,  # 5 minutes
                    "action": "warn",
                },
                {"type": "error_rate", "threshold": 0.1, "action": "alert"},  # 10%
            ],
        )

        return workflow

    def get_active_executions(self) -> Dict[str, WorkflowExecution]:
        """Get all active executions"""
        return self.active_executions.copy()

    def get_workflow_cache(self) -> Dict[str, WorkflowDefinition]:
        """Get cached workflows"""
        return self.workflow_cache.copy()

    def get_webhook_mappings(self) -> Dict[str, str]:
        """Get webhook to workflow mappings"""
        return self.webhook_mappings.copy()


# Example usage and workflow templates
class UnityAIWorkflowTemplates:
    """Pre-built workflow templates for Unity AI Platform"""

    @staticmethod
    def desktop_ocr_click_workflow() -> Dict[str, Any]:
        """Template for desktop OCR + click automation"""
        return {
            "id": "unity_ai_desktop_ocr_click",
            "name": "Desktop OCR + Click Automation",
            "description": "Capture desktop, perform OCR, and execute click actions",
            "nodes": [
                {
                    "name": "Desktop Stream",
                    "type": NodeType.DESKTOP_STREAM.value,
                    "parameters": {
                        "stream_config": {
                            "fps": 10,
                            "quality": "medium",
                            "region": "full_screen",
                        }
                    },
                },
                {
                    "name": "OCR Processor",
                    "type": NodeType.OCR_PROCESSOR.value,
                    "parameters": {
                        "engine": "tesseract",
                        "language": "eng",
                        "preprocessing": True,
                    },
                },
                {
                    "name": "Click Action",
                    "type": NodeType.CLICK_ACTION.value,
                    "parameters": {
                        "click_type": "left",
                        "coordinate_mode": "ocr_result",
                        "validation": True,
                    },
                },
                {
                    "name": "Logger",
                    "type": NodeType.LOGGER.value,
                    "parameters": {
                        "log_level": "info",
                        "destinations": ["redis", "console"],
                    },
                },
            ],
            "triggers": [
                {
                    "type": TriggerType.WEBHOOK.value,
                    "webhook_id": "desktop_automation",
                    "enabled": True,
                }
            ],
            "settings": {"executionOrder": "v1", "saveManualExecutions": True},
        }

    @staticmethod
    def file_watcher_workflow() -> Dict[str, Any]:
        """Template for file-based automation"""
        return {
            "id": "unity_ai_file_watcher",
            "name": "File Watcher Automation",
            "description": "Monitor files and trigger automated responses",
            "nodes": [
                {
                    "name": "File Watcher",
                    "type": NodeType.FILE_WATCHER.value,
                    "parameters": {
                        "watch_paths": ["./prompts", "./configs"],
                        "file_types": [".txt", ".yaml", ".json"],
                        "events": ["created", "modified"],
                    },
                },
                {
                    "name": "Process File",
                    "type": NodeType.CODE.value,
                    "parameters": {
                        "jsCode": """
                        // Process the file change
                        const fileData = $input.first();
                        
                        return {
                            processed: true,
                            file_path: fileData.file_path,
                            action: 'file_processed',
                            timestamp: new Date().toISOString()
                        };
                        """
                    },
                },
                {
                    "name": "Quality Gate",
                    "type": NodeType.QUALITY_GATE.value,
                    "parameters": {
                        "rules": [
                            {
                                "condition": "file_size",
                                "threshold": 1048576,  # 1MB
                                "action": "warn",
                            }
                        ]
                    },
                },
            ],
            "triggers": [{"type": TriggerType.FILE_CHANGE.value, "enabled": True}],
            "settings": {"executionOrder": "v1", "saveManualExecutions": True},
        }


# Export main components
__all__ = [
    "N8nIntegrationService",
    "N8nConfig",
    "WorkflowDefinition",
    "WorkflowExecution",
    "WorkflowStatus",
    "TriggerType",
    "NodeType",
    "UnityAIWorkflowTemplates",
]
