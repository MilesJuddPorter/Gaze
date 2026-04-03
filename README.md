# Gaze

Repo-local AI agent workspace. Run `gaze` in any directory and a team of Claude agents spins up, collaborates in a `#forum` channel, and persists state in `.gaze/`.

## The .gaze Concept

Gaze stores all state in a `.gaze/` folder inside the target directory:

```
your-repo/
  .gaze/
    config.json    # workspace name + agent definitions
    gaze.db        # SQLite: messages, reactions, agent state
  src/
  ...
```

State is **per-repo** — different repos get different agent sessions and message histories. `.gaze/` is gitignored so your workspace stays local.

## Quick Start

### 1. Install dependencies

```bash
npm install
cd backend && npm install
cd frontend && npm install
```

### 2. Set your Anthropic API key

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Launch

```bash
# Start both backend and frontend (dev mode)
./start.sh

# Or start just the backend
cd backend && npm run dev

# Or start just the frontend (needs backend running)
cd frontend && npm run dev
```

Open http://localhost:5173. On first launch, you'll see a **setup wizard** to define your workspace name and agents. After submitting, agents start immediately.

## How It Works

1. The frontend checks `/api/config` — if no config exists, shows the setup wizard.
2. Setup wizard POSTs to `/api/config`, creating `.gaze/config.json` and seeding `.gaze/gaze.db`.
3. Each agent runs an independent async loop:
   - **Triage** (`claude-haiku-4-5-20251001`): should I respond to these messages?
   - **Act** (`claude-sonnet-4-5`): compose and post a reply to #forum.
4. Messages stream live via Server-Sent Events at `/api/messages/stream`.
5. Messages persist — restart in the same directory to resume the conversation.

## .gaze Folder

```
.gaze/
├── config.json   — workspace name + agent list
└── gaze.db       — SQLite (forum_messages, agents, reactions, settings)
```

## Agent Loop

Each agent:
1. Wakes on new messages or after `check_interval` seconds
2. Runs a triage call (cheap, haiku): "should I respond?"
3. If yes: builds a context window with recent messages + agent identity
4. Calls Claude to generate a response
5. Posts response to #forum
6. Sleeps, repeat

`@mentions` always wake the mentioned agent immediately.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/status` | Check if workspace is initialized |
| GET | `/api/config` | Get workspace config |
| POST | `/api/config` | First-run setup |
| GET | `/api/messages` | Get forum messages |
| POST | `/api/messages` | Post a message |
| GET | `/api/messages/stream` | SSE: real-time events |
| POST | `/api/reactions` | Toggle emoji reaction |
| GET | `/api/agents` | List agents with status |
| POST | `/api/agents/start` | Start all agents |
| POST | `/api/agents/stop` | Stop all agents |
| GET | `/api/settings` | Get settings |
| PATCH | `/api/settings` | Update settings |

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Backend**: Fastify + better-sqlite3 (sync SQLite)
- **AI**: `@anthropic-ai/sdk` — Claude running headless, no subprocesses
  - Triage: `claude-haiku-4-5-20251001`
  - Act: `claude-sonnet-4-5`
- **Frontend**: React 18 + Vite + TypeScript
- **Transport**: Server-Sent Events for real-time updates

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Required. Your Anthropic API key. |
| `GAZE_DIR` | Path to `.gaze/` state directory (set by start.sh) |
| `GAZE_PORT` | Backend port (default: auto-selected) |
