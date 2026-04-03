# Gaze — Design System v2: Midnight Den 🦝

**Theme:** Warm, alive, slightly chaotic. A raccoon's cozy nest at night.
Authored by Cat. This replaces the Terminal CLI spec entirely.

---

## Design Philosophy

Raccoons are curious, clever, and operate at night. They collect things, adapt to any environment, and have distinctive personalities. The UI should feel like you're peeking into their den — warm but a little messy, full of personality, definitely alive.

**Key signatures:**
- Warm amber glow against deep forest night
- Soft, rounded edges — nothing sharp or harsh
- Agents feel like creatures, not services — they sleep, wake up, go OOO
- Subtle animations that suggest life (breathing, blinking, wiggling)
- Typography that's friendly and readable, not cold monospace

---

## Design Tokens

```css
:root {
  /* Backgrounds */
  --bg:           #0e1015;   /* deep forest night */
  --bg-surface:   #141720;   /* raised surfaces (cards, panels) */
  --bg-elevated:  #1a1f2e;   /* modals, popovers */
  --bg-hover:     #1e2436;   /* hover state */
  --bg-input:     #111520;   /* input backgrounds */

  /* Accent palette */
  --amber:        #e8850a;   /* primary warm glow */
  --amber-soft:   #f0a843;   /* lighter amber for highlights */
  --amber-dim:    #7a4205;   /* dimmed amber for borders/subtle */
  --cream:        #f0e8d8;   /* soft cream for primary text */
  --sage:         #4a7c59;   /* muted sage for secondary/success */
  --sage-dim:     #2a4a35;   /* very dimmed sage */

  /* Semantic */
  --text:         #f0e8d8;   /* cream — all primary text */
  --text-dim:     #9a8e7a;   /* secondary text, timestamps */
  --text-muted:   #5a5248;   /* muted labels, placeholders */
  --error:        #e05252;   /* warm red, not harsh */
  --warning:      #e8a20a;   /* amber-adjacent warning */
  --success:      #4a7c59;   /* sage */

  /* Borders */
  --border:       #252a38;   /* subtle border */
  --border-warm:  #3a2e1a;   /* warm-tinted border */

  /* Glow effects */
  --glow-amber:   0 0 12px rgba(232, 133, 10, 0.3);
  --glow-sm:      0 0 6px rgba(232, 133, 10, 0.2);

  /* Spacing */
  --radius-sm:    6px;
  --radius-md:    10px;
  --radius-lg:    16px;
  --radius-full:  9999px;

  /* Elevation */
  --shadow-sm:    0 1px 3px rgba(0,0,0,0.4);
  --shadow-md:    0 4px 16px rgba(0,0,0,0.5);
  --shadow-lg:    0 8px 32px rgba(0,0,0,0.6);
}
```

---

## Typography

```css
/* Import in index.html head */
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap');

body {
  font-family: 'Nunito', -apple-system, sans-serif;
  font-size: 14px;
  line-height: 1.6;
  color: var(--cream);
  background: var(--bg);
}

/* Type scale */
--text-xs:   11px;
--text-sm:   13px;
--text-base: 14px;
--text-md:   16px;
--text-lg:   18px;
--text-xl:   22px;

/* Headers: sentence case, warm, not all-caps */
h1, h2, h3 { font-weight: 700; color: var(--cream); }
```

---

## Raccoon Avatar System

Each agent gets a unique raccoon avatar — rendered as an SVG emoji-style face, NOT a letter initial.

**Avatar variants (assign by agent index or name hash):**
- `raccoon-curious` — eyes wide open, slight tilt
- `raccoon-focused` — narrowed eyes, determined
- `raccoon-playful` — one eyebrow up, slight smirk
- `raccoon-sleepy` — half-closed eyes, relaxed
- `raccoon-alert` — ears perked forward, eyes bright

**Avatar states:**
- **Active/idle:** normal face, soft amber outline ring
- **Thinking:** face has a subtle wobble animation (2% scale pulse, 1.5s)
- **Acting:** ring glows amber, slight lean-forward tilt
- **Sleeping (no unread mentions):** eyes closed, soft breathing animation (opacity 0.7-1.0 pulse)
- **OOO (in trash):** face peeking up from trash bin, waving paw emoji overlay, dimmed

**Implementation:**
Use emoji + CSS for the avatar initially. Each agent gets one of these based on `(agent.id % 5)`:
```
0: 🦝  (base raccoon)
1: 🦝  with amber ring (active)
```
For v1 of the reskin just use the 🦝 emoji styled with CSS. Custom SVG variants can come in v2.

**Avatar size:** 36px in messages, 32px in roster cards, 48px in agent deep dive.

**Avatar container:**
```css
.avatar {
  border-radius: var(--radius-full);
  border: 2px solid var(--amber-dim);
  background: var(--bg-elevated);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px; /* emoji scale */
  transition: border-color 0.2s, box-shadow 0.2s;
}
.avatar.active {
  border-color: var(--amber);
  box-shadow: var(--glow-sm);
}
.avatar.sleeping {
  opacity: 0.6;
  animation: breathe 3s ease-in-out infinite;
}
.avatar.ooo {
  opacity: 0.5;
  filter: grayscale(0.5);
}
@keyframes breathe {
  0%, 100% { opacity: 0.55; }
  50%       { opacity: 0.75; }
}
```

---

## Agent Status in Roster

Replace status strings with warm, natural language:

| State | Display |
|---|---|
| idle | 🌙 resting |
| thinking | 💭 thinking... |
| acting | ⚡ working |
| sleeping | 💤 sleeping |
| ooo | 🗑️ out of den |
| error | ⚠️ something's off |

Status badge: small pill, --bg-elevated background, text in relevant color.

---

## OOO Feature — Full Spec

### Toggle Location
- In the agent roster card, top-right corner — a small toggle/button
- Label: "Mark OOO" (visible on hover of the card)
- When OOO is active: button becomes "Back in den"

### Visual State (OOO active)

**Roster card:**
```
┌──────────────────────────────────┐
│ 🗑️  Duck                         │ ← trash bin icon replaces normal avatar ring
│     Backend Engineer             │
│     🗑️ out of den                │
│                           [Back] │
└──────────────────────────────────┘
```
- Card dims to 50% opacity
- Trash bin emoji overlaid on avatar (absolute positioned, bottom-right of avatar)
- Agent name gets a subtle strikethrough
- Background tint: very faint warm red (#2a1010)

**Roster entry animation on OOO toggle:**
1. Avatar does a small "dive" animation (translateY +4px then back)
2. Trash bin icon fades in over the avatar
3. Card dims

### OOO Auto-Reply (system message)

When an OOO agent is @mentioned, an instant system bot message fires IN #forum:

```
┌────────────────────────────────────────────────────┐
│  🤖  GazeBot                                now    │
│  Heads up — @Duck is out of the den right now.     │
│  They'll be back when marked available again.       │
│                                              🗑️     │
└────────────────────────────────────────────────────┘
```

- Message author: "GazeBot" with 🤖 as its avatar
- Background: slight warm amber tint (--bg-elevated with 10% amber overlay)
- Border-left: 2px solid --amber-dim
- Fires immediately, before any agent processing
- The OOO agent does NOT wake up or respond

### Backend needs (@Duck):
- `ooo: boolean` field on agents table
- `PATCH /api/agents/:id` should accept `{ ooo: boolean }`
- Messages route: when parsing @mentions, check if agent has `ooo: true` — if so, inject a GazeBot system message, do NOT wake the agent
- GazeBot message: `author_name: "GazeBot"`, `agent_id: null`, `message_type: "system_bot"`, content as above

---

## Layout: Midnight Den

### Global
- Soft shadows everywhere (--shadow-sm on cards, --shadow-md on elevated surfaces)
- Subtle background texture: very faint noise overlay (CSS background-image: url('noise.svg') at 3% opacity)
- Scrollbars: thin, rounded, amber-tinted on hover

### Header (52px)
```
🦝 Gaze    📁 ~/my-repo    #forum    🌙 3 agents resting
```
- Logo: 🦝 emoji + "Gaze" in --amber, font-weight 800
- Separator: thin vertical lines (--border)
- Agent count: warm status text, --text-dim
- Background: --bg-surface, border-bottom 1px --border

### Message Feed
- Background: --bg
- Message bubbles: NO borders, just warm background on hover (--bg-hover, 200ms transition)
- Agent name: --amber-soft, font-weight 700
- Timestamp: --text-muted, font-size --text-xs, inline after name
- Content: --text, line-height 1.6

**Message bubble entry animation:**
```css
@keyframes message-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.message-bubble {
  animation: message-in 0.25s ease forwards;
}
/* Stagger: nth-child delay for initial load */
.message-bubble:nth-child(1) { animation-delay: 0ms; }
.message-bubble:nth-child(2) { animation-delay: 50ms; }
.message-bubble:nth-child(3) { animation-delay: 100ms; }
```

**@mention highlight:**
- `@Name` → color: --amber-soft, font-weight 600, background: rgba(232,133,10,0.12), border-radius 4px, padding 1px 4px

**System messages (non-GazeBot):**
- Centered, --text-muted, small, italic
- Soft amber divider line on each side

**GazeBot messages (OOO replies):**
- Left-bordered card style (2px --amber-dim), background --bg-elevated
- 🤖 avatar, "GazeBot" in --text-dim

### Input Bar (60px)
```
🦝  Post to #forum...                          [ Send ]
```
- Raccoon emoji on the left as "you" indicator
- Rounded input (--radius-lg), --bg-input, border 1px --border
- On focus: border-color --amber, subtle glow (--glow-sm)
- Send button: --amber background, dark text, --radius-md, font-weight 700
- Hover: --amber-soft, slight scale(1.02)

### Agent Roster (right panel, 260px)
- Background: --bg-surface, border-left 1px --border
- Header: "The Den" (not "Agents") — with a small 🌙 icon
- Agent cards: padding 12px 14px, --radius-md, hover background --bg-hover
- Separated by subtle dividers (--border)
- Start/Stop controls: warm pill buttons at bottom

---

## Config Panel (First-run Wizard)

### Layout
- Centered card, max-width 600px, --bg-surface, --shadow-lg, --radius-lg
- Logo area: big 🦝 emoji + "Welcome to the Den" heading

### Form style
- Labels: --text-dim, font-size --text-sm, font-weight 600, margin-bottom 4px
- Inputs: --bg-input, --border, --radius-md, focus: --amber glow
- Textareas: min-height 80px, resize vertical

### Agent cards
- Background: --bg-elevated, --radius-md, border 1px --border
- Header: agent raccoon emoji (🦝) + name + role, collapsible
- Color picker: circular swatch, no border-radius on the picker itself

### AI feature buttons
**Enhance Prompt:**
- Small, subtle, right-aligned to textarea label
- Label: "✦ Enhance" in --amber-dim
- Loading: gentle spin icon + "enhancing..."
- Success: brief amber border flash, content swaps with fade

**Generate from Repo:**
- Prominent secondary button in the empty state
- Icon: 🔍 + "Analyze repo and suggest agents"
- Loading: "Reading your codebase..." with soft pulse

### Launch button
- Full-width, --amber background, dark text (#0e1015), font-weight 800, --radius-md
- Hover: scale(1.01) + --amber-soft background
- Loading: "Setting up the den..."

---

## Animations Summary

```css
/* Message in */
@keyframes message-in { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }

/* Agent wake (when @tagged) */
@keyframes agent-wake { 0% { transform:scale(0.95) } 50% { transform:scale(1.05) } 100% { transform:scale(1) } }

/* OOO dive */
@keyframes ooo-dive { 0% { transform:translateY(0) } 40% { transform:translateY(4px) } 100% { transform:translateY(0) } }

/* Thinking wobble */
@keyframes thinking { 0%,100% { transform:rotate(-1deg) } 50% { transform:rotate(1deg) } }

/* Breathing (sleeping) */
@keyframes breathe { 0%,100% { opacity:0.55 } 50% { opacity:0.75 } }

/* Loading pulse */
@keyframes pulse { 0%,100% { opacity:0.5 } 50% { opacity:1 } }
```

---

## Component Map (unchanged structure, new styles)

All existing components keep their structure. Only CSS changes:

```
src/
├── App.css              ← full token replacement (this spec)
├── index.css            ← reset + font import
└── components/
    ├── ConfigWizard.tsx  ← update inline styles to Midnight Den tokens
    ├── Forum.tsx         ← update header + layout styles
    ├── MessageBubble.tsx ← update bubble + mention styles
    ├── InputBar.tsx      ← update to warm rounded style
    ├── AgentList.tsx     ← update to "The Den" panel, add OOO toggle
    ├── AgentActivityCard ← update colors to warm palette
    └── [all others]      ← update CSS vars to new tokens
```

---

## What Changes vs Terminal CLI

| Was | Now |
|---|---|
| `#0a0a0a` pure black | `#0e1015` forest night |
| `#33ff00` phosphor green | `#e8850a` amber + `#f0e8d8` cream |
| Monospace (JetBrains) | Rounded sans-serif (Nunito) |
| `border-radius: 0` | `border-radius: 6-16px` |
| ASCII spinners, `[OK]`, `[ERR]` | Emoji + natural language |
| Text glow effects | Box shadows + warm glows |
| CRT scanlines | Subtle noise texture |
| Letter initial avatars | 🦝 raccoon emoji avatars |
| Status: `[IDLE]` `[····]` | Status: `🌙 resting` `💭 thinking...` |
