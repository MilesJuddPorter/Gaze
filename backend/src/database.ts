import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

export interface Agent {
  id: number;
  name: string;
  role: string;
  system_prompt: string;
  avatar_color: string;
  status: string;
  current_action: string | null;
  check_interval: number;
  last_read_at: string;
  created_at: string;
}

export interface Message {
  id: number;
  agent_id: number | null;
  author_name: string;
  content: string;
  message_type: string;
  timestamp: string;
}

export interface Reaction {
  id: number;
  message_id: number;
  reactor_name: string;
  emoji: string;
}

let db: Database.Database | null = null;
let gazeDir: string | null = null;

export function initDatabase(dir: string): void {
  gazeDir = dir;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const dbPath = path.join(dir, "gaze.db");
  db = new Database(dbPath);

  // WAL mode for better concurrency
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  createTables();
}

function getDb(): Database.Database {
  if (!db) throw new Error("Database not initialized");
  return db;
}

function createTables(): void {
  const d = getDb();

  d.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL,
      system_prompt TEXT NOT NULL,
      avatar_color TEXT NOT NULL DEFAULT '#6366f1',
      status TEXT DEFAULT 'idle',
      current_action TEXT,
      check_interval INTEGER DEFAULT 300,
      last_read_at DATETIME DEFAULT '1970-01-01',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS forum_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id INTEGER REFERENCES agents(id),
      author_name TEXT NOT NULL,
      content TEXT NOT NULL,
      message_type TEXT DEFAULT 'message',
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL REFERENCES forum_messages(id),
      reactor_name TEXT NOT NULL,
      emoji TEXT NOT NULL,
      UNIQUE(message_id, reactor_name, emoji)
    );

    CREATE TABLE IF NOT EXISTS agent_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id INTEGER NOT NULL REFERENCES agents(id),
      tool_name TEXT NOT NULL,
      tool_input TEXT DEFAULT '{}',
      result_summary TEXT DEFAULT '',
      status TEXT DEFAULT 'ok',
      action_type TEXT DEFAULT 'tool',
      description TEXT DEFAULT '',
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS dm_channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent1_id INTEGER NOT NULL REFERENCES agents(id),
      agent2_id INTEGER NOT NULL REFERENCES agents(id),
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS dm_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id INTEGER NOT NULL REFERENCES dm_channels(id),
      sender_id INTEGER REFERENCES agents(id),  -- NULL = human "You"
      sender_name TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// ---- Agents ----

export function createAgent(agent: {
  name: string;
  role: string;
  system_prompt: string;
  avatar_color: string;
  check_interval: number;
}): Agent {
  const d = getDb();
  const stmt = d.prepare(`
    INSERT INTO agents (name, role, system_prompt, avatar_color, check_interval)
    VALUES (@name, @role, @system_prompt, @avatar_color, @check_interval)
  `);
  const result = stmt.run(agent);
  return getAgent(result.lastInsertRowid as number)!;
}

export function getAgent(id: number): Agent | undefined {
  return getDb().prepare("SELECT * FROM agents WHERE id = ?").get(id) as Agent | undefined;
}

export function getAgentByName(name: string): Agent | undefined {
  return getDb().prepare("SELECT * FROM agents WHERE name = ?").get(name) as Agent | undefined;
}

export function getAllAgents(): Agent[] {
  return getDb().prepare("SELECT * FROM agents ORDER BY id").all() as Agent[];
}

export function updateAgentStatus(
  agentId: number,
  status: string,
  currentAction: string | null = null
): void {
  getDb()
    .prepare("UPDATE agents SET status = ?, current_action = ? WHERE id = ?")
    .run(status, currentAction, agentId);
}

export function updateAgentLastRead(agentId: number): void {
  getDb()
    .prepare("UPDATE agents SET last_read_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(agentId);
}

export function updateAgent(
  agentId: number,
  updates: Partial<Pick<Agent, "name" | "role" | "system_prompt" | "avatar_color" | "check_interval">>
): Agent | undefined {
  const fields = Object.keys(updates)
    .map((k) => `${k} = @${k}`)
    .join(", ");
  getDb()
    .prepare(`UPDATE agents SET ${fields} WHERE id = @id`)
    .run({ ...updates, id: agentId });
  return getAgent(agentId);
}

export function deleteAgent(agentId: number): void {
  getDb().prepare("DELETE FROM agents WHERE id = ?").run(agentId);
}

// ---- Messages ----

export function postMessage(
  senderName: string,
  content: string,
  agentId: number | null = null,
  messageType = "message"
): Message {
  const d = getDb();
  const stmt = d.prepare(`
    INSERT INTO forum_messages (agent_id, author_name, content, message_type)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(agentId, senderName, content, messageType);
  return getMessage(result.lastInsertRowid as number)!;
}

export function getMessage(id: number): Message | undefined {
  return getDb()
    .prepare("SELECT * FROM forum_messages WHERE id = ?")
    .get(id) as Message | undefined;
}

export function getMessages(limit = 50, beforeId?: number): Message[] {
  const d = getDb();
  if (beforeId) {
    return d
      .prepare(
        "SELECT * FROM forum_messages WHERE id < ? ORDER BY id DESC LIMIT ?"
      )
      .all(beforeId, limit) as Message[];
  }
  return d
    .prepare("SELECT * FROM forum_messages ORDER BY id DESC LIMIT ?")
    .all(limit) as Message[];
}

export function getMessagesSince(sinceTimestamp: string, limit = 20): Message[] {
  return getDb()
    .prepare(
      "SELECT * FROM forum_messages WHERE timestamp > ? ORDER BY timestamp ASC LIMIT ?"
    )
    .all(sinceTimestamp, limit) as Message[];
}

export function getLatestMessages(limit = 20): Message[] {
  const rows = getDb()
    .prepare("SELECT * FROM forum_messages ORDER BY id DESC LIMIT ?")
    .all(limit) as Message[];
  return rows.reverse();
}

// ---- Settings ----

export function getSetting(key: string): string | undefined {
  const row = getDb()
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row?.value;
}

export function setSetting(key: string, value: string): void {
  getDb()
    .prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
    .run(key, value);
}

export function getAllSettings(): Record<string, string> {
  const rows = getDb()
    .prepare("SELECT key, value FROM settings")
    .all() as { key: string; value: string }[];
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

// ---- Reactions ----

export function toggleReaction(
  messageId: number,
  reactorName: string,
  emoji: string
): { added: boolean } {
  const d = getDb();
  const existing = d
    .prepare(
      "SELECT id FROM reactions WHERE message_id = ? AND reactor_name = ? AND emoji = ?"
    )
    .get(messageId, reactorName, emoji);

  if (existing) {
    d.prepare(
      "DELETE FROM reactions WHERE message_id = ? AND reactor_name = ? AND emoji = ?"
    ).run(messageId, reactorName, emoji);
    return { added: false };
  } else {
    d.prepare(
      "INSERT INTO reactions (message_id, reactor_name, emoji) VALUES (?, ?, ?)"
    ).run(messageId, reactorName, emoji);
    return { added: true };
  }
}

export function getReactionsForMessage(messageId: number): Reaction[] {
  return getDb()
    .prepare("SELECT * FROM reactions WHERE message_id = ?")
    .all(messageId) as Reaction[];
}

export function getReactionsForMessages(messageIds: number[]): Record<number, Reaction[]> {
  if (messageIds.length === 0) return {};
  const placeholders = messageIds.map(() => "?").join(",");
  const rows = getDb()
    .prepare(`SELECT * FROM reactions WHERE message_id IN (${placeholders})`)
    .all(...messageIds) as Reaction[];

  const result: Record<number, Reaction[]> = {};
  for (const r of rows) {
    if (!result[r.message_id]) result[r.message_id] = [];
    result[r.message_id].push(r);
  }
  return result;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// ---- Agent Activity ----

export interface ActivityEntry {
  id: number;
  agent_id: number;
  tool_name: string;
  tool_input: string;
  result_summary: string;
  status: string;
  action_type: string;
  description: string;
  timestamp: string;
}

export function logActivity(entry: {
  agent_id: number;
  tool_name: string;
  tool_input?: Record<string, unknown>;
  result_summary?: string;
  status?: "ok" | "error";
  action_type?: string;
  description?: string;
}): void {
  const d = getDb();
  d.prepare(`
    INSERT INTO agent_activity (agent_id, tool_name, tool_input, result_summary, status, action_type, description)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    entry.agent_id,
    entry.tool_name,
    JSON.stringify(entry.tool_input ?? {}),
    entry.result_summary ?? "",
    entry.status ?? "ok",
    entry.action_type ?? "tool",
    entry.description ?? ""
  );
  // Prune to last 20 per agent
  d.prepare(`
    DELETE FROM agent_activity WHERE agent_id = ? AND id NOT IN (
      SELECT id FROM agent_activity WHERE agent_id = ? ORDER BY id DESC LIMIT 20
    )
  `).run(entry.agent_id, entry.agent_id);
}

export function getAgentActivity(agentId: number, limit = 20): ActivityEntry[] {
  const d = getDb();
  return d.prepare(`
    SELECT * FROM agent_activity WHERE agent_id = ? ORDER BY id DESC LIMIT ?
  `).all(agentId, limit) as ActivityEntry[];
}

// ---- DM Channels ----

export interface DmChannel {
  id: number;
  agent1_id: number;
  agent2_id: number;
  name: string;
  created_at: string;
}

export interface DmMessage {
  id: number;
  channel_id: number;
  sender_id: number | null;
  sender_name: string;
  content: string;
  timestamp: string;
}

export function getOrCreateDmChannel(agent1Id: number, agent2Id: number): DmChannel {
  const d = getDb();
  // Canonical name: always sort IDs so dm-1-3 and dm-3-1 are the same channel
  const [lo, hi] = [Math.min(agent1Id, agent2Id), Math.max(agent1Id, agent2Id)];
  const name = `dm-${lo}-${hi}`;
  const existing = d.prepare("SELECT * FROM dm_channels WHERE name = ?").get(name) as DmChannel | undefined;
  if (existing) return existing;
  const result = d.prepare(
    "INSERT INTO dm_channels (agent1_id, agent2_id, name) VALUES (?, ?, ?)"
  ).run(lo, hi, name);
  return d.prepare("SELECT * FROM dm_channels WHERE id = ?").get(result.lastInsertRowid) as DmChannel;
}

export function getAllDmChannels(): DmChannel[] {
  return getDb().prepare("SELECT * FROM dm_channels ORDER BY id DESC").all() as DmChannel[];
}

export function getDmChannel(channelId: number): DmChannel | undefined {
  return getDb().prepare("SELECT * FROM dm_channels WHERE id = ?").get(channelId) as DmChannel | undefined;
}

export function postDmMessage(channelId: number, senderId: number | null, senderName: string, content: string): DmMessage {
  const d = getDb();
  const result = d.prepare(
    "INSERT INTO dm_messages (channel_id, sender_id, sender_name, content) VALUES (?, ?, ?, ?)"
  ).run(channelId, senderId, senderName, content);
  return d.prepare("SELECT * FROM dm_messages WHERE id = ?").get(result.lastInsertRowid) as DmMessage;
}

export function getDmMessages(channelId: number, limit = 50): DmMessage[] {
  return getDb().prepare(
    "SELECT * FROM dm_messages WHERE channel_id = ? ORDER BY id DESC LIMIT ?"
  ).all(channelId, limit) as DmMessage[];
}

export function getLatestDmMessages(limit = 30): DmMessage[] {
  return getDb().prepare(
    "SELECT * FROM dm_messages ORDER BY id DESC LIMIT ?"
  ).all(limit) as DmMessage[];
}
