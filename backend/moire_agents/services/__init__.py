"""
MoireTracker_v2 Python Services

- DesktopAnalyzer: DataFrame Export für UI-Analyse
"""

from .desktop_analyzer import (AnalysisResult, AnalyzedElement,
                               DesktopAnalyzer, scan_desktop_to_dataframe)

__all__ = [
    "DesktopAnalyzer",
    "AnalysisResult",
    "AnalyzedElement",
    "scan_desktop_to_dataframe",
]
