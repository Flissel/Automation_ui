"""
Subagents Package - Parallel worker agents for MoireTracker.

Subagent Types:
- PlanningSubagent: Explores different approaches (keyboard, mouse, hybrid)
- VisionSubagent: Analyzes screen regions in parallel
- SpecialistSubagent: Domain experts (Office, Browser, Gaming, etc.)
- BackgroundSubagent: Long-running monitors

Each subagent runs as a worker process that:
1. Listens to its Redis stream (e.g., moire:planning)
2. Processes incoming tasks
3. Publishes results to moire:results
"""

from .background_subagent import (BackgroundSubagent, BackgroundSubagentRunner,
                                  MonitorCondition, MonitorConfig,
                                  MonitorResult, start_background_workers)
from .base_subagent import BaseSubagent, SubagentContext, SubagentOutput
from .planning_subagent import (PlanningApproach, PlanningSubagent,
                                PlanningSubagentRunner, start_planning_workers)
from .specialist_subagent import (Shortcut, SpecialistDomain,
                                  SpecialistSubagent, SpecialistSubagentRunner,
                                  Workflow, start_specialist_workers)
from .vision_subagent import (DetectedElement, RegionBounds, ScreenRegion,
                              VisionSubagent, VisionSubagentRunner,
                              start_vision_workers)

__all__ = [
    # Base
    "BaseSubagent",
    "SubagentContext",
    "SubagentOutput",
    # Planning
    "PlanningSubagent",
    "PlanningApproach",
    "PlanningSubagentRunner",
    "start_planning_workers",
    # Vision
    "VisionSubagent",
    "ScreenRegion",
    "RegionBounds",
    "DetectedElement",
    "VisionSubagentRunner",
    "start_vision_workers",
    # Specialist
    "SpecialistSubagent",
    "SpecialistDomain",
    "Shortcut",
    "Workflow",
    "SpecialistSubagentRunner",
    "start_specialist_workers",
    # Background
    "BackgroundSubagent",
    "MonitorCondition",
    "MonitorConfig",
    "MonitorResult",
    "BackgroundSubagentRunner",
    "start_background_workers",
]
