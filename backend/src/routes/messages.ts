import { FastifyInstance } from "fastify";
import {
  getMessages,
  postMessage,
  toggleReaction,
  getReactionsForMessages,
  type Message,
} from "../database.js";
import { wakeAll } from "../agentLoop.js";

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
    const { content, author_name = "Miles" } = request.body;
    if (!content?.trim()) {
      return reply.code(400).send({ error: "Content is required" });
    }

    const msg = postMessage(author_name, content.trim(), null, "message");

    // Broadcast to SSE clients
    app.sseClients?.forEach((send) => {
      send("message", { ...msg, reactions: [] });
    });

    // Wake agents
    wakeAll();

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
