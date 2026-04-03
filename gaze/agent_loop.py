"""Asyncio agent loops — triage + act pattern with @mention wake."""

import asyncio
import json
import logging
from typing import Optional

from .database import Database
from .llm import call_llm, TRIAGE_MODEL, ACT_MODEL

logger = logging.getLogger(__name__)

TRIAGE_SYSTEM = (
    "You are {name}, {role}.\n\n"
    "You participate in a shared #forum channel with other AI agents. "
    "You will be shown recent messages and asked whether you should respond.\n\n"
    "Reply with valid JSON only — no prose, no markdown:\n"
    '  {{"action": "read"}} — to read and compose a reply\n'
    '  {{"action": "skip", "reason": "..."}} — to stay quiet this cycle'
)

ACT_SYSTEM = (
    "You are {name}, {role}.\n\n"
    "{system_prompt}\n\n"
    "You are in a shared #forum channel with other AI agents and a human user. "
    "Read the recent messages and post a reply when it is relevant to your role. "
    "You can @mention other agents to involve them. "
    "Keep your replies concise and focused. Be collaborative and helpful. "
    "Human messages (from 'You') are priority — address them directly.\n\n"
    "Reply with valid JSON only — no prose, no markdown:\n"
    '  {{"action": "post", "content": "..."}} — to post a message\n'
    '  {{"action": "skip", "reason": "..."}} — to stay quiet'
)


def _format_messages(messages: list) -> str:
    lines = []
    for msg in messages:
        ts = (msg.get("timestamp") or "")[:16]
        lines.append(f"[{msg['author_name']}] {ts}: {msg['content']}")
    return "\n".join(lines)


class AgentLoop:
    def __init__(self, agent: dict, db: Database):
        self.agent = agent
        self.db = db
        self.running = False
        self.task: Optional[asyncio.Task] = None
        self._wake_event = asyncio.Event()
        self.messages_sent = 0
        self.session_id: Optional[int] = None

    async def start(self):
        self.running = True
        self.session_id = await self.db.create_session(self.agent["id"])
        self.task = asyncio.create_task(self._run(), name=f"agent-{self.agent['name']}")
        logger.info("Started agent loop: %s", self.agent["name"])

    async def stop(self):
        self.running = False
        self._wake_event.set()
        if self.task and not self.task.done():
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
        logger.info("Stopped agent loop: %s", self.agent["name"])

    async def wake(self):
        """Wake the agent immediately (triggered by @mention)."""
        self._wake_event.set()

    async def _run(self):
        agent_id = self.agent["id"]
        name = self.agent["name"]
        role = self.agent["role"]
        interval = self.agent.get("check_interval", 30)

        await self.db.update_agent_status(agent_id, "idle")

        while self.running:
            try:
                # Sleep for check_interval or until woken
                try:
                    await asyncio.wait_for(
                        self._wait_for_wake(),
                        timeout=float(interval),
                    )
                except asyncio.TimeoutError:
                    pass

                self._wake_event.clear()

                if not self.running:
                    break

                # --- Triage (haiku, cheap) ---
                recent = await self.db.get_recent_messages(30)
                if not recent:
                    await self.db.update_agent_status(agent_id, "sleeping")
                    continue

                await self.db.update_agent_status(agent_id, "thinking", "Reviewing messages")

                triage_system = TRIAGE_SYSTEM.format(name=name, role=role)
                triage_user = (
                    f"You are {name}, {role}.\n"
                    f"There are {len(recent)} messages in #forum.\n"
                    f"Last 5 messages:\n{_format_messages(recent[-5:])}\n\n"
                    "Should you respond right now? "
                    'Reply JSON: {"action": "read"} or {"action": "skip", "reason": "..."}'
                )

                triage = await call_llm(triage_system, triage_user, model=TRIAGE_MODEL)

                if not triage or triage.get("action") != "read":
                    reason = (triage or {}).get("reason", "nothing relevant")
                    logger.debug("%s skipping: %s", name, reason)
                    await self.db.update_agent_status(agent_id, "sleeping")
                    if self.session_id:
                        await self.db.update_session(
                            self.session_id, self.messages_sent, json.dumps(triage)
                        )
                    continue

                # --- Act (sonnet, full reasoning) ---
                await self.db.update_agent_status(agent_id, "acting", "Composing reply")

                act_system = ACT_SYSTEM.format(
                    name=name,
                    role=role,
                    system_prompt=self.agent.get("system_prompt", ""),
                )
                act_user = (
                    f"Recent #forum messages:\n{_format_messages(recent)}\n\n"
                    f"Post a reply relevant to your role as {role}. "
                    'Reply JSON: {"action": "post", "content": "..."} or {"action": "skip", "reason": "..."}'
                )

                act = await call_llm(act_system, act_user, model=ACT_MODEL)

                if act and act.get("action") == "post":
                    content = (act.get("content") or "").strip()
                    if content:
                        await self.db.post_message(
                            author_name=name,
                            content=content,
                            agent_id=agent_id,
                        )
                        self.messages_sent += 1
                        logger.info("%s posted a message", name)

                if self.session_id:
                    await self.db.update_session(
                        self.session_id, self.messages_sent, json.dumps(act)
                    )

                await self.db.update_agent_status(agent_id, "idle")

            except asyncio.CancelledError:
                break
            except Exception:
                logger.exception("Unhandled error in agent loop %s", name)
                await self.db.update_agent_status(agent_id, "idle")
                await asyncio.sleep(5)

        await self.db.update_agent_status(agent_id, "sleeping")

    async def _wait_for_wake(self):
        await self._wake_event.wait()
