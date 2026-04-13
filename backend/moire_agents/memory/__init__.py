"""
Memory Module für MoireTracker_v2

Enthält:
- AgentMemory: SQLite-basiertes Conversation/Task/Pattern Memory
- RLMemory: Reinforcement Learning Memory mit Q-Table
"""

from .rl_memory import (Episode, HumanFeedback, QTableEntry, RewardSource,
                        RLMemory, Transition, calculate_step_reward,
                        get_rl_memory)
from .sqlite_memory import (ActionPattern, AgentMemory, ConversationMessage,
                            TaskRecord, TaskStatus, UIElementCache, get_memory,
                            learn_from_successful_task)

__all__ = [
    # SQLite Memory
    "AgentMemory",
    "ConversationMessage",
    "TaskRecord",
    "TaskStatus",
    "UIElementCache",
    "ActionPattern",
    "get_memory",
    "learn_from_successful_task",
    # RL Memory
    "RLMemory",
    "Episode",
    "Transition",
    "QTableEntry",
    "HumanFeedback",
    "RewardSource",
    "get_rl_memory",
    "calculate_step_reward",
]
