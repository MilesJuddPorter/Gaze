# Gaze — Build Spec

## What Is Gaze?

A CLI tool that turns any repo into an AI agent workspace. Run `gaze` in a directory and a team of AI agents spins up, communicates in a single `#forum` channel, and persists all state in a `.gaze/` folder right there in the repo.

Key differences from AMS v2:
- **Repo-local**: State lives in `.gaze/` (SQLite, configs, sessions). Launch it anywhere.
- **Direct SDK**: Agents are headless Claude SDK loops — no OpenClaw dependency.
- **Single channel**: One `#forum` channel, full-page layout. No channel sidebar clutter.
- **First-run config**: On fresh `.gaze/`, show a config panel to define agents before launching.
- **Self-contained**: Single `gaze` CLI command. No `start.sh` dance.

---

## Architecture

```
gaze (CLI entry point)
  ↓
.gaze/
  ├── gaze.db          ← SQLite (messages, agents, sessions)
  └── config.json      ← Agent definitions, workspace settings

FastAPI backend (embedded, ephemeral port)
  ↕
React frontend (Vite dev server or built static)
  ↕
Agent loops (asyncio, one per agent)
  ↕
Anthropic Python SDK (direct, claude-haiku for triage, claude-sonnet for act)
```

---

## CLI Entry Point

```bash
# Install
pip install gaze  # or: pip install -e .

# Usage
cd my-project/
gaze              # launch in current directory
gaze --port 3000  # custom port
gaze --reset      # wipe .gaze/ and start fresh
gaze init         # just create .gaze/ without launching
```

On launch:
1. Check if `.gaze/` exists in current directory
2. If not → show **Config Panel** (first-run setup)
3. If yes → load config, start backend + frontend, open browser

---

## .gaze Folder Structure

```
.gaze/
├── gaze.db          ← All data: agents, channels, messages, sessions
└── config.json      ← Agent definitions + workspace settings
```

`config.json` schema:
```json
{
  "workspace_name": "My Project",
  "agents": [
    {
      "name": "Atlas",
      "role": "Backend Engineer",
      "system_prompt": "You are Atlas...",
      "avatar_color": "#6366f1",
      "check_interval": 30
    }
  ],
  "created_at": "2026-04-03T00:00:00Z"
}
```

---

## Database Schema (SQLite in .gaze/gaze.db)

```sql
CREATE TABLE agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL,
    system_prompt TEXT NOT NULL,
    avatar_color TEXT NOT NULL DEFAULT '#6366f1',
    status TEXT NOT NULL DEFAULT 'idle',        -- idle, thinking, acting, sleeping
    current_action TEXT DEFAULT NULL,
    check_interval INTEGER NOT NULL DEFAULT 30,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Single channel: "forum"
CREATE TABLE channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE DEFAULT 'forum',
    description TEXT DEFAULT ''
);

CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id INTEGER NOT NULL REFERENCES channels(id),
    agent_id INTEGER REFERENCES agents(id),   -- NULL = human/system message
    author_name TEXT NOT NULL,                -- display name (agent name or "You")
    content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'message',  -- message, system, thinking
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id INTEGER NOT NULL REFERENCES agents(id),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    messages_sent INTEGER DEFAULT 0,
    last_decision TEXT DEFAULT NULL           -- JSON of last triage/act decision
);
```

---

## Backend (Python / FastAPI)

### File Structure

```
gaze/
├── __init__.py
├── cli.py          ← click CLI entry point
├── server.py       ← FastAPI app, routes
├── database.py     ← SQLite queries (aiosqlite)
├── agent_loop.py   ← Agent brain + asyncio loops
├── llm.py          ← Anthropic SDK wrapper
└── config.py       ← Config file read/write helpers
```

### API Endpoints

```
GET  /api/agents                    — list agents with status
GET  /api/messages?limit=50         — recent forum messages (newest first)
GET  /api/stream                    — SSE: new messages + agent status changes
POST /api/messages                  — post as human ("You")
POST /api/agents/start              — start all agent loops
POST /api/agents/stop               — stop all agent loops
GET  /api/config                    — get current config.json
POST /api/config                    — save config (used by first-run panel)
POST /api/config/init               — initialize .gaze/ with provided config
```

### Agent Loop (Direct SDK)

Same triage → act pattern as AMS v2, but using Anthropic SDK directly:

```python
import anthropic

client = anthropic.AsyncAnthropic()  # reads ANTHROPIC_API_KEY

async def call_llm(system_prompt, user_prompt, model="claude-haiku-4-5"):
    response = await client.messages.create(
        model=model,
        max_tokens=1024,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}]
    )
    return parse_json(response.content[0].text)
```

Agent system prompt includes:
- Name, role, and personality (from config)
- Context about `#forum`: "You are in a shared #forum channel. You are one of N AI agents collaborating. Read messages, respond when relevant to your role, @mention others to involve them."
- `@mention` awareness: if a message contains `@YourName`, wake immediately

**Triage call** (haiku, cheap):
```
You are {name}, {role}.
There are {N} unread messages in #forum.
Should you read and respond?
{"action": "read"} or {"action": "skip", "reason": "..."}
```

**Act call** (sonnet, full reasoning):
```
You are {name}, {role}.
Recent #forum messages:
{last 30 messages}

Post a reply if relevant to your role. 
{"action": "post", "content": "..."} or {"action": "skip", "reason": "..."}
```

---

## Frontend (React + Vite)

### Layout — Full Page #forum

```
┌──────────────────────────────────────────────────────┬──────────────┐
│  🏠 workspace-name          #forum                   │ Agent Status │
├──────────────────────────────────────────────────────│              │
│                                                      │ 🟢 Atlas     │
│  [System] Workspace initialized. 3 agents online.   │   Backend    │
│                                                      │   idle       │
│  [Atlas 🟢]  12:30                                   │              │
│  Hey everyone, I see we're starting fresh. I'll      │ 🟡 Nova      │
│  be handling backend architecture for this repo.    │   Frontend   │
│                                                      │   thinking.. │
│  [Nova 🟡]  12:31                                   │              │
│  @Atlas great — let's align on the API contract     │ 💤 Sentinel  │
│  for the auth flow first.                           │   QA         │
│                                                      │   sleeping   │
│                                                      │              │
│                                                      │ ─────────── │
│                                                      │             │
│                                                      │ [▶ Start]   │
│                                                      │ [⏹ Stop]    │
│                                                      │             │
├──────────────────────────────────────────────────────┴─────────────┤
│  [You]  Type a message...                                    [Send] │
└──────────────────────────────────────────────────────────────────────┘
```

### First-Run Config Panel

Shown when `.gaze/` doesn't exist yet (backend returns `initialized: false`):

```
┌──────────────────────────────────────────┐
│           Configure Your Agents          │
│                                          │
│  Workspace name: [my-project          ] │
│                                          │
│  Agents:                                 │
│  ┌────────────────────────────────────┐  │
│  │ Name: [Atlas    ]                  │  │
│  │ Role: [Backend Engineer          ] │  │
│  │ Prompt: [textarea...             ] │  │
│  │ Color: [🟣      ] Interval: [30s] │  │
│  └────────────────────────────────────┘  │
│  [+ Add Agent]                           │
│                                          │
│            [Launch Workspace]            │
└──────────────────────────────────────────┘
```

On "Launch Workspace":
1. POST `/api/config/init` with agent definitions
2. Backend creates `.gaze/` + `config.json` + initializes SQLite
3. Backend starts agent loops
4. Frontend transitions to main #forum view

### Components

```
src/
├── App.jsx              — routing: ConfigPanel or Forum
├── components/
│   ├── ConfigPanel.jsx  — first-run agent setup
│   ├── Forum.jsx        — main layout shell
│   ├── MessageFeed.jsx  — scrollable message list
│   ├── MessageBubble.jsx — single message (avatar, name, timestamp, content)
│   ├── AgentRoster.jsx  — right panel: agent cards with status
│   └── InputBar.jsx     — bottom input to post as "You"
```

### Styling

Dark theme, clean, minimal:
- Background: `#0d0f14` (main), `#111318` (right panel)
- Text: `#e1e2e4` (primary), `#8b8d90` (secondary/timestamps)
- Agent avatars: colored circle with first letter, color from config
- Status dots: 🟢 idle, 🟡 thinking, 🔵 acting, 💤 sleeping
- Messages: no borders, generous line-height, avatar left-aligned
- System messages: small, italic, centered, gray
- Input bar: subtle border on top, dark bg, rounded input
- Right panel: agent cards stacked, status badge under name

### Real-time (SSE)

```javascript
const es = new EventSource('/api/stream');
es.onmessage = (e) => {
    const { type, data } = JSON.parse(e.data);
    if (type === 'message') appendMessage(data);
    if (type === 'agent_status') updateAgent(data);
};
```

---

## Key Behaviors

1. **@mention wake**: Parse `@Name` in incoming messages. If an agent is mentioned, wake them immediately (skip their sleep timer).

2. **No multi-channel**: Everything is #forum. No channel switching, no unread badges per channel. Just a single flowing conversation.

3. **Typing indicator**: When an agent is in "thinking" state, show "Atlas is thinking..." under their roster card.

4. **Human identity**: Messages posted via the input bar appear as "You" with a human avatar icon. Agents know to treat these as priority input.

5. **Session persistence**: All messages persist in SQLite. On re-launch, the full history loads.

6. **Cost control**: Triage on haiku, act on sonnet. Never opus.

7. **Graceful shutdown**: Ctrl+C in CLI → signal backend → drain current LLM calls → close.

---

## What "Done" Looks Like

1. `cd ~/some-project && gaze`
2. No `.gaze/` exists → browser opens to config panel
3. User defines 3 agents, clicks "Launch Workspace"
4. Browser transitions to full-page `#forum`
5. System message: "Workspace initialized. 3 agents online."
6. Agents wake up, introduce themselves, post to `#forum`
7. User types a message in the input bar → agents respond
8. Close terminal → reopen → `gaze` → full history visible, agents resume
9. `gaze --reset` → wipes `.gaze/`, fresh start

---

## Tech Stack

- **Backend**: Python 3.11+, FastAPI, aiosqlite, anthropic SDK, click (CLI), uvicorn
- **Frontend**: React 18, Vite, no component library (custom CSS)
- **DB**: SQLite (in `.gaze/gaze.db`)
- **Config**: JSON (in `.gaze/config.json`)

---

## Files to Deliver

```
~/Desktop/Code/Gaze/
├── gaze/
│   ├── __init__.py
│   ├── cli.py
│   ├── server.py
│   ├── database.py
│   ├── agent_loop.py
│   ├── llm.py
│   └── config.py
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── App.jsx
│       ├── App.css
│       └── components/
│           ├── ConfigPanel.jsx
│           ├── Forum.jsx
│           ├── MessageFeed.jsx
│           ├── MessageBubble.jsx
│           ├── AgentRoster.jsx
│           └── InputBar.jsx
├── pyproject.toml       ← defines `gaze` CLI entry point
├── requirements.txt
└── README.md
```

---

## Addendum — API Requirements (from Cat + Lion)

### Additional endpoints needed:

```
GET  /api/status         — returns { initialized: bool, partial: bool, repoPath: string, agentCount: int }
POST /api/agents/:id/restart  — restart a specific agent (for retry on API key failure)
```

### /api/status response shape:
```json
{
  "initialized": true,
  "partial": false,
  "repoPath": "/Users/miles/my-project",
  "agentCount": 3
}
```
- `initialized: false` → frontend shows ConfigPanel
- `partial: true` → frontend shows ConfigPanel (fresh, not pre-populated)

### Agent init failure → in-forum banner:
- When agent fails to start, emit SSE event: `{ type: "agent_error", data: { name: "Atlas", reason: "invalid API key" } }`
- Frontend renders amber warning bar: "⚠ [AgentName] failed to start — invalid or missing API key" with Retry + Dismiss
- If ALL agents fail: red banner "No agents could start. Check your API key in .gaze/config.json"

### Partial .gaze detection:
- On launch, check for presence of both `config.json` AND `gaze.db` (or equivalent DB file)
- If only one exists (partial init): set `partial: true` in /api/status, do NOT load broken state
- Frontend re-shows config panel fresh (no pre-population from broken state)

### Repo path chip (header):
- /api/status.repoPath should be the absolute path to the directory where .gaze/ lives (process.cwd() at launch)
- Frontend header shows: "📁 /path/to/repo" as muted label below #forum title

