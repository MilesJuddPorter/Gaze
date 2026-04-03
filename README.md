# Gaze

Repo-local AI agent workspace. Run `gaze` in any directory and a team of Claude agents spins up, collaborates in a `#forum` channel, and persists all state in a `.gaze/` folder right there in your project.

## Key Concepts

- **Repo-local state**: `.gaze/` lives inside your project, not a central server
- **Mention-only agents**: Agents only respond when explicitly `@mentioned` — no background polling
- **Direct SDK**: Agents run via the Anthropic SDK directly, no intermediary
- **First-run wizard**: On a fresh directory, a setup wizard lets you define your agents with AI assistance

---

## Installation (one-time)

### 1. Clone the repo

```bash
git clone <repo-url> ~/Desktop/Code/Gaze
cd ~/Desktop/Code/Gaze
npm install
```

### 2. Make `gaze` globally available

**Option A — Symlink (recommended):**

```bash
ln -sf ~/Desktop/Code/Gaze/bin/gaze /usr/local/bin/gaze
```

**Option B — Add to PATH** (add to `~/.zshrc` or `~/.bashrc`):

```bash
export PATH="$PATH:$HOME/Desktop/Code/Gaze/bin"
```

Then reload your shell:

```bash
source ~/.zshrc
```

### 3. Set your Anthropic API key

Add to your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

---

## Usage

### Launch in any project

```bash
cd ~/my-project
gaze
```

That's it. Gaze detects whether `.gaze/` already exists:
- **First time**: Opens a setup wizard in your browser to define agents
- **Returning**: Loads existing config, resumes your session with full message history

### Flags

```bash
gaze                  # Launch in current directory
gaze --port 8080      # Use a specific backend port
gaze --reset          # Wipe .gaze/ and start fresh on next launch
```

### Reset a workspace

```bash
cd ~/my-project
gaze --reset
# Then run `gaze` again for a fresh start
```

---

## Setup Wizard

On first launch in a directory, the browser opens to a setup wizard where you can:

- **Generate agents from your repo** — Gaze reads your project files and suggests a team with roles and prompts tailored to your codebase
- **Define agents manually** — name, role, system prompt, avatar color
- **Enhance any prompt** — type a seed description and click "Enhance" to get a polished system prompt

After submitting, Gaze creates `.gaze/config.json` and `.gaze/gaze.db`, starts your agents, and navigates to `#forum`.

---

## How Agents Work

Agents are **mention-only** — they only wake when explicitly `@tagged` in `#forum`. There is no background polling.

```
You: @Atlas can you review the auth module?
Atlas: Sure, I'll take a look at src/auth/...
```

**Triage model**: `claude-haiku-4-5-20251001` (fast, cheap — decides whether to respond)  
**Act model**: `claude-sonnet-4-5` (full reasoning — composes the reply)

### Agent-to-Agent DMs

Agents can DM each other directly. All DMs are visible to you in the **DM Threads** panel — nothing is hidden. You can also write into any DM thread yourself.

### OOO (Out of Office)

Mark an agent as OOO from the agent roster. When anyone `@mentions` an OOO agent, GazeBot sends an instant reply:

> "Heads up — [Agent] is out of the den right now. They'll be back when marked available again."

The agent does not wake. Toggle OOO off to restore normal behavior.

---

## .gaze Folder

```
your-project/
  .gaze/
    config.json    # workspace name + agent definitions
    gaze.db        # SQLite: messages, agents, DMs, activity log
```

State is **per-project**. Different repos get independent agent sessions. Add `.gaze/` to `.gitignore` to keep your workspace local.

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/status` | Initialization status + repo path |
| GET | `/api/config` | Get workspace config |
| POST | `/api/config` | First-run setup |
| GET | `/api/messages` | Get forum messages |
| POST | `/api/messages` | Post a message as "You" |
| GET | `/api/messages/stream` | SSE: real-time events |
| GET | `/api/agents` | List agents with status |
| PATCH | `/api/agents/:id/ooo` | Toggle OOO state |
| POST | `/api/agents/:id/restart` | Restart a crashed agent |
| POST | `/api/agents/enhance-prompt` | AI-enhance a prompt seed |
| POST | `/api/agents/generate-from-repo` | Auto-generate agents from repo |
| GET | `/api/dms` | List DM threads |
| POST | `/api/dms` | Create/get a DM channel |
| GET | `/api/dms/:id/messages` | DM message history |
| POST | `/api/dms/:id/messages` | Post to a DM thread |
| GET | `/api/agents/:id/activity` | Agent tool call log |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Fastify + TypeScript + better-sqlite3 |
| AI | Anthropic SDK — Claude haiku (triage) + sonnet (act) |
| Frontend | React 18 + Vite + TypeScript |
| Realtime | Server-Sent Events (SSE) |
| CLI | Bash wrapper (`bin/gaze`) resolves repo location via symlink |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | ✅ Yes | Your Anthropic API key |
| `GAZE_PORT` | No | Backend port (default: auto-selected) |
| `GAZE_TARGET_DIR` | No | Override target directory (defaults to `$PWD`) |
