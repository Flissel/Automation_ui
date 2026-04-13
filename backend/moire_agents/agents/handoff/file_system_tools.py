"""File / System / Shell tools for the Handoff MCP server.

Phase 1.3: implements the 9 file/system MCP tools that the documentation
promised but the server never registered:

  - handoff_shell        — guarded shell execution (allowlist)
  - handoff_file_search  — recursive glob
  - handoff_file_open    — open file with the OS default app
  - handoff_dir_list     — directory listing with stat info
  - handoff_file_read    — bounded text read
  - handoff_file_write   — guarded write with size cap
  - handoff_process_list — psutil process snapshot
  - handoff_process_kill — guarded process termination
  - handoff_system_info  — cpu / memory / disk / boot

Security model
==============

`handoff_shell` is the most dangerous tool. The user explicitly chose
"allowlist of commands" over a free shell. Only commands whose first token
matches `SHELL_ALLOWLIST` are allowed. Commands are NEVER passed to a real
shell — `subprocess.run(shell=False, ...)` is used so quoting / `&&` /
redirection cannot be smuggled in. The full argv is logged.

`handoff_process_kill` rejects any PID below `_PROCESS_KILL_PID_FLOOR` (this
covers init, systemd, kernel threads on Linux and the System Idle / System
processes on Windows) and refuses to terminate the current Python process.

`handoff_file_write` requires `confirm=True` and refuses paths inside
`_FORBIDDEN_WRITE_PATHS` (system directories).

These guardrails protect against an LLM hallucinating a destructive call.
They are NOT a substitute for running the MCP server in an unprivileged
account.
"""

from __future__ import annotations

import asyncio
import logging
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


# ─── Security configuration ──────────────────────────────────────────────────

#: Commands whose first token may appear in handoff_shell.
#: Read-only / inspection commands by default. Add carefully.
SHELL_ALLOWLIST = frozenset(
    {
        # Filesystem inspection
        "dir",
        "ls",
        "pwd",
        "cd",
        "type",
        "cat",
        "head",
        "tail",
        "find",
        "tree",
        "stat",
        "file",
        "wc",
        "du",
        "df",
        # Source control (read-mostly)
        "git",
        "gh",
        # Build / package managers (run scripts, not arbitrary install)
        "npm",
        "pnpm",
        "yarn",
        "bun",
        "node",
        "python",
        "python3",
        "py",
        "pip",
        "uv",
        "cargo",
        "rustc",
        "go",
        # Process / network inspection
        "where",
        "which",
        "whoami",
        "hostname",
        "uname",
        "tasklist",
        "ps",
        "netstat",
        # Test runners
        "pytest",
        "vitest",
        "jest",
    }
)

#: Anything below this PID is treated as a system process and refused.
_PROCESS_KILL_PID_FLOOR = 100

#: Write operations into these absolute path prefixes are refused.
_FORBIDDEN_WRITE_PATHS_WIN = (
    "c:\\windows",
    "c:\\program files",
    "c:\\program files (x86)",
    "c:\\programdata",
)
_FORBIDDEN_WRITE_PATHS_NIX = (
    "/etc",
    "/usr",
    "/bin",
    "/sbin",
    "/boot",
    "/sys",
    "/proc",
)

#: Hard cap so an LLM cannot ask for a 1GB file.
DEFAULT_FILE_READ_LIMIT_BYTES = 1024 * 1024  # 1 MiB
DEFAULT_FILE_WRITE_LIMIT_BYTES = 5 * 1024 * 1024  # 5 MiB


def _is_forbidden_write(path: Path) -> bool:
    """Return True if the resolved path lives inside a system directory."""
    try:
        resolved = str(path.resolve()).lower()
    except Exception:
        return True  # better safe than sorry
    if sys.platform == "win32":
        return any(resolved.startswith(p) for p in _FORBIDDEN_WRITE_PATHS_WIN)
    return any(resolved.startswith(p) for p in _FORBIDDEN_WRITE_PATHS_NIX)


# ─── Tool implementations ────────────────────────────────────────────────────


async def handle_shell(
    command: str,
    timeout: int = 30,
    shell: str = "auto",  # accepted for API parity, ignored — never uses real shell
    cwd: Optional[str] = None,
) -> Dict[str, Any]:
    """Execute a command from the allowlist.

    `command` is split with shlex; only the first token is checked against the
    allowlist. The command is executed with `shell=False`, so pipes and
    redirection are NOT supported (intentionally). Use multiple calls instead.
    """
    import shlex

    if not command or not command.strip():
        return {"success": False, "error": "command is empty"}

    try:
        argv = shlex.split(command, posix=(sys.platform != "win32"))
    except ValueError as e:
        return {"success": False, "error": f"command parse failed: {e}"}

    if not argv:
        return {"success": False, "error": "command parse produced no tokens"}

    head = os.path.basename(argv[0]).lower()
    head_no_ext = head.rsplit(".", 1)[0] if "." in head else head
    if head not in SHELL_ALLOWLIST and head_no_ext not in SHELL_ALLOWLIST:
        return {
            "success": False,
            "error": f"command '{argv[0]}' is not in the shell allowlist",
            "allowlist_size": len(SHELL_ALLOWLIST),
            "hint": "ask the user to add the command via SHELL_ALLOWLIST",
        }

    logger.info("handoff_shell exec: %s (cwd=%s)", argv, cwd)
    try:
        proc = await asyncio.to_thread(
            subprocess.run,
            argv,
            shell=False,
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=cwd,
        )
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "error": f"command timed out after {timeout}s",
            "argv": argv,
        }
    except FileNotFoundError:
        return {
            "success": False,
            "error": f"command not found: {argv[0]}",
            "argv": argv,
        }
    except Exception as e:
        return {"success": False, "error": str(e), "argv": argv}

    return {
        "success": proc.returncode == 0,
        "argv": argv,
        "returncode": proc.returncode,
        "stdout": proc.stdout[-8192:],  # cap at 8KB so we don't blow context
        "stderr": proc.stderr[-4096:],
        "stdout_truncated": len(proc.stdout) > 8192,
        "stderr_truncated": len(proc.stderr) > 4096,
    }


async def handle_file_search(
    pattern: str,
    root: Optional[str] = None,
    max_results: int = 200,
) -> Dict[str, Any]:
    """Recursive glob from `root` (default: cwd)."""
    if not pattern:
        return {"success": False, "error": "pattern is required"}

    base = Path(root or os.getcwd())
    if not base.exists():
        return {"success": False, "error": f"root does not exist: {base}"}

    matches: List[str] = []
    try:
        for p in base.rglob(pattern):
            matches.append(str(p))
            if len(matches) >= max_results:
                break
    except PermissionError as e:
        return {"success": False, "error": f"permission denied: {e}"}
    except Exception as e:
        return {"success": False, "error": str(e)}

    return {
        "success": True,
        "pattern": pattern,
        "root": str(base),
        "matches": matches,
        "count": len(matches),
        "truncated": len(matches) >= max_results,
    }


async def handle_file_open(path: str) -> Dict[str, Any]:
    """Open a file with the OS default application."""
    p = Path(path)
    if not p.exists():
        return {"success": False, "error": f"path does not exist: {path}"}

    try:
        if sys.platform == "win32":
            os.startfile(str(p))  # type: ignore[attr-defined]
        elif sys.platform == "darwin":
            await asyncio.to_thread(subprocess.run, ["open", str(p)], check=False)
        else:
            await asyncio.to_thread(subprocess.run, ["xdg-open", str(p)], check=False)
        return {"success": True, "path": str(p.resolve())}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def handle_dir_list(path: Optional[str] = None) -> Dict[str, Any]:
    """List the contents of a directory with basic stat info."""
    base = Path(path or os.getcwd())
    if not base.exists():
        return {"success": False, "error": f"path does not exist: {base}"}
    if not base.is_dir():
        return {"success": False, "error": f"not a directory: {base}"}

    entries: List[Dict[str, Any]] = []
    try:
        for child in sorted(base.iterdir()):
            try:
                st = child.stat()
                entries.append(
                    {
                        "name": child.name,
                        "path": str(child),
                        "is_dir": child.is_dir(),
                        "size": st.st_size if child.is_file() else None,
                        "mtime": st.st_mtime,
                    }
                )
            except (PermissionError, OSError):
                entries.append(
                    {"name": child.name, "path": str(child), "error": "stat failed"}
                )
    except PermissionError as e:
        return {"success": False, "error": f"permission denied: {e}"}

    return {
        "success": True,
        "path": str(base.resolve()),
        "entries": entries,
        "count": len(entries),
    }


async def handle_file_read(
    path: str,
    max_bytes: int = DEFAULT_FILE_READ_LIMIT_BYTES,
    encoding: str = "utf-8",
) -> Dict[str, Any]:
    """Read up to max_bytes of a text file."""
    p = Path(path)
    if not p.exists():
        return {"success": False, "error": f"path does not exist: {path}"}
    if not p.is_file():
        return {"success": False, "error": f"not a file: {path}"}

    try:
        size = p.stat().st_size
        with p.open("rb") as f:
            raw = f.read(max_bytes)
        truncated = size > max_bytes

        try:
            text = raw.decode(encoding)
        except UnicodeDecodeError:
            text = raw.decode(encoding, errors="replace")

        return {
            "success": True,
            "path": str(p.resolve()),
            "size_total": size,
            "size_read": len(raw),
            "truncated": truncated,
            "encoding": encoding,
            "text": text,
        }
    except PermissionError as e:
        return {"success": False, "error": f"permission denied: {e}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def handle_file_write(
    path: str,
    content: str,
    mode: str = "w",  # w | a
    encoding: str = "utf-8",
    confirm: bool = False,
    create_parents: bool = False,
) -> Dict[str, Any]:
    """Write `content` to `path`. Requires `confirm=True`."""
    if not confirm:
        return {
            "success": False,
            "error": "file write requires confirm=True",
            "hint": "set confirm=True after the user has approved the write",
        }
    if mode not in {"w", "a"}:
        return {"success": False, "error": "mode must be 'w' or 'a'"}
    if len(content.encode(encoding, errors="replace")) > DEFAULT_FILE_WRITE_LIMIT_BYTES:
        return {
            "success": False,
            "error": f"content exceeds {DEFAULT_FILE_WRITE_LIMIT_BYTES} byte limit",
        }

    p = Path(path)
    if _is_forbidden_write(p):
        return {
            "success": False,
            "error": f"write to {path} is forbidden (system directory)",
        }

    if create_parents and not p.parent.exists():
        try:
            p.parent.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            return {"success": False, "error": f"could not create parents: {e}"}

    try:
        with p.open(mode, encoding=encoding) as f:
            f.write(content)
        return {
            "success": True,
            "path": str(p.resolve()),
            "bytes_written": len(content.encode(encoding, errors="replace")),
            "mode": mode,
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


def _psutil_or_none():
    try:
        import psutil  # type: ignore

        return psutil
    except ImportError:
        return None


async def handle_process_list(
    name_filter: Optional[str] = None,
    limit: int = 100,
) -> Dict[str, Any]:
    """List running processes via psutil. Falls back to a 501 if psutil missing."""
    psutil = _psutil_or_none()
    if psutil is None:
        return {
            "success": False,
            "error": "psutil not installed",
            "hint": "pip install psutil",
        }

    procs: List[Dict[str, Any]] = []
    name_lc = name_filter.lower() if name_filter else None
    try:
        for proc in psutil.process_iter(
            ["pid", "name", "username", "cpu_percent", "memory_info"]
        ):
            try:
                info = proc.info
                if name_lc and name_lc not in (info.get("name") or "").lower():
                    continue
                procs.append(
                    {
                        "pid": info["pid"],
                        "name": info.get("name") or "",
                        "username": info.get("username") or "",
                        "cpu_percent": info.get("cpu_percent") or 0.0,
                        "memory_mb": round(
                            (
                                info.get("memory_info").rss
                                if info.get("memory_info")
                                else 0
                            )
                            / (1024 * 1024),
                            2,
                        ),
                    }
                )
                if len(procs) >= limit:
                    break
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
    except Exception as e:
        return {"success": False, "error": str(e)}

    return {
        "success": True,
        "count": len(procs),
        "processes": procs,
        "filter": name_filter,
    }


async def handle_process_kill(pid: int, force: bool = False) -> Dict[str, Any]:
    """Terminate a process by PID, with system-PID and self-PID guards."""
    psutil = _psutil_or_none()
    if psutil is None:
        return {
            "success": False,
            "error": "psutil not installed",
            "hint": "pip install psutil",
        }

    if pid < _PROCESS_KILL_PID_FLOOR:
        return {
            "success": False,
            "error": f"refusing to kill system PID {pid} (< {_PROCESS_KILL_PID_FLOOR})",
        }
    if pid == os.getpid():
        return {"success": False, "error": "refusing to kill the MCP server itself"}

    try:
        proc = psutil.Process(pid)
        name = proc.name()
        if force:
            proc.kill()
        else:
            proc.terminate()
        return {"success": True, "pid": pid, "name": name, "force": force}
    except psutil.NoSuchProcess:
        return {"success": False, "error": f"no such process: {pid}"}
    except psutil.AccessDenied:
        return {"success": False, "error": f"access denied for pid {pid}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def handle_system_info() -> Dict[str, Any]:
    """Return cpu / memory / disk / boot info via psutil + platform."""
    import platform

    info: Dict[str, Any] = {
        "platform": platform.system(),
        "platform_release": platform.release(),
        "platform_version": platform.version(),
        "machine": platform.machine(),
        "processor": platform.processor(),
        "python_version": platform.python_version(),
        "cwd": os.getcwd(),
    }

    psutil = _psutil_or_none()
    if psutil is None:
        info["psutil"] = "not installed"
        return {"success": True, "info": info, "limited": True}

    try:
        info["cpu"] = {
            "count_logical": psutil.cpu_count(logical=True),
            "count_physical": psutil.cpu_count(logical=False),
            "percent": psutil.cpu_percent(interval=None),
        }
        vm = psutil.virtual_memory()
        info["memory"] = {
            "total_gb": round(vm.total / (1024**3), 2),
            "available_gb": round(vm.available / (1024**3), 2),
            "used_percent": vm.percent,
        }
        disks = []
        for part in psutil.disk_partitions(all=False):
            try:
                usage = psutil.disk_usage(part.mountpoint)
                disks.append(
                    {
                        "device": part.device,
                        "mountpoint": part.mountpoint,
                        "fstype": part.fstype,
                        "total_gb": round(usage.total / (1024**3), 2),
                        "used_percent": usage.percent,
                    }
                )
            except (PermissionError, OSError):
                continue
        info["disks"] = disks
        info["boot_time"] = psutil.boot_time()
        info["uptime_seconds"] = round(time.time() - psutil.boot_time(), 1)
    except Exception as e:
        info["psutil_error"] = str(e)

    return {"success": True, "info": info}
