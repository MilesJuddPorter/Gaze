import Anthropic from "@anthropic-ai/sdk";
import {
  getAllAgents,
  getAgent,
  getLatestMessages,
  getMessagesSince,
  updateAgentStatus,
  updateAgentLastRead,
  postMessage,
  logActivity,
  getAgentActivity,
  type Agent,
  type Message,
} from "./database.js";
import { DEFAULT_SETTINGS } from "./config.js";

const client = new Anthropic();

// Global state — mention-only mode: agents sleep until @mentioned
const _running = new Map<number, boolean>();
const _wakeEvents = new Map<number, () => void>();

// SSE broadcast callback — set by the server
let _broadcastFn: ((event: string, data: unknown) => void) | null = null;

export function setBroadcast(fn: (event: string, data: unknown) => void): void {
  _broadcastFn = fn;
}

function broadcast(event: string, data: unknown): void {
  _broadcastFn?.(event, data);
}

// ---- Triage: should this agent respond? ----

async function triageAgent(agent: Agent, recentMessages: Message[]): Promise<boolean> {
  if (recentMessages.length === 0) return false;

  const messagesText = recentMessages
    .map((m) => `[${m.timestamp}] ${m.author_name}: ${m.content}`)
    .join("\n");

  const mentioned = recentMessages.some((m) =>
    m.content.toLowerCase().includes(`@${agent.name.toLowerCase()}`) ||
    m.content.toLowerCase().includes("@everyone")
  );

  // Direct mention always responds
  if (mentioned) return true;

  // Otherwise, ask the triage model
  try {
    const response = await client.messages.create({
      model: DEFAULT_SETTINGS.triage_model,
      max_tokens: 50,
      system: `You are ${agent.name}, ${agent.role}. Decide if you should respond to these recent #forum messages.`,
      messages: [
        {
          role: "user",
          content: `Recent messages in #forum:\n${messagesText}\n\nShould you (${agent.name}, ${agent.role}) respond? Reply YES or NO with one sentence reason.`,
        },
      ],
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("")
      .trim()
      .toUpperCase();

    const decision = text.startsWith("YES");
    logActivity({
      agent_id: agent.id,
      tool_name: "triage",
      tool_input: { model: DEFAULT_SETTINGS.triage_model, message_count: recentMessages.length },
      result_summary: `${decision ? "YES" : "NO"} — ${text.slice(0, 80)}`,
      status: "ok",
      action_type: "thinking",
      description: `triage (${DEFAULT_SETTINGS.triage_model}): ${decision ? "will respond" : "staying silent"}`,
    });
    console.log(`[${agent.name}] triage (${DEFAULT_SETTINGS.triage_model}): ${decision ? "respond" : "skip"}`);
    return decision;
  } catch (err) {
    console.error(`[${agent.name}] Triage error:`, err);
    logActivity({
      agent_id: agent.id,
      tool_name: "triage",
      tool_input: { model: DEFAULT_SETTINGS.triage_model },
      result_summary: String(err).slice(0, 80),
      status: "error",
      action_type: "thinking",
      description: `triage error (${DEFAULT_SETTINGS.triage_model})`,
    });
    return false;
  }
}

// ---- Build context for agent turn ----

function buildContext(agent: Agent, recentMessages: Message[], allAgents: Agent[]): string {
  const otherAgents = allAgents
    .filter((a) => a.id !== agent.id)
    .map((a) => `${a.name} (${a.role})`)
    .join(", ");

  const messagesText =
    recentMessages.length > 0
      ? recentMessages
          .map((m) => `[${m.timestamp}] ${m.author_name}: ${m.content}`)
          .join("\n")
      : "(no recent messages)";

  return `You are ${agent.name}, ${agent.role} at a startup led by Miles (CEO).

You just read #forum. Here are the recent messages:
${messagesText}

OTHER AGENTS: ${otherAgents}

${DEFAULT_SETTINGS.context_preamble}

To post a message, respond with your message text directly.
To stay silent, respond with exactly: SILENT

Keep responses to 2-4 sentences. Be direct. Use @mentions to direct questions.`;
}

// ---- Run a single agent turn ----

async function runAgentTurn(agent: Agent): Promise<void> {
  const allAgents = getAllAgents();
  const readLimit = DEFAULT_SETTINGS.agent_read_limit;

  // Get messages since last read
  const newMessages = getMessagesSince(agent.last_read_at, readLimit);

  // Triage: should we respond?
  const shouldRespond = await triageAgent(agent, newMessages);

  // Mark as read regardless
  updateAgentLastRead(agent.id);

  if (!shouldRespond) {
    return;
  }

  // Get recent context (last N messages for context)
  const contextMessages = getLatestMessages(readLimit);

  // Update status to thinking
  updateAgentStatus(agent.id, "thinking", "Reading #forum...");
  broadcast("agent_status", { agentId: agent.id, status: "thinking", action: "Reading #forum..." });

  // Emit tool_start for the triage read
  const readDesc = `forum messages (last ${contextMessages.length})`;
  broadcast("tool_start", { agent_id: agent.id, tool_name: "read_forum", tool_input: { count: contextMessages.length }, timestamp: new Date().toISOString() });
  broadcast("agent_activity", { agent_id: agent.id, action_type: "reading", description: readDesc, timestamp: new Date().toISOString() });
  logActivity({ agent_id: agent.id, tool_name: "read_forum", tool_input: { count: contextMessages.length }, action_type: "reading", description: readDesc });

  try {
    const contextPrompt = buildContext(agent, contextMessages, allAgents);

    // Update status to acting
    updateAgentStatus(agent.id, "acting", "Composing response...");
    broadcast("agent_status", { agentId: agent.id, status: "acting", action: "Composing response..." });
    broadcast("acting", { agentId: agent.id, agentName: agent.name, typing: true });
    broadcast("tool_start", { agent_id: agent.id, tool_name: "llm_generate", tool_input: { model: DEFAULT_SETTINGS.act_model }, timestamp: new Date().toISOString() });
    broadcast("agent_activity", { agent_id: agent.id, action_type: "thinking", description: `composing reply (${DEFAULT_SETTINGS.act_model})`, timestamp: new Date().toISOString() });

    // Call Claude SDK with streaming
    console.log(`[${agent.name}] act (${DEFAULT_SETTINGS.act_model}): composing reply`);
    const stream = await client.messages.stream({
      model: DEFAULT_SETTINGS.act_model,
      max_tokens: 1024,
      system: agent.system_prompt,
      messages: [{ role: "user", content: contextPrompt }],
    });

    const finalMessage = await stream.finalMessage();

    const text = finalMessage.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("")
      .trim();

    broadcast("acting", { agentId: agent.id, agentName: agent.name, typing: false });

    if (text && text !== "SILENT" && !text.toUpperCase().startsWith("SILENT")) {
      const msg = postMessage(agent.name, text, agent.id);
      broadcast("message", msg);
      broadcast("tool_end", { agent_id: agent.id, tool_name: "post_message", result_summary: text.slice(0, 80), status: "ok", timestamp: new Date().toISOString() });
      broadcast("agent_activity", { agent_id: agent.id, action_type: "editing", description: `posted to #forum`, timestamp: new Date().toISOString() });
      logActivity({ agent_id: agent.id, tool_name: "post_message", result_summary: text.slice(0, 80), status: "ok", action_type: "editing", description: "posted to #forum" });
    } else {
      broadcast("tool_end", { agent_id: agent.id, tool_name: "llm_generate", result_summary: "stayed silent", status: "ok", timestamp: new Date().toISOString() });
      logActivity({ agent_id: agent.id, tool_name: "llm_generate", result_summary: "stayed silent", status: "ok", action_type: "thinking", description: "decided to stay silent" });
    }
  } catch (err) {
    console.error(`[${agent.name}] Turn error:`, err);
    broadcast("acting", { agentId: agent.id, agentName: agent.name, typing: false });
    broadcast("tool_end", { agent_id: agent.id, tool_name: "llm_generate", result_summary: String(err), status: "error", timestamp: new Date().toISOString() });
    logActivity({ agent_id: agent.id, tool_name: "llm_generate", result_summary: String(err).slice(0, 80), status: "error", action_type: "tool", description: "turn error" });
  } finally {
    updateAgentStatus(agent.id, "idle", null);
    broadcast("agent_status", { agentId: agent.id, status: "idle", action: null });
  }
}

// ---- Agent loop (runs continuously) ----

async function agentLoop(agentId: number): Promise<void> {
  const agent = getAgent(agentId);
  if (!agent) return;

  console.log(`[${agent.name}] Starting agent loop`);

  while (_running.get(agentId)) {
    const freshAgent = getAgent(agentId);
    if (!freshAgent) break;

    try {
      await runAgentTurn(freshAgent);
    } catch (err) {
      console.error(`[${freshAgent.name}] Loop error:`, err);
    }

    if (!_running.get(agentId)) break;

    // Mention-only: sleep indefinitely until woken by an @mention
    updateAgentStatus(agentId, "sleeping", null);
    broadcast("agent_status", { agentId, status: "sleeping", action: null });

    await new Promise<void>((resolve) => {
      _wakeEvents.set(agentId, resolve);
    });
    _wakeEvents.delete(agentId);
  }

  updateAgentStatus(agentId, "idle", null);
  broadcast("agent_status", { agentId, status: "idle", action: null });
  console.log(`[${agent.name}] Agent loop stopped`);
}

// ---- Public API ----

export function startAgent(agentId: number): void {
  if (_running.get(agentId)) return;
  _running.set(agentId, true);
  agentLoop(agentId).catch((err) => {
    console.error(`Agent ${agentId} loop crashed:`, err);
    _running.delete(agentId);
  });
}

export function stopAgent(agentId: number): void {
  _running.set(agentId, false);
  // Wake from indefinite sleep so the loop can exit cleanly
  const wakeEvent = _wakeEvents.get(agentId);
  if (wakeEvent) wakeEvent();
}

export function wakeAgent(agentId: number): void {
  const wakeEvent = _wakeEvents.get(agentId);
  if (wakeEvent) wakeEvent();
}

export function wakeAll(): void {
  for (const [agentId, wake] of _wakeEvents) {
    wake();
  }
}

export function startAllAgents(): void {
  const agents = getAllAgents();
  for (const agent of agents) {
    startAgent(agent.id);
  }
}

export function stopAllAgents(): void {
  const agents = getAllAgents();
  for (const agent of agents) {
    stopAgent(agent.id);
  }
}

export function isAgentRunning(agentId: number): boolean {
  return _running.get(agentId) === true;
}

export function getRunningAgentIds(): number[] {
  return Array.from(_running.entries())
    .filter(([, v]) => v)
    .map(([k]) => k);
}
