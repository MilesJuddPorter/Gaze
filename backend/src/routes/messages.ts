import { FastifyInstance } from "fastify";
import {
  getMessages,
  postMessage,
  getAllAgents,
  toggleReaction,
  getReactionsForMessages,
  type Message,
} from "../database.js";
import { wakeAgent } from "../agentLoop.js";

export async function messageRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/messages
  app.get<{
    Querystring: { limit?: string; before_id?: string };
  }>("/api/messages", async (request, reply) => {
    const limit = parseInt(request.query.limit ?? "50");
    const beforeId = request.query.before_id
      ? parseInt(request.query.before_id)
      : undefined;

    const messages = getMessages(limit, beforeId);
    const reversed = [...messages].reverse();

    const messageIds = reversed.map((m) => m.id);
    const reactions = getReactionsForMessages(messageIds);

    return reversed.map((m) => ({
      ...m,
      reactions: reactions[m.id] ?? [],
    }));
  });

  // POST /api/messages
  app.post<{
    Body: { content: string; author_name?: string };
  }>("/api/messages", async (request, reply) => {
    const { content, author_name = "You" } = request.body;
    if (!content?.trim()) {
      return reply.code(400).send({ error: "Content is required" });
    }

    const msg = postMessage(author_name, content.trim(), null, "message");

    // Broadcast to SSE clients
    app.sseClients?.forEach((send) => {
      send("message", { ...msg, reactions: [] });
    });

    // Wake only @mentioned agents — mention-only mode
    // OOO agents get an instant bot reply instead of waking
    const agents = getAllAgents();
    const mentionedNames = (content.match(/@(\w+)/g) ?? []).map((m) => m.slice(1).toLowerCase());
    for (const agent of agents) {
      if (!mentionedNames.includes(agent.name.toLowerCase())) continue;

      if (agent.is_ooo) {
        // Fire instant OOO bot message
        const oooMsg = postMessage(
          "GazeBot",
          `Heads up — **@${agent.name}** is out of the den right now. They'll be back when marked available again. 🗑️`,
          null,
          "system_bot"
        );
        app.sseClients?.forEach((send) => send("message", { ...oooMsg, reactions: [] }));
      } else {
        wakeAgent(agent.id);
      }
    }

    return { ...msg, reactions: [] };
  });

  // POST /api/reactions
  app.post<{
    Body: { message_id: number; reactor_name: string; emoji: string };
  }>("/api/reactions", async (request, reply) => {
    const { message_id, reactor_name, emoji } = request.body;
    const result = toggleReaction(message_id, reactor_name, emoji);

    app.sseClients?.forEach((send) => {
      send("reaction", { message_id, reactor_name, emoji, added: result.added });
    });

    return result;
  });
}
