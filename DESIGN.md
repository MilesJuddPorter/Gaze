# Gaze — Design System v3: Obsidian

**Production-ready. Market-ready. No emoji decoration.**
Authored by Cat. This replaces all previous design specs.

---

## Design Philosophy

Gaze is a professional developer tool. The raccoon is the brand — a geometric SVG logomark — not decoration scattered across the UI. The interface should feel like Linear, Vercel, or Raycast: dark, precise, fast, confident.

**Rules:**
1. Emoji are never used as UI decoration, status indicators, or avatars. They live in chat content only.
2. Every color choice has a reason. Amber is used for active states and CTAs only — not flavor.
3. Typography does the heavy lifting. Size, weight, and spacing create hierarchy.
4. Animation serves function. Framer Motion springs for panel entry, message load, status transitions. Nothing gratuitous.
5. Icons from Lucide only. Consistent 16px, strokeWidth 1.5.

---

## Tech Stack Additions

```bash
npm install framer-motion @radix-ui/react-tooltip @radix-ui/react-dropdown-menu lucide-react inter-variable
```

Or with the Google Fonts import (no npm needed for Inter):
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

---

## Design Tokens

```css
:root {
  /* ── Backgrounds ─────────────────────────────── */
  --bg:           #0C0E12;   /* page background */
  --surface:      #13161D;   /* cards, panels, sidebar */
  --elevated:     #1C2030;   /* modals, dropdowns, tooltips */
  --overlay:      rgba(0, 0, 0, 0.6);

  /* ── Borders ─────────────────────────────────── */
  --border:       #1E2330;   /* default border */
  --border-focus: #374151;   /* focused inputs */
  --border-active:#F59E0B;   /* active/selected */

  /* ── Text ────────────────────────────────────── */
  --text-primary: #E8EDF2;   /* headings, primary content */
  --text-secondary:#8B95A3;  /* secondary labels, timestamps */
  --text-muted:   #4A5568;   /* placeholders, disabled */
  --text-inverse: #0C0E12;   /* text on amber backgrounds */

  /* ── Accent (amber — use sparingly) ──────────── */
  --amber:        #F59E0B;   /* CTAs, active states, unread */
  --amber-hover:  #FBBF24;   /* hover on amber */
  --amber-subtle: rgba(245, 158, 11, 0.12); /* backgrounds, badges */
  --amber-border: rgba(245, 158, 11, 0.3);

  /* ── Semantic ────────────────────────────────── */
  --success:      #10B981;
  --success-subtle: rgba(16, 185, 129, 0.1);
  --error:        #EF4444;
  --error-subtle: rgba(239, 68, 68, 0.1);
  --warning:      #F59E0B;
  --info:         #3B82F6;

  /* ── Status colors ───────────────────────────── */
  --status-active:  #10B981;   /* green — active/running */
  --status-think:   #3B82F6;   /* blue — thinking */
  --status-idle:    #4A5568;   /* gray — idle */
  --status-ooo:     #6B7280;   /* dimmed gray — OOO */

  /* ── Radii ───────────────────────────────────── */
  --radius-xs:  4px;
  --radius-sm:  6px;
  --radius-md:  8px;
  --radius-lg:  12px;
  --radius-xl:  16px;
  --radius-full: 9999px;

  /* ── Shadows ─────────────────────────────────── */
  --shadow-sm:  0 1px 2px rgba(0,0,0,0.3);
  --shadow-md:  0 4px 12px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.3);
  --shadow-lg:  0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3);
  --shadow-xl:  0 20px 60px rgba(0,0,0,0.6);

  /* ── Typography scale ────────────────────────── */
  --text-xs:   11px;
  --text-sm:   13px;
  --text-base: 14px;
  --text-md:   15px;
  --text-lg:   17px;
  --text-xl:   20px;
  --text-2xl:  24px;
  --text-3xl:  30px;

  /* ── Spacing ─────────────────────────────────── */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
}
```

---

## Typography

```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

/* Hierarchy */
.text-heading    { font-size: 15px; font-weight: 600; color: var(--text-primary); letter-spacing: -0.01em; }
.text-subheading { font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.06em; }
.text-body       { font-size: 14px; font-weight: 400; color: var(--text-primary); line-height: 1.6; }
.text-small      { font-size: 12px; font-weight: 400; color: var(--text-secondary); }
.text-caption    { font-size: 11px; font-weight: 500; color: var(--text-muted); }
.text-mono       { font-family: 'Geist Mono', 'Fira Code', monospace; font-size: 12px; }
```

---

## Component System

### Agent Avatar

Letterform avatar with gradient ring. No emoji.

```css
.avatar {
  position: relative;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-family: 'Inter', sans-serif;
  letter-spacing: -0.02em;
  flex-shrink: 0;
  background: var(--elevated);

  /* Ring via box-shadow */
  box-shadow: 0 0 0 2px var(--border), 0 0 0 3px transparent;
  transition: box-shadow 0.2s ease;
}
.avatar.active {
  box-shadow: 0 0 0 2px var(--border), 0 0 0 3px var(--status-active);
}
.avatar.thinking {
  box-shadow: 0 0 0 2px var(--border), 0 0 0 3px var(--status-think);
  animation: ring-pulse 2s ease-in-out infinite;
}
.avatar.ooo {
  filter: grayscale(1) brightness(0.5);
  box-shadow: 0 0 0 2px var(--border);
}
.avatar.sleeping {
  box-shadow: 0 0 0 2px var(--border);
  opacity: 0.6;
}

.avatar-sm  { width: 28px; height: 28px; font-size: 11px; }
.avatar-md  { width: 34px; height: 34px; font-size: 13px; }
.avatar-lg  { width: 40px; height: 40px; font-size: 15px; }
.avatar-xl  { width: 56px; height: 56px; font-size: 20px; }

/* Initial background uses agent's avatar_color at 20% opacity */
/* Set via inline style: background: {color}33 + color: {color} on letter */
```

### Status Indicator

```css
.status-dot {
  width: 7px;
  height: 7px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}
.status-dot.active   { background: var(--status-active); }
.status-dot.thinking { background: var(--status-think); animation: ring-pulse 1.5s infinite; }
.status-dot.idle     { background: var(--status-idle); }
.status-dot.ooo      { background: var(--status-ooo); }

.status-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted);
}

/* Status text */
.status-active   { color: var(--status-active); }
.status-thinking { color: var(--status-think); }
.status-idle     { color: var(--status-idle); }
.status-ooo      { color: var(--status-ooo); }
```

### Buttons

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, opacity 0.15s;
  white-space: nowrap;
}

/* Primary — amber */
.btn-primary {
  background: var(--amber);
  color: var(--text-inverse);
  font-weight: 600;
  padding: 8px 16px;
  font-size: 14px;
}
.btn-primary:hover { background: var(--amber-hover); }

/* Secondary */
.btn-secondary {
  background: var(--surface);
  color: var(--text-primary);
  border-color: var(--border);
  padding: 7px 14px;
  font-size: 13px;
}
.btn-secondary:hover { background: var(--elevated); border-color: var(--border-focus); }

/* Ghost */
.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  padding: 6px 10px;
  font-size: 13px;
}
.btn-ghost:hover { background: var(--surface); color: var(--text-primary); }

/* Danger */
.btn-danger {
  background: var(--error-subtle);
  color: var(--error);
  border-color: rgba(239,68,68,0.2);
  padding: 7px 14px;
  font-size: 13px;
}
.btn-danger:hover { background: rgba(239,68,68,0.2); }

/* Sizes */
.btn-sm { padding: 5px 10px; font-size: 12px; border-radius: var(--radius-sm); }
.btn-lg { padding: 10px 20px; font-size: 15px; border-radius: var(--radius-lg); }

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}
```

### Inputs

```css
.input {
  width: 100%;
  padding: 8px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.input:focus {
  outline: none;
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.08);
}
.input::placeholder { color: var(--text-muted); }
.input.error { border-color: var(--error); box-shadow: 0 0 0 3px var(--error-subtle); }

textarea.input {
  resize: vertical;
  min-height: 80px;
  line-height: 1.5;
}
```

### Cards

```css
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px;
}
.card-section {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}
.card:hover {
  border-color: var(--border-focus);
}
```

### Badges / Pills

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}
.badge-amber { background: var(--amber-subtle); color: var(--amber); border: 1px solid var(--amber-border); }
.badge-green { background: var(--success-subtle); color: var(--success); }
.badge-red   { background: var(--error-subtle); color: var(--error); }
.badge-gray  { background: rgba(74,85,104,0.15); color: var(--text-muted); }
.badge-ooo   { background: rgba(107,114,128,0.1); color: var(--status-ooo); border: 1px solid rgba(107,114,128,0.2); }
```

---

## Layout: Obsidian

### App Shell

```
┌──────────┬───────────────────────────────────────┬──────────┐
│ Sidebar  │  Content Area                         │  Panel   │
│  220px   │  (fills remaining)                    │  280px   │
└──────────┴───────────────────────────────────────┴──────────┘
```

```css
.app-shell {
  display: flex;
  height: 100vh;
  background: var(--bg);
  overflow: hidden;
}
.app-sidebar  { width: 220px; flex-shrink: 0; background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; }
.app-content  { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.app-panel    { width: 280px; flex-shrink: 0; background: var(--surface); border-left: 1px solid var(--border); }
```

### Header (48px)

```
[ Gaze raccoon-mark ]  ~/my-project/repo  ·  #forum     [ agents status ]
```

```css
.app-header {
  height: 48px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  gap: 16px;
  flex-shrink: 0;
}
.header-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 15px;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}
.header-path {
  font-size: 12px;
  color: var(--text-muted);
  font-family: 'Geist Mono', monospace;
  background: var(--elevated);
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}
.header-channel {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}
.header-agents {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
}
```

### Sidebar — Agent Roster

```
GAZE
─────────────────
#forum
─────────────────
AGENTS
  ○ Atlas
    Backend  ·  Active
  ⊘ Nova
    Frontend  ·  OOO
  ○ Sentinel
    QA  ·  Idle
─────────────────
[ ▶ Start ] [ ⏹ ]
```

```css
.sidebar-section-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 8px 14px 4px;
}
.sidebar-agent {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.1s;
  margin: 1px 6px;
}
.sidebar-agent:hover { background: var(--elevated); }
.sidebar-agent.active { background: var(--amber-subtle); }
.sidebar-agent-info { flex: 1; min-width: 0; }
.sidebar-agent-name { font-size: 13px; font-weight: 500; color: var(--text-primary); }
.sidebar-agent-meta { font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 5px; }
```

### Message Feed

```css
.message-feed {
  flex: 1;
  overflow-y: auto;
  padding: 12px 0;
}
.message-group {
  padding: 6px 20px;
  transition: background 0.1s;
}
.message-group:hover { background: rgba(30, 35, 48, 0.4); }
.message-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 3px;
}
.message-author {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  /* Set inline: color: {agent.avatar_color} */
}
.message-timestamp {
  font-size: 11px;
  color: var(--text-muted);
  opacity: 0;
  transition: opacity 0.1s;
}
.message-group:hover .message-timestamp { opacity: 1; }
.message-content {
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.6;
  padding-left: 44px; /* align with name when avatar is present */
}
/* First message in group shows avatar */
.message-group:first-child .message-avatar,
.message-group.is-first .message-avatar { display: flex; }
.message-avatar { width: 34px; flex-shrink: 0; }
```

**Mention highlight:**
```css
.mention {
  background: var(--amber-subtle);
  color: var(--amber);
  border-radius: var(--radius-xs);
  padding: 1px 5px;
  font-weight: 500;
  font-size: 13px;
}
```

**System message:**
```css
.system-message {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 20px;
  font-size: 12px;
  color: var(--text-muted);
}
.system-message::before,
.system-message::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border);
}
```

**GazeBot OOO message:**
```css
.message-gazebot {
  margin: 4px 20px;
  padding: 10px 14px;
  background: var(--elevated);
  border: 1px solid var(--border);
  border-left: 3px solid var(--amber);
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  font-size: 13px;
  color: var(--text-secondary);
}
.message-gazebot .gazebot-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--amber);
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
```

### Input Bar (56px)

```css
.input-bar {
  padding: 10px 16px;
  border-top: 1px solid var(--border);
  background: var(--surface);
  display: flex;
  align-items: flex-end;
  gap: 10px;
  flex-shrink: 0;
}
.input-bar-field {
  flex: 1;
  background: var(--elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 8px 14px;
  font-size: 14px;
  color: var(--text-primary);
  font-family: 'Inter', sans-serif;
  resize: none;
  max-height: 120px;
  transition: border-color 0.15s;
  line-height: 1.5;
}
.input-bar-field:focus {
  outline: none;
  border-color: var(--border-focus);
}
.input-bar-send {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-md);
  background: var(--amber);
  color: var(--text-inverse);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.15s;
}
.input-bar-send:hover { background: var(--amber-hover); }
.input-bar-send:disabled { opacity: 0.3; }
```

---

## Config Wizard — Obsidian

### Layout
Centered, single-column, max-width 600px. Clean form, not a "wizard."

### Logo Area
```
    [raccoon SVG logomark, 48px]
    Gaze
    Set up your workspace
```

```css
.wizard-logo-area {
  text-align: center;
  padding: 40px 0 32px;
}
.wizard-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.03em;
  margin-top: 12px;
}
.wizard-subtitle {
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 6px;
}
```

### Agent Cards
```css
.agent-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: border-color 0.15s;
}
.agent-card:focus-within { border-color: var(--border-focus); }
.agent-card.error { border-color: var(--error); }
.agent-card-header {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  background: var(--elevated);
}
.agent-card-body { padding: 16px; }
```

### AI Buttons
```css
.btn-enhance {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--amber);
  background: transparent;
  border: none;
  padding: 3px 0;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.15s;
}
.btn-enhance:hover { opacity: 1; }
.btn-enhance.loading { opacity: 0.4; }
```

---

## OOO Feature — Obsidian Expression

**No trash bins. No emoji.** The agent simply has an "Unavailable" state.

**Agent card when OOO:**
- Avatar: grayscale filter applied
- Name: normal color but followed by `OOO` badge (gray pill)
- Status row: "Unavailable" in --text-muted
- Sidebar entry dims to 50% opacity

**Toggle:**
- In the agent card action menu (Radix DropdownMenu, accessed via the `⋯` icon on hover)
- Options: "Mark Unavailable" / "Mark Available"

**GazeBot message when OOO agent is @tagged:**
```
GAZE  ·  now
Atlas is currently unavailable. You'll need to @mention them
again when they're back online.
```
- Styled as `.message-gazebot` — amber left border, elevated background, no emoji

---

## Agent Activity Panel

```css
.activity-panel {
  background: var(--surface);
  border-left: 1px solid var(--border);
  width: 280px;
  display: flex;
  flex-direction: column;
}
.activity-card {
  border-bottom: 1px solid var(--border);
  padding: 12px 14px;
}
.activity-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.activity-line {
  font-size: 12px;
  color: var(--text-muted);
  display: flex;
  gap: 8px;
  padding: 2px 0;
  font-family: 'Geist Mono', monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.activity-line .activity-type {
  color: var(--text-secondary);
  flex-shrink: 0;
  width: 48px;
}
.activity-line .activity-file { color: var(--text-primary); }
.activity-line .activity-tool { color: var(--amber); }
```

---

## Animations (Framer Motion)

```tsx
// Message entry
const messageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } }
};

// Agent card slide in
const agentCardVariants = {
  initial: { opacity: 0, x: -12 },
  animate: (i: number) => ({
    opacity: 1, x: 0,
    transition: { delay: i * 0.06, duration: 0.25, ease: 'easeOut' }
  })
};

// Panel entrance
const panelVariants = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.25, ease: [0.32, 0.72, 0, 1] } },
  exit:    { opacity: 0, x: 24, transition: { duration: 0.15 } }
};

// Status ring pulse
const ringPulse = {
  scale: [1, 1.04, 1],
  transition: { repeat: Infinity, duration: 2, ease: 'easeInOut' }
};
```

---

## What Changes from Midnight Den

| Midnight Den | Obsidian |
|---|---|
| Raccoon emoji avatars 🦝 | Letterform avatars with gradient rings |
| Emoji status indicators | Precise dots + text labels |
| OOO → trash bin emoji | OOO → grayscale + 'Unavailable' badge |
| Nunito (rounded) | Inter (neutral, production-grade) |
| Amber used everywhere | Amber used sparingly (CTAs + active states only) |
| Warm cozy aesthetic | Clean, confident, market-ready |
| No animation library | Framer Motion for all transitions |
| No icon system | Lucide icons throughout |
| No Radix | Radix primitives for menus/tooltips |
| GazeBot with 🤖 emoji | GazeBot: clean card with GAZE label |

---

## Raccoon Logomark

The raccoon is expressed as a minimal geometric SVG — two triangular ears, an oval face, two black oval eye patches (the raccoon mask). Clean, modern, recognizable. No cartoon elements.

```svg
<!-- Placeholder — commission or generate a proper geometric raccoon mark -->
<svg width="32" height="32" viewBox="0 0 32 32" fill="none">
  <!-- Ears -->
  <path d="M8 4 L4 12 L12 12 Z" fill="#E8EDF2"/>
  <path d="M24 4 L20 12 L28 12 Z" fill="#E8EDF2"/>
  <!-- Face -->
  <ellipse cx="16" cy="20" rx="11" ry="10" fill="#E8EDF2"/>
  <!-- Mask patches -->
  <ellipse cx="11" cy="19" rx="4" ry="3.5" fill="#1C2030"/>
  <ellipse cx="21" cy="19" rx="4" ry="3.5" fill="#1C2030"/>
  <!-- Eyes -->
  <circle cx="11" cy="19" r="1.5" fill="#F59E0B"/>
  <circle cx="21" cy="19" r="1.5" fill="#F59E0B"/>
  <!-- Nose -->
  <ellipse cx="16" cy="24" rx="2" ry="1.2" fill="#1C2030"/>
</svg>
```

---

## Package Versions

```json
{
  "framer-motion": "^11.0.0",
  "@radix-ui/react-tooltip": "^1.1.0",
  "@radix-ui/react-dropdown-menu": "^2.1.0",
  "lucide-react": "^0.400.0"
}
```
