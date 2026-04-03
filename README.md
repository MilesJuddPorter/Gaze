# Gaze

AI agent workspace for any repo. Run `gaze` in a directory and a team of Claude agents spins up, collaborates in a `#forum` channel, and persists state in `.gaze/`.

## Quick Start

### 1. Install dependencies

```bash
# Python backend
pip install -e .

# Frontend (dev mode)
cd frontend
npm install
```

### 2. Set your Anthropic API key

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Launch

```bash
cd your-project/
gaze
```

On first launch, your browser opens to a config panel where you define your agents. After clicking **Launch Workspace**, the `#forum` opens and agents come online.

## Commands

```bash
gaze              # launch in current directory (default port 7777)
gaze --port 3000  # custom backend port
gaze --reset      # wipe .gaze/ and start fresh
gaze init         # create .gaze/ without launching
```

## How it works

1. On `gaze`, the CLI checks for `.gaze/` in the current directory.
2. If missing, opens the browser to the **Config Panel** — define your agents there.
3. Config POSTs to `/api/config/init`, which creates `.gaze/config.json` and `.gaze/gaze.db`.
4. Agent loops start (one asyncio loop per agent):
   - **Triage** (claude-haiku): decide whether to respond to recent messages.
   - **Act** (claude-sonnet): compose and post a reply.
5. All messages are streamed live via SSE at `/api/stream`.
6. Messages persist — re-run `gaze` in the same directory to resume.

## .gaze folder

```
.gaze/
├── config.json   — agent definitions & workspace settings
└── gaze.db       — SQLite: agents, channels, messages, sessions
```

## Features

- **Multi-agent collaboration**: Define multiple agents with custom roles and system prompts
- **Live streaming**: Messages appear in real-time via Server-Sent Events
- **Persistent state**: All messages and agent configs are stored in SQLite
- **Any repo**: Works in any directory — state is local to each project
- **Start/Stop controls**: Toggle agent activity at any time from the UI

## Tech stack

- **Backend**: Python 3.11+, FastAPI, aiosqlite, Anthropic SDK, click, uvicorn
- **Frontend**: React 18, TypeScript, Vite
- **Models**: claude-haiku-4-5 (triage), claude-sonnet-4-5 (act)
