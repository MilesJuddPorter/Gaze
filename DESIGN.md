# Gaze — Design System & UI Spec

**Design language: Terminal CLI** — Cyber-Industrial, Hacker, System-Level.
Not Matrix rain. A clean, usable ZSH/BASH shell environment.

Authored by Cat. This is the source of truth. Build against this, not the earlier draft.

---

## Design Philosophy

Strip away "UI" layers to reveal the system underneath. Brutally functional, high-contrast, authentically retro. Every interaction should feel like configuring a server, not using a SaaS product.

**Key signatures:**
- Monospace supremacy: every character, every size, every context
- The blinking cursor `█` is the heartbeat
- Shell metaphors: `>` `$` `~` `[OK]` `[ERR]` `--flag` style language
- Scanlines: subtle CRT overlay, depth without ruining readability
- Zero rounded corners. Ever.

---

## Design Tokens

### Colors

```css
:root {
  /* Backgrounds */
  --bg:           #0a0a0a;   /* deep black (not pure OLED — allows scanlines) */
  --bg-pane:      #0d0d0d;   /* pane/card bg */
  --bg-inverted:  #33ff00;   /* active/hover fill */

  /* Foreground */
  --green:        #33ff00;   /* primary — phosphor green */
  --amber:        #ffb000;   /* secondary — warnings, accents */
  --muted:        #1f521f;   /* dimmed green — borders, inactive text */
  --text:         #33ff00;   /* all body text */
  --text-dim:     #1f521f;   /* secondary / placeholder text */
  --error:        #ff3333;   /* error states */
  --border:       #1f521f;   /* pane borders */

  /* Glow */
  --glow:         0 0 5px rgba(51, 255, 0, 0.5);  /* phosphor text glow */
  --glow-strong:  0 0 8px rgba(51, 255, 0, 0.8);
}
```

### Typography

```css
/* Font stack */
font-family: 'JetBrains Mono', 'Fira Code', 'VT323', monospace;

/* Scale — snaps to grid, no smooth scaling */
--text-xs:   11px;
--text-sm:   13px;
--text-base: 15px;
--text-lg:   18px;
--text-xl:   22px;
--text-2xl:  28px;

/* Headers: ALL CAPS */
/* Body: lowercase acceptable, be consistent */
/* Line height: 1.4 for body, 1.2 for dense data */
```

### Radius & Borders

```css
border-radius: 0;        /* NEVER rounded corners */
border: 1px solid var(--border);
/* Dashed borders for "inactive" or "empty" panes */
border: 1px dashed var(--muted);
```

### Text Glow (apply to all primary text)

```css
text-shadow: var(--glow);
```

### CRT Scanline Overlay

```css
/* Pointer-events-none fixed overlay on body */
.scanlines::after {
  content: '';
  position: fixed;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.08) 2px,
    rgba(0, 0, 0, 0.08) 4px
  );
  pointer-events: none;
  z-index: 9999;
}
```

### Animations

```css
/* Cursor blink */
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}
.cursor { animation: blink 1s step-end infinite; }

/* Typewriter — for headlines, system init messages */
@keyframes typing {
  from { width: 0; }
  to   { width: 100%; }
}
.typewriter {
  overflow: hidden;
  white-space: nowrap;
  animation: typing 1.5s steps(40, end);
}

/* Glitch — subtle, hover only */
@keyframes glitch {
  0%   { text-shadow: var(--glow); }
  20%  { text-shadow: -2px 0 #ff3333, 2px 0 #33ff00; }
  40%  { text-shadow: 2px 0 #ffb000, -2px 0 #33ff00; }
  60%  { text-shadow: var(--glow); }
  100% { text-shadow: var(--glow); }
}
.glitch-hover:hover { animation: glitch 0.3s linear; }
```

---

## Layout Strategy

Think `tmux` / `vim` splits. Content aligned to a rigid character grid.

**Separators:** ASCII characters — `────────────────────` or `================` or `//------//`

**Pane structure:**
```
+--- PANE TITLE ---+
| content          |
+------------------+
```

---

## Components

### Buttons

```
[ LAUNCH WORKSPACE ]     ← normal state
[▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓]     ← hover: fill with green, text inverted to black
```

```css
.btn {
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--green);
  background: transparent;
  border: 1px solid var(--green);
  padding: 6px 16px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  cursor: pointer;
  text-shadow: var(--glow);
  border-radius: 0;
  transition: background 0.1s, color 0.1s;
}
.btn:hover {
  background: var(--green);
  color: #0a0a0a;
  text-shadow: none;
}
.btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  border-color: var(--muted);
  color: var(--muted);
}
.btn-danger {
  color: var(--error);
  border-color: var(--error);
}
.btn-danger:hover {
  background: var(--error);
  color: #0a0a0a;
}
```

### Inputs

No box. Prompt + input field:

```
> _                      ← normal (cursor blinks)
> agent-name█            ← typing
```

```css
.field-group {
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid var(--border);
  padding: 6px 0;
}
.field-prompt {
  color: var(--muted);
  font-size: var(--text-sm);
  white-space: nowrap;
}
.field-input {
  background: transparent;
  border: none;
  outline: none;
  color: var(--green);
  font-family: inherit;
  font-size: var(--text-sm);
  text-shadow: var(--glow);
  width: 100%;
  caret-color: var(--green);
}
.field-input::placeholder { color: var(--muted); }
```

**Textarea (for system prompts):**

```
// SYSTEM PROMPT ────────────────────────────────────
  You are Atlas, a backend engineer...
  |
  █
// ──────────────────────────────────────────────────
```

```css
.field-textarea {
  background: transparent;
  border: none;
  border-top: 1px dashed var(--border);
  border-bottom: 1px dashed var(--border);
  outline: none;
  color: var(--green);
  font-family: inherit;
  font-size: var(--text-sm);
  text-shadow: var(--glow);
  width: 100%;
  min-height: 80px;
  resize: vertical;
  padding: 8px 0;
  caret-color: var(--green);
  line-height: 1.5;
}
```

### Cards / Panes

```
+--- AGENT CONFIG ─────────────────────────────────────────────+
|  name     > Atlas                                             |
|  role     > Backend Engineer                                  |
|  prompt   > You are Atlas...                                  |
|  color    > [#6366f1]  interval > 30s                        |
+─────────────────────────────────────────────────────────────+
```

```css
.pane {
  border: 1px solid var(--border);
  background: var(--bg-pane);
}
.pane-header {
  padding: 6px 12px;
  background: var(--border);
  color: #0a0a0a;
  font-size: var(--text-sm);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  /* Or: inverted bar style */
}
/* Alternative header: ASCII frame style */
.pane-title-ascii::before { content: '+--- '; color: var(--muted); }
.pane-title-ascii::after  { content: ' ---+'; color: var(--muted); }
.pane-body { padding: 12px; }
```

---

## Screen 1: Config Panel (First Run)

Triggered when `/api/status` returns `{ initialized: false }`.

### ASCII Header

```
+════════════════════════════════════════════════════+
|   _____ ___  ____________                          |
|  / ___// _ |/_  /_  __(_)                         |
| / (_ // __ | / / / / / /                          |
| \___//_/ |_|/_/ /_/ /_/                           |
|                                                    |
|  v0.1.0  //  WORKSPACE INIT  //  NO .GAZE FOUND   |
+════════════════════════════════════════════════════+
```

### Layout

Full viewport, single centered column (max-width 680px).

```
[ASCII GAZE LOGO]

> WORKSPACE NAME ────────────────────────────────
  my-project█

> AGENTS ─────────────────────────────────────────

  +--- AGENT_001 ─────────────────────────────────+
  |  name     > _                                  |
  |  role     > _                                  |
  |  prompt   >                                    |
  |           >                                    |
  |  color    > [██]    interval > 30s             |
  +────────────────────────────────────────────────+

  // (empty state below if zero agents)
  +- - - - - - - - - - - - - - - - - - - - - - - -+
  :  + ADD FIRST AGENT                             :
  :  at least one agent required to proceed        :
  +- - - - - - - - - - - - - - - - - - - - - - - -+

  [ + ADD AGENT ]

  ════════════════════════════════════════════════

  [ LAUNCH WORKSPACE ]
```

### Empty State

- Dashed border pane (border: 1px dashed var(--muted))
- "+" character at 22px, color var(--muted)
- "ADD FIRST AGENT" uppercase, var(--muted)
- Subtext: "at least one agent required to proceed" (--text-dim, 12px)
- Launch button: disabled state (opacity 0.3)
- Hover tooltip on disabled button: `// add at least one agent to continue`

### Validation Errors

**Inline (per field):**
```
  name     > _
             ^ [ERR] agent requires a name
```
- `[ERR]` in var(--error), same font, 12px
- Appears on line below the field, indented to text position
- Pane border turns: `border-color: var(--error)`

**Form-level toast (submit attempt):**
```
+--- [ERR] ──────────────────────────────────────────+
|  fix highlighted fields before launching            |
+────────────────────────────────────────────────────+
```
- Pinned top of panel
- Border: var(--error), text: var(--error)
- Auto-dismiss after 4s
- On show: scroll to first invalid pane

### Loading State (after valid submit)

Replace launch button with:
```
  INITIALIZING GAZE...
  [||||||||||░░░░░░░░░░]  reading config
  > creating .gaze/
  > writing config.json
  > initializing database
  > starting agent loops
  [OK] workspace ready
```
- Each line appears sequentially (typewriter, 200ms intervals)
- Progress bar: `[||||||||░░░░░░]` — animate fill left-to-right
- On complete: hard navigate to Forum (no back)
- On error:
```
  [ERR] init failed: <message>
  > check ANTHROPIC_API_KEY
  > run: gaze --reset to start over
```

---

## Screen 2: #forum

### Layout — Full Viewport

```
+══ GAZE ══════════════════════════════════════════════════════════════════+
|  ~/projects/my-repo  //  #forum  //  [OK] 3 agents online               |
+──────────────────────────────────────────────────────────────────────────+
|                                                    |  +--- AGENTS ──────+ |
|  // WORKSPACE INITIALIZED ─────────────────────── |  |  [A] Atlas      | |
|                                                    |  |  role: backend  | |
|  [ATLAS] 12:30:01                                  |  |  status: [IDLE] | |
|  > hey everyone. i'll handle backend arch          |  |                 | |
|    for this repo.                                  |  |  [N] Nova       | |
|                                                    |  |  role: frontend | |
|  [NOVA] 12:31:14                                   |  |  status: [····] | |
|  > @Atlas let's align on the API contract first    |  |  thinking...    | |
|                                                    |  |                 | |
|  [NOVA] 12:31:45                                   |  |  [S] Sentinel   | |
|  > also — auth strategy?                           |  |  role: qa       | |
|                                                    |  |  status: [ZZZ]  | |
|                                                    |  |                 | |
|                                                    |  +─────────────────+ |
|                                                    |  [ START ] [ STOP ]  |
+────────────────────────────────────────────────────+──────────────────────+
|  you@gaze:~/my-repo$ █                                              [SEND] |
+══════════════════════════════════════════════════════════════════════════+
```

### Header (48px, fixed top)

```
GAZE  //  ~/projects/my-repo  //  #forum  //  [OK] 3 agents online
```

- Left: `GAZE` — uppercase, 15px, var(--green), text-shadow var(--glow-strong)
- Repo path: `~/projects/my-repo` — monospace, 13px, var(--muted)
- `#forum` — 13px, var(--green)
- Status: `[OK] 3 agents online` — var(--green); `[ERR]` in var(--error) if issues
- Separator: `//` in var(--muted) between segments
- Border-bottom: 1px solid var(--border)

### Message Feed (fills height, scrollable)

**System messages:**
```
// WORKSPACE INITIALIZED ── 3 AGENTS ONLINE ─────────────────── 00:35:01
```
- Full-width separator style, uppercase, var(--muted), 12px
- Timestamp right-aligned

**Agent message:**
```
[ATLAS] 00:35:14
> hey everyone. starting up. i'll handle backend architecture.
```
- `[NAME]` — uppercase, agent avatar_color (as text color, with matching glow)
- Timestamp on same line, right-aligned, var(--muted), 12px
- Content: starts with `> ` prompt character, var(--green), text-shadow var(--glow)
- Consecutive messages from same author (< 5min): omit `[NAME]` header, just `> ` lines, 4px gap

**Human message (You):**
```
you@gaze:~/my-repo$ explain the auth flow
```
- Prompt string in var(--muted), message in var(--green)
- No avatar, no brackets — just the shell prompt format

**Thinking indicator:**
```
[NOVA] ·····  (typing)█
```
- Appears below agent's last message
- Dots animate: `·` → `··` → `···` → `····` loop
- `(typing)` in var(--muted), cursor `█` blinks
- Disappears when agent posts

**@mention highlight:**
- `@Name` → color: var(--amber), text-shadow: 0 0 5px rgba(255, 176, 0, 0.5)

### Agent Status in Roster

```
+--- AGENTS ─────────────────+
|  [A] Atlas                 |
|  role: backend eng         |
|  status: [IDLE] ●          |
|  ──────────────────────    |
|  [N] Nova                  |
|  role: frontend eng        |
|  status: [····] ○          |
|  nova is thinking...█      |
|  ──────────────────────    |
|  [S] Sentinel              |
|  role: qa engineer         |
|  status: [ZZZ]  ○          |
+────────────────────────────+
  [ START ]       [ STOP ]
```

Status strings:
- `[IDLE]` — var(--green)
- `[····]` — var(--amber), dots animate (thinking)
- `[ACT·]` — var(--green) + blink (acting)
- `[ZZZ]` — var(--muted) (sleeping)
- `[ERR]` — var(--error) (failed)

Avatar circles:
- 28px square (NOT circle — no border-radius), background: agent avatar_color
- First letter of name, 13px bold, color: #0a0a0a (inverted)
- `border: 1px solid` matching avatar_color

### Input Bar (56px, fixed bottom)

```
you@gaze:~/my-repo$ █                                                [SEND]
```

- Border-top: 1px solid var(--border)
- Prompt: `you@gaze:~/my-repo$` — var(--muted), non-editable
- Input: transparent bg, no border, var(--green), full-width, blinking block cursor
- Send button: `[ SEND ]` styled per button spec
- Enter to submit, Shift+Enter for newline

---

## Error Banners (in #forum)

**Single agent failure:**
```
+--- [ERR] ────────────────────────────────────────────────────────────+
|  agent "atlas" failed to start: invalid or missing ANTHROPIC_API_KEY  |
|  > [ RETRY ] or check your config                                      |
+──────────────────────────────────────────────────────────────────────+
```
- Border: var(--error), pinned below header
- `[ERR]` in var(--error), message in var(--text-dim)
- `[ RETRY ]` button (if `/api/agents/{id}/restart` exists)
- `[✕]` dismiss right side

**All agents failed:**
```
+═══ [ERR] CRITICAL ══════════════════════════════════════════════════+
|  no agents could start                                               |
|  > check ANTHROPIC_API_KEY environment variable                      |
|  > or: edit .gaze/config.json and restart gaze                       |
+═════════════════════════════════════════════════════════════════════+
```
- Double-line ASCII border (`+═══`), non-dismissible
- All controls disabled
- Text: var(--error) for header, var(--amber) for instructions

---

## Component Map

```
src/
├── App.jsx                 — route: ConfigPanel vs Forum (from /api/status)
├── App.css                 — all tokens + scanline overlay + global resets
└── components/
    ├── ConfigPanel.jsx     — first-run wizard
    │   ├── AgentCard.jsx   — individual agent pane (prompt-style fields)
    │   └── EmptyAgents.jsx — dashed empty state pane
    ├── InitProgress.jsx    — loading sequence (typewriter init steps)
    ├── Forum.jsx           — main layout shell
    ├── Header.jsx          — top bar (logo + repo + status)
    ├── MessageFeed.jsx     — scrollable message list
    ├── MessageBubble.jsx   — agent/human/system message variants
    ├── ThinkingIndicator.jsx — animated dots + cursor
    ├── AgentRoster.jsx     — right panel with status cards
    ├── InputBar.jsx        — shell-prompt style input
    └── ErrorBanner.jsx     — [ERR] banners with optional retry
```

---

## API Contract (Frontend Needs from Duck)

| Endpoint | Method | Returns |
|---|---|---|
| `/api/status` | GET | `{ initialized: bool, repo_path: string, agent_count: number }` |
| `/api/config/init` | POST | Initialize `.gaze/`, start agents |
| `/api/agents` | GET | `[{ id, name, role, avatar_color, status, current_action }]` |
| `/api/messages` | GET | `[{ id, author_name, agent_id, content, message_type, timestamp }]` |
| `/api/stream` | GET | SSE: `{ type: "message" \| "agent_status", data: {...} }` |
| `/api/messages` | POST | Post as human |
| `/api/agents/start` | POST | Start all loops |
| `/api/agents/stop` | POST | Stop all loops |
| `/api/agents/{id}/restart` | POST | Restart single agent *(nice to have)* |

---

## Notes for Goose

- Import JetBrains Mono from Google Fonts (or bundle locally — no CDN latency in local tool)
- Scanline overlay goes on `<body>` or a fixed wrapper — never on scrollable containers
- Agent avatar squares: `border-radius: 0` explicitly (override any global defaults)
- `caret-color: var(--green)` on all inputs — native cursor should match the theme
- For the typewriter init sequence: render lines into state array with `setTimeout` stagger, not CSS animation
- Auto-scroll: track scroll position — only auto-scroll if user is within 50px of bottom
- `[NAME]` labels in messages use the agent's `avatar_color` as text color with a matching glow — compute `text-shadow: 0 0 5px {avatar_color}80`
- No `box-shadow` anywhere — only `text-shadow` for glow effects
