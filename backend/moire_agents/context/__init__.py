"""
Context Module - Tracks cursor, selection, and app state for precise UI operations.

Provides "Feingefühl" (fine-control) for text operations like formatting in Word.
"""

from .context_tracker import (AppContext, ContextTracker, CursorPosition,
                              SelectionState, get_context_tracker)
from .selection_manager import (ClipboardState, SelectionManager,
                                get_selection_manager)
from .word_helper import FormattingState, WordHelper, get_word_helper

__all__ = [
    # Selection Manager
    "SelectionManager",
    "ClipboardState",
    "get_selection_manager",
    # Context Tracker
    "ContextTracker",
    "CursorPosition",
    "SelectionState",
    "AppContext",
    "get_context_tracker",
    # Word Helper
    "WordHelper",
    "FormattingState",
    "get_word_helper",
]
