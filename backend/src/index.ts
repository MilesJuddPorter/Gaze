import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import staticPlugin from "@fastify/static";
import path from "path";
import fs from "fs";
import { createRequire } from "module";

const _require = createRequire(import.meta.url);
const __dirname = path.dirname(new URL(import.meta.url).pathname);
import {
  initDatabase,
  getAllAgents,
  createAgent,
  setSetting,
  getAllSettings,
} from "./database.js";
import { startAllAgents, setBroadcast, stopAllAgents } from "./agentLoop.js";
import { messageRoutes } from "./routes/messages.js";
import { agentRoutes } from "./routes/agents.js";
import { settingsRoutes } from "./routes/settings.js";
import { configRoutes } from "./routes/config.js";
import { DEFAULT_AGENTS, DEFAULT_SETTINGS } from "./config.js";

// Augment Fastify with SSE clients map
declare module "fastify" {
  interface FastifyInstance {
    sseClients: Map<string, (event: string, data: unknown) => void>;
  }
}

export async function startServer(gazeDir: string, port: number): Promise<void> {
  // Initialize database
  initDatabase(gazeDir);

  // Load or create config
  const configPath = path.join(gazeDir, "config.json");
  const isFirstRun = !fs.existsSync(configPath);

  if (!isFirstRun) {
    // Seed agents into DB if empty
    const agents = getAllAgents();
    if (agents.length === 0) {
      const raw = fs.readFileSync(configPath, "utf-8");
      const config = JSON.parse(raw);
      for (const agent of (config.agents ?? DEFAULT_AGENTS) as typeof DEFAULT_AGENTS) {
        createAgent({
          name: agent.name,
          role: agent.role,
          system_prompt: agent.system_prompt,
          avatar_color: agent.avatar_color,
          check_interval: agent.check_interval ?? DEFAULT_SETTINGS.default_check_interval,
        });
      }
    }

    // Seed settings if empty
    const settings = getAllSettings();
    if (!settings.workspace_name) {
      setSetting("workspace_name", DEFAULT_SETTINGS.workspace_name);
      setSetting("triage_model", DEFAULT_SETTINGS.triage_model);
      setSetting("act_model", DEFAULT_SETTINGS.act_model);
    }
  }

  const app = Fastify({ logger: false });

  // SSE clients registry
  app.decorate("sseClients", new Map<string, (event: string, data: unknown) => void>());

  await app.register(cors, { origin: true });

  // Serve built frontend if it exists
  const frontendDist = path.resolve(__dirname, "../../frontend/dist");
  if (fs.existsSync(frontendDist)) {
    await app.register(staticPlugin, {
      root: frontendDist,
      prefix: "/",
    });
  }

  // Register routes
  await app.register(messageRoutes);
  await app.register(agentRoutes, { gazeDir });
  await app.register(settingsRoutes);
  await app.register(configRoutes, { gazeDir });

  // GET /api/health
  app.get("/api/health", async () => ({
    ok: true,
    gazeDir,
    timestamp: new Date().toISOString(),
  }));

  // GET /api/messages/stream — SSE
  app.get("/api/messages/stream", async (request, reply) => {
    const clientId = `${Date.now()}-${Math.random()}`;

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    const send = (event: string, data: unknown) => {
      try {
        reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      } catch {
        // client disconnected
      }
    };

    app.sseClients.set(clientId, send);
    send("connected", { clientId });

    // Heartbeat every 15s
    const heartbeat = setInterval(() => {
      try {
        reply.raw.write(`: heartbeat\n\n`);
      } catch {
        clearInterval(heartbeat);
      }
    }, 15000);

    request.raw.on("close", () => {
      clearInterval(heartbeat);
      app.sseClients.delete(clientId);
    });

    // Keep connection open
    await new Promise(() => {});
  });

  // Set up SSE broadcast
  setBroadcast((event, data) => {
    app.sseClients.forEach((send) => send(event, data));
  });

  // Also wire up message route to use sseClients
  // (messageRoutes uses app.sseClients which is decorated above)

  // Start agents if configured
  if (!isFirstRun) {
    const agents = getAllAgents();
    if (agents.length > 0) {
      console.log(`Starting ${agents.length} agents...`);
      startAllAgents();
    }
  }

  await app.listen({ port, host: "127.0.0.1" });
  console.log(`Gaze server running at http://localhost:${port}`);
  console.log(`State directory: ${gazeDir}`);

  // Graceful shutdown
  const shutdown = async () => {
    console.log("\nShutting down...");
    stopAllAgents();
    await app.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

// ─── CLI bootstrap (only when run directly, not when imported) ───────────────
const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"));
if (isMain || process.env.GAZE_DIRECT === "1") {
  const gazeDir = process.env.GAZE_DIR || path.join(process.cwd(), ".gaze");
  const port = parseInt(process.env.GAZE_PORT || "3333", 10);

  fs.mkdirSync(gazeDir, { recursive: true });
  startServer(gazeDir, port).catch((err) => {
    console.error("Failed to start Gaze server:", err);
    process.exit(1);
  });
}
