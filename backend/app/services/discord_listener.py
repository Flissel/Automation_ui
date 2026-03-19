"""
Discord Listener for Automation_ui Analyzer Bot.

Polls #fixes channel for FIX_NEEDED messages, analyzes with Vision model,
and posts fix suggestions back to #dev-tasks.

Started as background task when Automation_ui backend boots.
"""

import asyncio
import json
import logging
import os
import re

import httpx

logger = logging.getLogger(__name__)

DISCORD_API = "https://discord.com/api/v10"
BOT_TOKEN = os.environ.get("DISCORD_BOT_TOKEN", "")
FIXES_CHANNEL = os.environ.get("DISCORD_CH_FIXES", "1484193412679733302")
DEV_TASKS_CHANNEL = os.environ.get("DISCORD_CH_DEV_TASKS", "1484193408955322399")
OPENROUTER_KEY = os.environ.get("OPENROUTER_API_KEY", "")
POLL_INTERVAL = 15  # seconds


class DiscordAnalyzerListener:
    """Polls Discord #fixes and generates fix suggestions."""

    def __init__(self):
        self.last_seen_id = "0"
        self.running = False
        self.headers = {
            "Authorization": "Bot %s" % BOT_TOKEN,
            "Content-Type": "application/json",
        }

    async def start(self):
        """Start polling loop."""
        if not BOT_TOKEN:
            logger.warning("No DISCORD_BOT_TOKEN, Analyzer listener disabled")
            return

        self.running = True
        # Skip existing messages
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    "%s/channels/%s/messages?limit=1" % (DISCORD_API, FIXES_CHANNEL),
                    headers=self.headers, timeout=10,
                )
                if resp.status_code == 200:
                    msgs = resp.json()
                    if msgs:
                        self.last_seen_id = msgs[0]["id"]
        except Exception:
            pass

        logger.info("Analyzer listener started, polling #fixes")
        while self.running:
            try:
                await self._poll()
            except Exception as e:
                logger.error("Analyzer poll error: %s", e)
            await asyncio.sleep(POLL_INTERVAL)

    def stop(self):
        self.running = False

    async def _poll(self):
        """Check for new FIX_NEEDED messages."""
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "%s/channels/%s/messages?limit=5&after=%s" % (DISCORD_API, FIXES_CHANNEL, self.last_seen_id),
                headers=self.headers, timeout=10,
            )
            if resp.status_code != 200:
                return
            messages = resp.json()

        for msg in reversed(messages):
            if int(msg["id"]) <= int(self.last_seen_id):
                continue
            self.last_seen_id = msg["id"]

            content = msg.get("content", "")
            if "FIX_NEEDED" not in content:
                continue

            # Extract task info from hidden JSON
            match = re.search(r'\|\|`(\{[^`]+\})`\|\|', content)
            if not match:
                continue
            try:
                header = json.loads(match.group(1))
            except json.JSONDecodeError:
                continue

            task_id = header.get("task", "")
            logger.info("Analyzer: fixing %s", task_id)

            # Generate fix with LLM
            fix = await self._generate_fix(content, header)

            # Post to #dev-tasks
            await self._post_fix(task_id, fix, header)

    async def _generate_fix(self, error_content: str, header: dict) -> str:
        """Use OpenRouter LLM to analyze error and suggest fix."""
        if not OPENROUTER_KEY:
            return "No API key for analysis"

        prompt = "Analyze this error and provide a minimal code fix:\n%s" % error_content[:800]
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={"Authorization": "Bearer %s" % OPENROUTER_KEY},
                    json={
                        "model": os.environ.get("LLM_MODEL", "qwen/qwen3-coder:free"),
                        "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": 800,
                    },
                )
                if resp.status_code == 429:
                    await asyncio.sleep(15)
                    return "Rate limited, retry later"
                data = resp.json()
                return data.get("choices", [{}])[0].get("message", {}).get("content", "No fix")
        except Exception as e:
            return "Analysis error: %s" % str(e)[:100]

    async def _post_fix(self, task_id: str, fix: str, header: dict):
        """Post fix suggestion to #dev-tasks."""
        msg_content = "**FIX_APPLIED** | %s\nTask: `%s`\n**Diff:**\n```diff\n%s\n```\n**Action:** `RETEST`\n||`%s`||" % (
            header.get("scope", "FULLSTACK"),
            task_id,
            fix[:800],
            json.dumps({"type": "FIX_APPLIED", "task": task_id, "action": "RETEST"}),
        )
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    "%s/channels/%s/messages" % (DISCORD_API, DEV_TASKS_CHANNEL),
                    headers=self.headers,
                    json={"content": msg_content[:2000]},
                    timeout=10,
                )
        except Exception as e:
            logger.error("Failed to post fix: %s", e)


# Singleton
_listener = None


def get_listener() -> DiscordAnalyzerListener:
    global _listener
    if not _listener:
        _listener = DiscordAnalyzerListener()
    return _listener


async def start_analyzer_listener():
    """Call this from app startup."""
    listener = get_listener()
    asyncio.create_task(listener.start())
