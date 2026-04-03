import { FastifyInstance } from "fastify";
import fs from "fs";
import path from "path";
import { createAgent, getAllAgents, setSetting } from "../database.js";
import { startAllAgents } from "../agentLoop.js";
import type { AgentConfig, GazeConfig } from "../config.js";

export async function configRoutes(
  app: FastifyInstance,
  opts: { gazeDir: string }
): Promise<void> {
  const gazeDir = opts.gazeDir;
  const configPath = path.join(gazeDir, "config.json");

  // GET /api/config
  app.get("/api/config", async () => {
    if (!fs.existsSync(configPath)) {
      return { configured: false };
    }
    const raw = fs.readFileSync(configPath, "utf-8");
    return { configured: true, ...(JSON.parse(raw) as GazeConfig) };
  });

  // POST /api/config — first-time setup
  app.post<{ Body: GazeConfig }>("/api/config", async (request, reply) => {
    const { workspace_name, agents } = request.body;

    if (!workspace_name || !agents?.length) {
      return reply.code(400).send({ error: "workspace_name and agents are required" });
    }

    // Write config file
    const config: GazeConfig = {
      workspace_name,
      agents,
      created_at: new Date().toISOString(),
    };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    // Seed agents into DB (if none exist)
    const existing = getAllAgents();
    if (existing.length === 0) {
      for (const agent of agents) {
        createAgent({
          name: agent.name,
          role: agent.role,
          system_prompt: agent.system_prompt,
          avatar_color: agent.avatar_color,
          check_interval: agent.check_interval,
        });
      }
    }

    // Save workspace name setting
    setSetting("workspace_name", workspace_name);

    // Start agents
    startAllAgents();

    return { ok: true, config };
  });
}
