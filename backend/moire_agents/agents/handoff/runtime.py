"""
Agent Runtime - Message Broker for Handoff Pattern

Central coordinator for handoff-based multi-agent system.
Based on AutoGen's distributed runtime pattern.

Key responsibilities:
- Agent registry and discovery
- Task routing between agents
- Handoff request processing
- Progress update aggregation
- Session management

Phase 0.1 (MCP Integration Hub):
The AgentRuntime is now also the integration hub for the MCP server. It exposes
lazy-loaded singletons for the pre-existing backend infrastructure that the
MCP needs but never had access to before:
  - event_queue (core/event_queue.py)
  - memory (memory/sqlite_memory.py)
  - recovery_agent (agents/recovery_agent.py)
  - validated_executor (core/validated_executor.py)
  - pattern_store (moire_tracker/python/learning/pattern_store.py)
Each is loaded on first access via the matching property; failures fall back
to None so the runtime stays usable in minimal environments.
"""

import asyncio
import logging
import os
import sys
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional

from .base_agent import BaseHandoffAgent
from .messages import (AgentResponse, HandoffRequest, ProgressUpdate,
                       RecoveryRequest, UserTask)

logger = logging.getLogger(__name__)

# Phase 0.1: Make `core.*`, `memory.*`, `agents.*` importable from this module.
# These siblings of `agents/handoff/` use the moire_agents/ root as their
# package root. Adding it to sys.path matches the pattern already used by
# mcp_server_handoff.py, agents/recovery_agent.py and agents/steering_agent.py.
_MOIRE_AGENTS_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..")
)
if _MOIRE_AGENTS_ROOT not in sys.path:
    sys.path.insert(0, _MOIRE_AGENTS_ROOT)

# Sentinel: distinguishes "never tried to load" (None) from "tried and failed" (False).
_LOAD_FAILED = False


@dataclass
class Session:
    """Tracks a user session across agent handoffs."""

    id: str
    created_at: datetime = field(default_factory=datetime.now)
    task: Optional[UserTask] = None
    responses: List[AgentResponse] = field(default_factory=list)
    progress_updates: List[ProgressUpdate] = field(default_factory=list)
    current_agent: Optional[str] = None
    handoff_count: int = 0
    completed: bool = False
    final_result: Optional[Any] = None


class AgentRuntime:
    """
    Central coordinator for handoff-based multi-agent system.

    Implements the AutoGen runtime pattern:
    - Agents register with the runtime
    - Tasks are published to specific agents
    - Handoffs are routed automatically
    - Progress is aggregated across agents
    """

    def __init__(
        self,
        max_handoffs: int = 10,
        task_timeout: float = 120.0,
        on_progress: Optional[Callable[[ProgressUpdate], None]] = None,
    ):
        """
        Initialize the agent runtime.

        Args:
            max_handoffs: Maximum handoffs before aborting (loop prevention)
            task_timeout: Maximum time for a task to complete
            on_progress: Optional callback for progress updates
        """
        self.max_handoffs = max_handoffs
        self.task_timeout = task_timeout
        self.on_progress = on_progress

        # Agent registry
        self._agents: Dict[str, BaseHandoffAgent] = {}

        # Session management
        self._sessions: Dict[str, Session] = {}

        # Task queue
        self._task_queue: asyncio.Queue = asyncio.Queue()

        # State
        self._running = False
        self._processor_task: Optional[asyncio.Task] = None

        # Statistics
        self._stats = {
            "tasks_processed": 0,
            "handoffs_routed": 0,
            "errors": 0,
            "sessions_completed": 0,
        }

        # Phase 0.1 / 3.1: Lazy-loaded MCP integration hub components.
        # None  = never accessed yet
        # False = tried to load and failed (do not retry)
        # other = loaded instance
        self._event_queue: Any = None
        self._memory: Any = None
        self._recovery_agent: Any = None
        self._validated_executor: Any = None
        self._pattern_store: Any = None
        self._memory_collector: Any = None
        self._redis_stream: Any = None  # Phase 3.1
        self._redis_connect_attempted: bool = False  # avoid blocking re-tries

    # ==================== Phase 0.1: Hub Components (lazy) ====================

    @property
    def event_queue(self):
        """Lazy-load core.event_queue.EventQueue. Returns instance or None."""
        if self._event_queue is None:
            try:
                from core.event_queue import EventQueue

                self._event_queue = EventQueue()
                logger.info("Runtime: EventQueue loaded")
            except Exception as e:
                logger.warning(f"Runtime: EventQueue unavailable ({e})")
                self._event_queue = _LOAD_FAILED
        return self._event_queue if self._event_queue is not _LOAD_FAILED else None

    @property
    def memory(self):
        """Lazy-load memory.sqlite_memory.AgentMemory. Returns instance or None."""
        if self._memory is None:
            try:
                from memory.sqlite_memory import AgentMemory

                self._memory = AgentMemory()
                self._memory.initialize()
                logger.info("Runtime: AgentMemory loaded")
            except Exception as e:
                logger.warning(f"Runtime: AgentMemory unavailable ({e})")
                self._memory = _LOAD_FAILED
        return self._memory if self._memory is not _LOAD_FAILED else None

    @property
    def recovery_agent(self):
        """Lazy-load agents.recovery_agent.RecoveryAgent. Returns instance or None."""
        if self._recovery_agent is None:
            try:
                from agents.recovery_agent import RecoveryAgent as _RA

                self._recovery_agent = _RA()
                logger.info("Runtime: RecoveryAgent loaded")
            except Exception as e:
                logger.warning(f"Runtime: RecoveryAgent unavailable ({e})")
                self._recovery_agent = _LOAD_FAILED
        return (
            self._recovery_agent if self._recovery_agent is not _LOAD_FAILED else None
        )

    @property
    def validated_executor(self):
        """Lazy-load core.validated_executor.ValidatedExecutor. Returns instance or None."""
        if self._validated_executor is None:
            try:
                from core.validated_executor import ValidatedExecutor

                self._validated_executor = ValidatedExecutor()
                logger.info("Runtime: ValidatedExecutor loaded")
            except Exception as e:
                logger.warning(f"Runtime: ValidatedExecutor unavailable ({e})")
                self._validated_executor = _LOAD_FAILED
        return (
            self._validated_executor
            if self._validated_executor is not _LOAD_FAILED
            else None
        )

    @property
    def pattern_store(self):
        """Lazy-load moire_tracker learning PatternStore. Returns instance or None."""
        if self._pattern_store is None:
            try:
                # PatternStore lives in the parallel moire_tracker hierarchy.
                # Add it to sys.path on demand.
                _mt_python = os.path.abspath(
                    os.path.join(
                        _MOIRE_AGENTS_ROOT, "..", "..", "moire_tracker", "python"
                    )
                )
                if os.path.isdir(_mt_python) and _mt_python not in sys.path:
                    sys.path.insert(0, _mt_python)
                from learning.pattern_store import PatternStore

                self._pattern_store = PatternStore()
                logger.info("Runtime: PatternStore loaded")
            except Exception as e:
                logger.warning(f"Runtime: PatternStore unavailable ({e})")
                self._pattern_store = _LOAD_FAILED
        return self._pattern_store if self._pattern_store is not _LOAD_FAILED else None

    async def get_redis_stream(self):
        """Lazy connect to RedisStreamClient. Returns instance or None.

        Phase 3.1: streaming step events. Failure to connect (e.g. no Redis
        running) is treated as a noop — the runtime never blocks on streaming.
        """
        if self._redis_stream is None and not self._redis_connect_attempted:
            self._redis_connect_attempted = True
            try:
                from core.redis_streams import RedisStreamClient

                client = RedisStreamClient()
                ok = await client.connect()
                if ok:
                    self._redis_stream = client
                    logger.info("Runtime: RedisStreamClient connected")
                else:
                    self._redis_stream = _LOAD_FAILED
                    logger.info("Runtime: Redis unavailable (connect returned False)")
            except Exception as e:
                logger.info(f"Runtime: Redis unavailable ({e})")
                self._redis_stream = _LOAD_FAILED
        return self._redis_stream if self._redis_stream is not _LOAD_FAILED else None

    async def publish_step_event(
        self,
        event_type: str,
        payload: Dict[str, Any],
    ) -> bool:
        """Phase 3.1 helper: publish a step event to the Redis stream if available.

        Returns True if delivered, False if Redis is not present (no error).
        """
        client = await self.get_redis_stream()
        if client is None:
            return False
        try:
            await client.publish_event(event_type, payload)
            return True
        except Exception as e:
            logger.debug(f"publish_step_event failed: {e}")
            return False

    @property
    def memory_collector(self):
        """Lazy-load moire_tracker learning MemoryCollector. Returns instance or None."""
        if self._memory_collector is None:
            try:
                _mt_python = os.path.abspath(
                    os.path.join(
                        _MOIRE_AGENTS_ROOT, "..", "..", "moire_tracker", "python"
                    )
                )
                if os.path.isdir(_mt_python) and _mt_python not in sys.path:
                    sys.path.insert(0, _mt_python)
                from learning.memory_collector import MemoryCollector

                self._memory_collector = MemoryCollector()
                logger.info("Runtime: MemoryCollector loaded")
            except Exception as e:
                logger.warning(f"Runtime: MemoryCollector unavailable ({e})")
                self._memory_collector = _LOAD_FAILED
        return (
            self._memory_collector
            if self._memory_collector is not _LOAD_FAILED
            else None
        )

    # ==================== Phase 2: Self-Correction Loop ==================

    async def execute_with_recovery(
        self,
        plan: List[Dict[str, Any]],
        step_executor: Callable,
        goal: Optional[str] = None,
        max_retries: int = 3,
        max_replans: int = 2,
    ) -> Dict[str, Any]:
        """Execute a plan with automatic recovery and replanning.

        For each step:
          1. Run `step_executor(step)` (async, returns step_result dict).
          2. If success: append result, continue.
          3. If failure: ask RecoveryAgent for a strategy.
             - RETRY_SAME / RETRY_ALTERNATIVE: re-execute with the agent's
               modified action params (RecoveryResult.new_action).
             - SKIP_AND_CONTINUE: log it, move on.
             - ABORT_AND_REPORT: stop, return partial results.
             - REPLAN: ask the PlanningTeam to replan from the failure point
               (up to max_replans times) and splice the new tail in.

        Returns a dict shaped like handle_execute's normal output, plus:
          - recovery_attempts: total number of RecoveryAgent invocations
          - replan_count: number of full replans triggered
          - final_strategy: terminal strategy name if execution stopped early
        """
        ra = self.recovery_agent
        if ra is None:
            # No recovery agent available — fall through to plain linear loop.
            results: List[Dict[str, Any]] = []
            success = True
            for i, step in enumerate(plan):
                step_result = await step_executor(step)
                step_result["step"] = i + 1
                if not step_result.get("success"):
                    success = False
                results.append(step_result)
            return {
                "success": success,
                "steps_executed": len(results),
                "results": results,
                "recovery_attempts": 0,
                "replan_count": 0,
                "recovery_available": False,
            }

        # Lazy import — RecoveryAgent's enums live in agents.recovery_agent.
        try:
            from agents.recovery_agent import \
                FailureContext as _FailureContext  # type: ignore
            from agents.recovery_agent import \
                RecoveryStrategy as _RecoveryStrategy
        except Exception as e:
            logger.warning(f"execute_with_recovery: recovery types unavailable ({e})")
            return (
                await self.execute_with_recovery(
                    plan, step_executor, goal, max_retries, max_replans
                )
                if False
                else {
                    "success": False,
                    "error": f"recovery types unavailable: {e}",
                    "results": [],
                }
            )

        # Mutable working plan we can splice into during REPLAN.
        working_plan: List[Dict[str, Any]] = list(plan)
        results: List[Dict[str, Any]] = []
        success = True
        recovery_attempts = 0
        replan_count = 0
        final_strategy: Optional[str] = None

        i = 0
        while i < len(working_plan):
            step = working_plan[i]
            attempt = 0
            step_succeeded = False
            current_step = step

            # Phase 3.1: publish step_started event.
            await self.publish_step_event(
                "step_started",
                {"step_index": i, "step_type": step.get("type"), "goal": goal},
            )

            while attempt <= max_retries:
                step_result = await step_executor(current_step)
                step_result["step"] = i + 1
                step_result["attempt"] = attempt + 1

                if step_result.get("success"):
                    step_succeeded = True
                    results.append(step_result)
                    # Phase 3.1: publish step_completed event.
                    await self.publish_step_event(
                        "step_completed",
                        {
                            "step_index": i,
                            "step_type": step.get("type"),
                            "attempt": attempt + 1,
                        },
                    )
                    break

                # Failure path: ask the recovery agent.
                recovery_attempts += 1
                ctx = _FailureContext(
                    action_type=current_step.get("type", "unknown"),
                    action_params=current_step,
                    error_message=step_result.get("error", "unknown error"),
                    attempt_count=attempt,
                    goal=goal or "",
                    remaining_subtasks=working_plan[i + 1 :],
                )

                try:
                    rec = await ra.handle_failure(ctx)
                except Exception as e:
                    logger.warning(f"RecoveryAgent.handle_failure crashed: {e}")
                    step_result["recovery_error"] = str(e)
                    results.append(step_result)
                    success = False
                    final_strategy = "recovery_crashed"
                    return {
                        "success": False,
                        "steps_executed": len(results),
                        "results": results,
                        "recovery_attempts": recovery_attempts,
                        "replan_count": replan_count,
                        "final_strategy": final_strategy,
                    }

                step_result["recovery_strategy"] = rec.strategy.value
                step_result["recovery_message"] = rec.message
                results.append(step_result)

                # Phase 3.1: publish step_recovered event.
                await self.publish_step_event(
                    "step_recovered",
                    {
                        "step_index": i,
                        "strategy": rec.strategy.value,
                        "attempt": attempt + 1,
                    },
                )

                if (
                    rec.strategy == _RecoveryStrategy.RETRY_SAME
                    or rec.strategy == _RecoveryStrategy.RETRY_ALTERNATIVE
                ):
                    attempt += 1
                    if rec.new_action:
                        # Merge RecoveryAgent's modified params back into the step.
                        current_step = {**current_step, **rec.new_action}
                    continue

                if rec.strategy == _RecoveryStrategy.SKIP_AND_CONTINUE:
                    # Treat as soft-success and move on.
                    step_succeeded = True
                    break

                if rec.strategy == _RecoveryStrategy.ABORT_AND_REPORT:
                    final_strategy = "abort"
                    success = False
                    return {
                        "success": False,
                        "steps_executed": len(results),
                        "results": results,
                        "recovery_attempts": recovery_attempts,
                        "replan_count": replan_count,
                        "final_strategy": final_strategy,
                    }

                if rec.strategy == _RecoveryStrategy.REPLAN:
                    if replan_count >= max_replans:
                        final_strategy = "replan_exhausted"
                        success = False
                        return {
                            "success": False,
                            "steps_executed": len(results),
                            "results": results,
                            "recovery_attempts": recovery_attempts,
                            "replan_count": replan_count,
                            "final_strategy": final_strategy,
                        }
                    new_tail = await self._replan_via_planning_team(
                        goal=goal or "",
                        failed_step=current_step,
                        full_plan=working_plan,
                        error_context=step_result.get("error", ""),
                    )
                    if new_tail is not None:
                        working_plan = working_plan[:i] + new_tail
                        replan_count += 1
                        attempt = 0  # restart the retry counter on the spliced plan
                        if i < len(working_plan):
                            current_step = working_plan[i]
                            continue
                    # Replan returned nothing — give up.
                    final_strategy = "replan_failed"
                    success = False
                    return {
                        "success": False,
                        "steps_executed": len(results),
                        "results": results,
                        "recovery_attempts": recovery_attempts,
                        "replan_count": replan_count,
                        "final_strategy": final_strategy,
                    }

                # Unknown strategy — abort defensively.
                final_strategy = f"unknown_{rec.strategy.value}"
                success = False
                return {
                    "success": False,
                    "steps_executed": len(results),
                    "results": results,
                    "recovery_attempts": recovery_attempts,
                    "replan_count": replan_count,
                    "final_strategy": final_strategy,
                }

            if not step_succeeded:
                # All retries exhausted without resolution.
                success = False
                final_strategy = final_strategy or "retries_exhausted"
                break

            i += 1

        return {
            "success": success,
            "steps_executed": len(results),
            "results": results,
            "recovery_attempts": recovery_attempts,
            "replan_count": replan_count,
            "final_strategy": final_strategy,
        }

    async def _replan_via_planning_team(
        self,
        goal: str,
        failed_step: Dict[str, Any],
        full_plan: List[Dict[str, Any]],
        error_context: str,
    ) -> Optional[List[Dict[str, Any]]]:
        """Ask PlanningTeam.replan_from for a new tail. Returns None on failure."""
        try:
            # Late import to avoid pulling PlanningTeam at runtime.py import time.
            from agents.handoff.planning_team import \
                PlanningTeam  # type: ignore

            # PlanningTeam should be a singleton owned by the MCP server, but
            # the runtime should still work in isolation. Construct a fresh
            # one as a fallback.
            team = PlanningTeam(max_debate_rounds=1, use_llm=True)
            await team.start()
            try:
                if hasattr(team, "replan_from"):
                    return await team.replan_from(
                        goal=goal,
                        failed_step=failed_step,
                        full_plan=full_plan,
                        error_context=error_context,
                    )
                logger.warning("PlanningTeam.replan_from missing — Phase 2 incomplete")
                return None
            finally:
                await team.stop()
        except Exception as e:
            logger.warning(f"_replan_via_planning_team failed: {e}")
            return None

    def get_hub_status(self) -> Dict[str, bool]:
        """Return availability of every hub component (without forcing a load)."""

        def _state(slot):
            if slot is None:
                return "not_loaded"
            if slot is _LOAD_FAILED:
                return "unavailable"
            return "loaded"

        return {
            "event_queue": _state(self._event_queue),
            "memory": _state(self._memory),
            "recovery_agent": _state(self._recovery_agent),
            "validated_executor": _state(self._validated_executor),
            "pattern_store": _state(self._pattern_store),
            "memory_collector": _state(self._memory_collector),
        }

    # ==================== Agent Management ====================

    async def register_agent(self, name: str, agent: BaseHandoffAgent):
        """
        Register an agent with the runtime.

        Args:
            name: Unique agent name
            agent: Agent instance
        """
        if name in self._agents:
            logger.warning(f"Agent '{name}' already registered, replacing")

        self._agents[name] = agent
        agent.set_runtime(self)
        await agent.start()

        logger.info(f"Runtime: Registered agent '{name}'")

    def get_agent(self, name: str) -> Optional[BaseHandoffAgent]:
        """Get an agent by name."""
        return self._agents.get(name)

    def list_agents(self) -> List[str]:
        """List all registered agent names."""
        return list(self._agents.keys())

    # ==================== Task Distribution ====================

    async def publish_task(
        self, task: UserTask, target_agent: str, session_id: Optional[str] = None
    ) -> str:
        """
        Publish a task to a specific agent.

        Args:
            task: The task to execute
            target_agent: Name of the agent to receive the task
            session_id: Optional session ID (creates new if not provided)

        Returns:
            Session ID for tracking
        """
        # Create or get session
        if session_id is None:
            session_id = str(uuid.uuid4())

        if session_id not in self._sessions:
            self._sessions[session_id] = Session(id=session_id, task=task)

        session = self._sessions[session_id]
        session.current_agent = target_agent
        task.session_id = session_id

        # Queue the task
        await self._task_queue.put((task, target_agent))

        logger.info(
            f"Runtime: Published task to '{target_agent}' (session: {session_id[:8]})"
        )
        return session_id

    async def handle_handoff(self, request: HandoffRequest) -> AgentResponse:
        """
        Handle a handoff request from one agent to another.

        Args:
            request: The handoff request

        Returns:
            Response from the target agent
        """
        # Check handoff limit
        if request.handoff_count >= self.max_handoffs:
            logger.error(f"Runtime: Max handoffs ({self.max_handoffs}) exceeded")
            return AgentResponse(
                success=False,
                error=f"Maximum handoffs ({self.max_handoffs}) exceeded",
                session_id=request.task.session_id if request.task else "",
            )

        target_agent = self._agents.get(request.target_agent)
        if not target_agent:
            logger.error(f"Runtime: Unknown target agent '{request.target_agent}'")
            return AgentResponse(
                success=False,
                error=f"Unknown agent: {request.target_agent}",
                session_id=request.task.session_id if request.task else "",
            )

        # Update session
        session_id = request.task.session_id if request.task else ""
        if session_id and session_id in self._sessions:
            session = self._sessions[session_id]
            session.current_agent = request.target_agent
            session.handoff_count += 1

        self._stats["handoffs_routed"] += 1

        logger.info(
            f"Runtime: Routing handoff to '{request.target_agent}' "
            f"(reason: {request.reason}, count: {request.handoff_count})"
        )

        # Execute on target agent
        if request.task:
            request.task.context["handoff_count"] = request.handoff_count + 1
            return await target_agent.handle_task(request.task)
        else:
            return AgentResponse(
                success=False,
                error="Handoff request missing task",
                session_id=session_id,
            )

    # ==================== Progress & Results ====================

    async def publish_progress(self, update: ProgressUpdate):
        """
        Publish a progress update from an agent.

        Args:
            update: Progress update
        """
        session_id = update.session_id
        if session_id and session_id in self._sessions:
            self._sessions[session_id].progress_updates.append(update)

        logger.debug(
            f"Runtime: Progress from '{update.agent_name}': "
            f"{update.progress_percentage:.0f}% - {update.current_action}"
        )

        # Call progress callback if registered
        if self.on_progress:
            try:
                self.on_progress(update)
            except Exception as e:
                logger.error(f"Progress callback error: {e}")

    def get_session(self, session_id: str) -> Optional[Session]:
        """Get session by ID."""
        return self._sessions.get(session_id)

    async def wait_for_completion(
        self, session_id: str, timeout: Optional[float] = None
    ) -> Optional[AgentResponse]:
        """
        Wait for a session to complete.

        Args:
            session_id: Session to wait for
            timeout: Optional timeout (uses default if not specified)

        Returns:
            Final response or None if timeout
        """
        timeout = timeout or self.task_timeout
        start_time = asyncio.get_event_loop().time()

        while True:
            session = self._sessions.get(session_id)
            if not session:
                return None

            if session.completed:
                return session.responses[-1] if session.responses else None

            elapsed = asyncio.get_event_loop().time() - start_time
            if elapsed >= timeout:
                logger.warning(f"Runtime: Session {session_id[:8]} timed out")
                return None

            await asyncio.sleep(0.1)

    # ==================== Runtime Lifecycle ====================

    async def start(self):
        """Start the runtime processor."""
        if self._running:
            logger.warning("Runtime already running")
            return

        self._running = True
        self._processor_task = asyncio.create_task(self._process_loop())
        logger.info("Runtime: Started")

    async def stop(self):
        """Stop the runtime."""
        self._running = False

        if self._processor_task:
            self._processor_task.cancel()
            try:
                await self._processor_task
            except asyncio.CancelledError:
                pass

        # Stop all agents
        for agent in self._agents.values():
            await agent.stop()

        logger.info("Runtime: Stopped")

    async def stop_when_idle(self, timeout: float = 30.0):
        """Stop when all tasks are processed or timeout."""
        start_time = asyncio.get_event_loop().time()

        while self._running:
            if self._task_queue.empty():
                # Check if any sessions are still active
                active = any(not s.completed for s in self._sessions.values())
                if not active:
                    break

            elapsed = asyncio.get_event_loop().time() - start_time
            if elapsed >= timeout:
                logger.warning("Runtime: Idle timeout reached")
                break

            await asyncio.sleep(0.1)

        await self.stop()

    async def _process_loop(self):
        """Main processing loop."""
        logger.info("Runtime: Processing loop started")

        while self._running:
            try:
                # Get next task with timeout
                try:
                    task, target_agent = await asyncio.wait_for(
                        self._task_queue.get(), timeout=1.0
                    )
                except asyncio.TimeoutError:
                    continue

                # Get agent
                agent = self._agents.get(target_agent)
                if not agent:
                    logger.error(f"Runtime: Unknown agent '{target_agent}'")
                    continue

                # Process task
                self._stats["tasks_processed"] += 1
                response = await agent.handle_task(task)

                # Update session
                session = self._sessions.get(task.session_id)
                if session:
                    session.responses.append(response)

                # Handle handoff if needed
                if response.next_agent:
                    # Create handoff request
                    handoff = HandoffRequest(
                        target_agent=response.next_agent,
                        task=task,
                        reason=f"Handoff from {target_agent}",
                        handoff_count=task.context.get("handoff_count", 0),
                    )

                    # Route to next agent
                    next_response = await self.handle_handoff(handoff)

                    # Continue chaining until no more handoffs
                    while next_response.next_agent:
                        if session:
                            session.responses.append(next_response)

                        handoff = HandoffRequest(
                            target_agent=next_response.next_agent,
                            task=task,
                            reason=f"Handoff chain",
                            handoff_count=task.context.get("handoff_count", 0),
                        )
                        next_response = await self.handle_handoff(handoff)

                    # Final response
                    if session:
                        session.responses.append(next_response)
                        session.completed = True
                        session.final_result = next_response.result
                        self._stats["sessions_completed"] += 1
                else:
                    # No handoff - task complete
                    if session:
                        session.completed = True
                        session.final_result = response.result
                        self._stats["sessions_completed"] += 1

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Runtime: Processing error - {e}")
                self._stats["errors"] += 1

        logger.info("Runtime: Processing loop ended")

    # ==================== Utilities ====================

    def get_stats(self) -> Dict[str, Any]:
        """Get runtime statistics, including hub component status."""
        stats = {
            **self._stats,
            "agents_registered": len(self._agents),
            "active_sessions": sum(
                1 for s in self._sessions.values() if not s.completed
            ),
            "total_sessions": len(self._sessions),
            "hub": self.get_hub_status(),
        }

        # If memory was already loaded, expose its own stats inline.
        if self._memory and self._memory is not _LOAD_FAILED:
            try:
                stats["memory_stats"] = self._memory.get_stats()
            except Exception as e:
                stats["memory_stats"] = {"error": str(e)}

        # If event_queue was already loaded, expose its status inline.
        if self._event_queue and self._event_queue is not _LOAD_FAILED:
            try:
                stats["event_queue_status"] = self._event_queue.get_status()
            except Exception as e:
                stats["event_queue_status"] = {"error": str(e)}

        return stats

    async def run_task(
        self, task: UserTask, entry_agent: str = "orchestrator"
    ) -> AgentResponse:
        """
        Convenience method to run a single task to completion.

        Args:
            task: Task to execute
            entry_agent: Agent to start with

        Returns:
            Final response
        """
        session_id = await self.publish_task(task, entry_agent)
        await self.start()
        response = await self.wait_for_completion(session_id, self.task_timeout)
        await self.stop()

        return response or AgentResponse(
            success=False, error="Task did not complete", session_id=session_id
        )
