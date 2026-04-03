"""FastAPI application with all API routes and SSE stream."""

import asyncio
import json
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse

from .config import get_db_path, is_initialized, read_config, write_config
from .database import Database
from .agent_loop import AgentLoop

logger = logging.getLogger(__name__)

# Module-level state (set once per process)
_db: Optional[Database] = None
_agent_loops: List[AgentLoop] = []
_cwd: Optional[str] = None


def create_app(working_dir: str) -> FastAPI:
    global _cwd
    _cwd = working_dir

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        global _db
        if is_initialized(_cwd):
            _db = Database(str(get_db_path(_cwd)))
            await _db.connect()
            config = read_config(_cwd)
            agents = config.get("agents", [])
            for agent_def in agents:
                await _db.create_agent(
                    name=agent_def["name"],
                    role=agent_def["role"],
                    system_prompt=agent_def.get("system_prompt", ""),
                    avatar_color=agent_def.get("avatar_color", "#6366f1"),
                    check_interval=agent_def.get("check_interval", 30),
                )
            await _start_agent_loops()

        yield

        for loop in _agent_loops:
            await loop.stop()
        _agent_loops.clear()
        if _db:
            await _db.close()

    app = FastAPI(title="Gaze API", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # --- Config endpoints ---

    @app.get("/api/config")
    async def get_config():
        if not is_initialized(_cwd):
            return {"initialized": False}
        config = read_config(_cwd)
        return {"initialized": True, "config": config}

    @app.post("/api/config/init")
    async def init_config(body: dict):
        global _db
        if not body.get("agents"):
            raise HTTPException(status_code=400, detail="agents list is required")

        write_config(body, _cwd)

        # Initialize (or reconnect) database
        if _db:
            await _db.close()
        _db = Database(str(get_db_path(_cwd)))
        await _db.connect()

        for agent_def in body["agents"]:
            await _db.create_agent(
                name=agent_def["name"],
                role=agent_def["role"],
                system_prompt=agent_def.get("system_prompt", ""),
                avatar_color=agent_def.get("avatar_color", "#6366f1"),
                check_interval=agent_def.get("check_interval", 30),
            )

        workspace_name = body.get("workspace_name", "Workspace")
        agent_count = len(body["agents"])
        await _db.post_message(
            author_name="System",
            content=f"Workspace '{workspace_name}' initialized. {agent_count} agent{'s' if agent_count != 1 else ''} online.",
            message_type="system",
        )

        await _start_agent_loops()
        return {"success": True}

    @app.post("/api/config")
    async def save_config(body: dict):
        write_config(body, _cwd)
        return {"success": True}

    # --- Agent endpoints ---

    @app.get("/api/agents")
    async def get_agents():
        if not _db:
            return []
        return await _db.get_agents()

    @app.post("/api/agents/start")
    async def start_agents():
        await _start_agent_loops()
        return {"success": True}

    @app.post("/api/agents/stop")
    async def stop_agents():
        for loop in _agent_loops:
            await loop.stop()
        _agent_loops.clear()
        return {"success": True}

    # --- Message endpoints ---

    @app.get("/api/messages")
    async def get_messages(limit: int = 50):
        if not _db:
            return []
        return await _db.get_messages(limit)

    @app.post("/api/messages")
    async def post_message(body: dict):
        if not _db:
            raise HTTPException(status_code=503, detail="Workspace not initialized")
        content = (body.get("content") or "").strip()
        if not content:
            raise HTTPException(status_code=400, detail="Message content is empty")
        msg = await _db.post_message(
            author_name="You",
            content=content,
            agent_id=None,
            message_type="message",
        )
        await _handle_mentions(content)
        # Also wake all agents when human posts
        for loop in _agent_loops:
            await loop.wake()
        return msg

    # --- SSE stream ---

    @app.get("/api/stream")
    async def stream():
        if not _db:
            async def _ping():
                while True:
                    yield ": heartbeat\n\n"
                    await asyncio.sleep(2)
            return StreamingResponse(_ping(), media_type="text/event-stream")

        q = _db.subscribe()

        async def _events():
            try:
                yield ": heartbeat\n\n"
                while True:
                    try:
                        event = await asyncio.wait_for(q.get(), timeout=2.0)
                        yield f"data: {json.dumps(event, default=str)}\n\n"
                    except asyncio.TimeoutError:
                        yield ": heartbeat\n\n"
            except (asyncio.CancelledError, GeneratorExit):
                pass
            finally:
                _db.unsubscribe(q)

        return StreamingResponse(
            _events(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
            },
        )

    # --- Serve built frontend (SPA catch-all, must be LAST) ---

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_frontend(full_path: str):
        # Try multiple dist locations
        candidates = [
            Path(__file__).parent.parent / "frontend" / "dist",
        ]
        dist = next((p for p in candidates if p.exists()), None)

        if dist is None:
            return JSONResponse(
                {"error": "Frontend not built. Run: cd frontend && npm install && npm run build"},
                status_code=503,
            )

        # Serve exact file if it exists
        file_path = dist / full_path
        if file_path.is_file():
            return FileResponse(str(file_path))

        # Fall back to index.html for SPA routing
        index = dist / "index.html"
        if index.exists():
            return FileResponse(str(index))

        return JSONResponse({"error": "Not found"}, status_code=404)

    return app


async def _start_agent_loops():
    global _agent_loops
    if not _db:
        return

    # Stop any running loops first
    for loop in _agent_loops:
        await loop.stop()
    _agent_loops.clear()

    agents = await _db.get_agents()
    for agent in agents:
        loop = AgentLoop(agent, _db)
        await loop.start()
        _agent_loops.append(loop)
    logger.info("Started %d agent loop(s)", len(_agent_loops))


async def _handle_mentions(content: str):
    """Wake any agent mentioned with @Name."""
    if not _db:
        return
    agents = await _db.get_agents()
    for agent in agents:
        if f"@{agent['name']}" in content:
            for loop in _agent_loops:
                if loop.agent["id"] == agent["id"]:
                    await loop.wake()
                    logger.debug("Woke agent %s via @mention", agent["name"])
                    break
