"""WebSocket package for TRAE Backend

Provides WebSocket connection management and real-time communication.
"""

from .manager import WebSocketManager
from .handlers import WebSocketHandler

__all__ = [
    'WebSocketManager',
    'WebSocketHandler'
]