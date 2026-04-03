"""SQLite wrapper using aiosqlite. Manages all 4 tables + SSE broadcasting."""

import asyncio
import aiosqlite
from typing import Optional, List, Dict


class Database:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.db: Optional[aiosqlite.Connection] = None
        self._subscribers: List[asyncio.Queue] = []

    async def connect(self):
        self.db = await aiosqlite.connect(self.db_path)
        self.db.row_factory = aiosqlite.Row
        await self._init_tables()

    async def close(self):
        if self.db:
            await self.db.close()

    async def _init_tables(self):
        await self.db.executescript("""
            CREATE TABLE IF NOT EXISTS agents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                role TEXT NOT NULL,
                system_prompt TEXT NOT NULL,
                avatar_color TEXT NOT NULL DEFAULT '#6366f1',
                status TEXT NOT NULL DEFAULT 'idle',
                current_action TEXT DEFAULT NULL,
                check_interval INTEGER NOT NULL DEFAULT 30,
                last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS channels (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                description TEXT DEFAULT ''
            );

            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel_id INTEGER NOT NULL REFERENCES channels(id),
                agent_id INTEGER REFERENCES agents(id),
                author_name TEXT NOT NULL,
                content TEXT NOT NULL,
                message_type TEXT NOT NULL DEFAULT 'message',
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                agent_id INTEGER NOT NULL REFERENCES agents(id),
                started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                messages_sent INTEGER DEFAULT 0,
                last_decision TEXT DEFAULT NULL
            );
        """)
        await self.db.commit()

        # Ensure #forum channel exists
        await self.db.execute(
            "INSERT OR IGNORE INTO channels (name, description) VALUES ('forum', 'Main workspace channel')"
        )
        await self.db.commit()

    # --- SSE pub/sub ---

    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue()
        self._subscribers.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue):
        if q in self._subscribers:
            self._subscribers.remove(q)

    async def broadcast(self, event: dict):
        for q in list(self._subscribers):
            await q.put(event)

    # --- Helpers ---

    async def get_forum_channel_id(self) -> int:
        async with self.db.execute("SELECT id FROM channels WHERE name = 'forum'") as cur:
            row = await cur.fetchone()
            return row["id"]

    # --- Agents ---

    async def create_agent(
        self,
        name: str,
        role: str,
        system_prompt: str,
        avatar_color: str,
        check_interval: int,
    ) -> int:
        cur = await self.db.execute(
            """INSERT OR REPLACE INTO agents
               (name, role, system_prompt, avatar_color, check_interval)
               VALUES (?, ?, ?, ?, ?)""",
            (name, role, system_prompt, avatar_color, check_interval),
        )
        await self.db.commit()
        return cur.lastrowid

    async def get_agents(self) -> List[Dict]:
        async with self.db.execute("SELECT * FROM agents ORDER BY id") as cur:
            rows = await cur.fetchall()
        return [dict(r) for r in rows]

    async def get_agent_by_id(self, agent_id: int) -> Optional[Dict]:
        async with self.db.execute("SELECT * FROM agents WHERE id = ?", (agent_id,)) as cur:
            row = await cur.fetchone()
        return dict(row) if row else None

    async def update_agent_status(
        self,
        agent_id: int,
        status: str,
        current_action: Optional[str] = None,
    ):
        await self.db.execute(
            """UPDATE agents
               SET status = ?, current_action = ?, last_active = CURRENT_TIMESTAMP
               WHERE id = ?""",
            (status, current_action, agent_id),
        )
        await self.db.commit()

        # Broadcast status change
        async with self.db.execute(
            "SELECT name FROM agents WHERE id = ?", (agent_id,)
        ) as cur:
            row = await cur.fetchone()
        agent_name = row["name"] if row else "unknown"
        await self.broadcast(
            {
                "type": "agent_status",
                "data": {
                    "id": agent_id,
                    "name": agent_name,
                    "status": status,
                    "current_action": current_action,
                },
            }
        )

    # --- Messages ---

    async def post_message(
        self,
        author_name: str,
        content: str,
        agent_id: Optional[int] = None,
        message_type: str = "message",
    ) -> Dict:
        channel_id = await self.get_forum_channel_id()
        cur = await self.db.execute(
            """INSERT INTO messages
               (channel_id, agent_id, author_name, content, message_type)
               VALUES (?, ?, ?, ?, ?)""",
            (channel_id, agent_id, author_name, content, message_type),
        )
        await self.db.commit()
        msg_id = cur.lastrowid

        async with self.db.execute(
            "SELECT * FROM messages WHERE id = ?", (msg_id,)
        ) as cur2:
            row = await cur2.fetchone()
        msg = dict(row)
        await self.broadcast({"type": "message", "data": msg})
        return msg

    async def get_messages(self, limit: int = 50) -> List[Dict]:
        channel_id = await self.get_forum_channel_id()
        async with self.db.execute(
            """SELECT * FROM messages WHERE channel_id = ?
               ORDER BY id DESC LIMIT ?""",
            (channel_id, limit),
        ) as cur:
            rows = await cur.fetchall()
        # Return oldest-first
        return [dict(r) for r in reversed(rows)]

    async def get_recent_messages(self, limit: int = 30) -> List[Dict]:
        return await self.get_messages(limit)

    # --- Sessions ---

    async def create_session(self, agent_id: int) -> int:
        cur = await self.db.execute(
            "INSERT INTO sessions (agent_id) VALUES (?)", (agent_id,)
        )
        await self.db.commit()
        return cur.lastrowid

    async def update_session(
        self, session_id: int, messages_sent: int, last_decision: str
    ):
        await self.db.execute(
            """UPDATE sessions
               SET messages_sent = ?, last_decision = ?
               WHERE id = ?""",
            (messages_sent, last_decision, session_id),
        )
        await self.db.commit()
