import { FastifyInstance } from "fastify";
import fs from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import { createAgent, getAllAgents, setSetting } from "../database.js";
import { startAllAgents } from "../agentLoop.js";
import type { AgentConfig, GazeConfig } from "../config.js";

const anthropic = new Anthropic();

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

  // POST /api/agents/generate-from-repo — AI-powered agent suggestion from repo structure
  app.post("/api/agents/generate-from-repo", async (request, reply) => {
    const repoDir = path.dirname(gazeDir);

    // Collect repo context: file tree + key files
    const ignoreDirs = new Set([".gaze", "node_modules", ".git", "dist", "build", "__pycache__"]);
    const lines: string[] = [];

    function walk(dir: string, depth = 0) {
      if (depth > 3) return;
      let entries: string[];
      try { entries = fs.readdirSync(dir); } catch { return; }
      for (const entry of entries) {
        if (ignoreDirs.has(entry) || entry.startsWith(".")) continue;
        const full = path.join(dir, entry);
        const stat = fs.statSync(full);
        lines.push("  ".repeat(depth) + (stat.isDirectory() ? `${entry}/` : entry));
        if (stat.isDirectory()) walk(full, depth + 1);
      }
    }
    walk(repoDir);

    // Read key files for context (README, package.json, etc.)
    const keyFiles = ["README.md", "package.json", "pyproject.toml", "Cargo.toml", "go.mod"];
    const snippets: string[] = [];
    for (const kf of keyFiles) {
      const fp = path.join(repoDir, kf);
      if (fs.existsSync(fp)) {
        const content = fs.readFileSync(fp, "utf-8").slice(0, 1500);
        snippets.push(`--- ${kf} ---\n${content}`);
      }
    }

    const repoContext = [
      `File tree of ${repoDir}:`,
      lines.join("\n"),
      snippets.join("\n\n"),
    ].join("\n\n");

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system: `You are an expert engineering team architect. Given a repository structure, suggest a team of 3-5 AI agents that would be most useful for working on this codebase. Each agent should have a specific role, expertise, and personality.

Return ONLY valid JSON in this exact format:
{
  "workspace_name": "short project name",
  "agents": [
    {
      "name": "SingleWord",
      "role": "Role Title",
      "system_prompt": "You are [Name], [role] at a startup. [2-3 sentences of personality, expertise, and communication style. Include what they own and how they work.]",
      "avatar_color": "#hexcolor",
      "check_interval": 30
    }
  ]
}`,
      messages: [{
        role: "user",
        content: `Analyze this repository and suggest the ideal AI agent team:\n\n${repoContext}`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return reply.code(500).send({ error: "Failed to parse agent suggestions" });
      const suggestions = JSON.parse(jsonMatch[0]);
      return suggestions;
    } catch {
      return reply.code(500).send({ error: "Failed to parse agent suggestions", raw: text.slice(0, 200) });
    }
  });

  // POST /api/agents/enhance-prompt — AI-powered prompt enhancement from seed text
  app.post<{ Body: { seed: string; name?: string; role?: string } }>(
    "/api/agents/enhance-prompt",
    async (request, reply) => {
      const { seed, name = "Agent", role = "AI assistant" } = request.body;
      if (!seed?.trim()) return reply.code(400).send({ error: "seed is required" });

      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        system: `You are an expert at writing AI agent system prompts. Take a brief seed description and expand it into a rich, specific system prompt for an AI agent. 

The prompt should:
- Establish the agent's identity, role, and personality clearly
- Define what they own and are responsible for
- Describe their communication style (concise, 2-4 sentences per message)
- Include how they collaborate with teammates
- End with a personality note that makes them distinct

Return ONLY the expanded system prompt text — no JSON, no preamble, no quotes.`,
        messages: [{
          role: "user",
          content: `Agent name: ${name}\nRole: ${role}\nSeed description: ${seed}`,
        }],
      });

      const enhanced = response.content[0].type === "text" ? response.content[0].text.trim() : seed;
      return { enhanced };
    }
  );
}
