import { FastifyInstance } from "fastify";
import fs from "fs";
import path from "path";
import {
  getAllAgents,
  getAgent,
  createAgent,
  updateAgent,
  deleteAgent,
} from "../database.js";
import {
  startAgent,
  stopAgent,
  startAllAgents,
  stopAllAgents,
  isAgentRunning,
  getRunningAgentIds,
} from "../agentLoop.js";

export async function agentRoutes(app: FastifyInstance, opts: { gazeDir?: string } = {}): Promise<void> {
  const gazeDir = opts.gazeDir;

  // GET /api/status — routing gate for frontend (config panel vs forum)
  app.get("/api/status", async () => {
    const configPath = gazeDir ? path.join(gazeDir, "config.json") : null;
    const dbPath = gazeDir ? path.join(gazeDir, "gaze.db") : null;
    const configExists = configPath ? fs.existsSync(configPath) : false;
    const dbExists = dbPath ? fs.existsSync(dbPath) : false;
    const partial = configExists !== dbExists;
    const initialized = configExists && dbExists;
    const agents = initialized ? getAllAgents() : [];
    return {
      initialized,
      partial,
      repoPath: gazeDir ? path.dirname(gazeDir) : process.cwd(),
      agentCount: agents.length,
    };
  });

  // POST /api/agents/:id/restart — restart a single crashed agent
  app.post<{ Params: { id: string } }>("/api/agents/:id/restart", async (request, reply) => {
    const id = parseInt(request.params.id);
    const agent = getAgent(id);
    if (!agent) return reply.code(404).send({ error: "Agent not found" });
    stopAgent(id);
    await new Promise((r) => setTimeout(r, 200)); // brief drain
    startAgent(id);
    return { ok: true, agentId: id };
  });


  // GET /api/agents
  app.get("/api/agents", async () => {
    const agents = getAllAgents();
    return agents.map((a) => ({
      ...a,
      running: isAgentRunning(a.id),
    }));
  });

  // GET /api/agents/status/running
  app.get("/api/agents/status/running", async () => {
    return getRunningAgentIds();
  });

  // POST /api/agents/start — start all agents
  app.post("/api/agents/start", async () => {
    startAllAgents();
    return { ok: true };
  });

  // POST /api/agents/stop — stop all agents
  app.post("/api/agents/stop", async () => {
    stopAllAgents();
    return { ok: true };
  });

  // POST /api/agents/:id/start
  app.post<{ Params: { id: string } }>("/api/agents/:id/start", async (request, reply) => {
    const id = parseInt(request.params.id);
    const agent = getAgent(id);
    if (!agent) return reply.code(404).send({ error: "Agent not found" });
    startAgent(id);
    return { ok: true };
  });

  // POST /api/agents/:id/stop
  app.post<{ Params: { id: string } }>("/api/agents/:id/stop", async (request, reply) => {
    const id = parseInt(request.params.id);
    const agent = getAgent(id);
    if (!agent) return reply.code(404).send({ error: "Agent not found" });
    stopAgent(id);
    return { ok: true };
  });

  // PATCH /api/agents/:id
  app.patch<{
    Params: { id: string };
    Body: Partial<{
      name: string;
      role: string;
      system_prompt: string;
      avatar_color: string;
      check_interval: number;
    }>;
  }>("/api/agents/:id", async (request, reply) => {
    const id = parseInt(request.params.id);
    const updated = updateAgent(id, request.body);
    if (!updated) return reply.code(404).send({ error: "Agent not found" });
    return updated;
  });

  // DELETE /api/agents/:id
  app.delete<{ Params: { id: string } }>("/api/agents/:id", async (request, reply) => {
    const id = parseInt(request.params.id);
    stopAgent(id);
    deleteAgent(id);
    return { ok: true };
  });
}
