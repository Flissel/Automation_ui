"""
AutoGen AI Agent Service für Automation UI

Dieses Modul integriert das AutoGen AI Agent 4.0 Framework
für die automatische Analyse von Desktop-Monitor-Streams.
"""

from .agent_service import DesktopAnalysisService
from .frame_processor import FrameProcessor

__version__ = "0.1.0"
__all__ = ["DesktopAnalysisService", "FrameProcessor"]