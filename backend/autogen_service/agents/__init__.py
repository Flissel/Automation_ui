"""
AutoGen Agents for desktop analysis and automation.

Provides specialized agents for:
- Vision: UI element recognition
- OCR: Text extraction
- Coordinator: Result aggregation
- Automation: Mouse/keyboard control
"""

from .vision_agent import VisionAgent, create_vision_agent
from .ocr_agent import OCRAgent, create_ocr_agent
from .coordinator import CoordinatorAgent, create_coordinator_agent
from .automation_agent import (
    AutomationAgent, 
    create_automation_agent,
    AutomationCommand,
    AutomationPlan
)

__all__ = [
    # Vision
    "VisionAgent",
    "create_vision_agent",
    # OCR
    "OCRAgent", 
    "create_ocr_agent",
    # Coordinator
    "CoordinatorAgent",
    "create_coordinator_agent",
    # Automation
    "AutomationAgent",
    "create_automation_agent",
    "AutomationCommand",
    "AutomationPlan",
]