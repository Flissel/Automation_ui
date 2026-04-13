"""
Handoff-based Multi-Agent System

Implements AutoGen's handoff pattern for agent coordination.
Agents delegate tasks to specialized colleagues using dedicated tool calls.

Based on: https://microsoft.github.io/autogen/stable/user-guide/core-user-guide/design-patterns/handoffs.html
"""

from .base_agent import AgentConfig, BaseHandoffAgent, Tool
from .claude_desktop_bridge import (ClaudeDesktopBridge, ClaudeDesktopReport,
                                    EventStream, ReportParser, ReportType,
                                    get_project_instructions)
from .execution_agent import ExecutionAgent
from .messages import (AgentResponse, HandoffRequest, ProgressUpdate,
                       RecoveryRequest, UserTask)
from .orchestrator_agent import OrchestratorAgent, RecoveryAgent
from .planning_team import CriticAgent, PlannerAgent, PlanningTeam
from .runtime import AgentRuntime, Session
# Society of Mind - Team Agents
from .team_agent import (SubAgentResult, SynthesisStrategy, TeamAgent,
                         TeamConfig)
from .tools import (ActionTool, DelegateTool, ToolRegistry, create_action_tool,
                    create_delegate_tool, get_tool_registry,
                    transfer_to_execution, transfer_to_orchestrator,
                    transfer_to_recovery, transfer_to_vision)
from .validation_team import (ChangeDetector, ElementFinderAgent,
                              ScreenStateValidator, ValidationTeam)
from .vision_handoff_agent import VisionHandoffAgent

__all__ = [
    # Messages
    "UserTask",
    "AgentResponse",
    "HandoffRequest",
    "ProgressUpdate",
    "RecoveryRequest",
    # Base classes
    "BaseHandoffAgent",
    "AgentConfig",
    "Tool",
    # Runtime
    "AgentRuntime",
    "Session",
    # Tools
    "DelegateTool",
    "ActionTool",
    "create_delegate_tool",
    "create_action_tool",
    "ToolRegistry",
    "get_tool_registry",
    "transfer_to_execution",
    "transfer_to_vision",
    "transfer_to_recovery",
    "transfer_to_orchestrator",
    # Concrete Agents
    "ExecutionAgent",
    "VisionHandoffAgent",
    "OrchestratorAgent",
    "RecoveryAgent",
    # Claude Desktop Bridge
    "ClaudeDesktopBridge",
    "ClaudeDesktopReport",
    "ReportType",
    "ReportParser",
    "EventStream",
    "get_project_instructions",
    # Society of Mind - Team Agents
    "TeamAgent",
    "TeamConfig",
    "SubAgentResult",
    "SynthesisStrategy",
    "PlanningTeam",
    "PlannerAgent",
    "CriticAgent",
    "ValidationTeam",
    "ElementFinderAgent",
    "ScreenStateValidator",
    "ChangeDetector",
]
