import { FastifyInstance } from "fastify";
import {
  getOrCreateDmChannel,
  getAllDmChannels,
  getDmChannel,
  getDmMessages,
  postDmMessage,
  getAgent,
} from "../database.js";
import { wakeAgent } from "../agentLoop.js";

export async function dmRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/dms — list all DM channels with last message and participant info
  app.get("/api/dms", async () => {
    const channels = getAllDmChannels();
    return channels.map((ch) => {
      const messages = getDmMessages(ch.id, 1);
      const agent1 = getAgent(ch.agent1_id);
      const agent2 = getAgent(ch.agent2_id);
      return {
        id: ch.id,
        name: ch.name,
        agent1: agent1 ? { id: agent1.id, name: agent1.name, avatar_color: agent1.avatar_color } : null,
        agent2: agent2 ? { id: agent2.id, name: agent2.name, avatar_color: agent2.avatar_color } : null,
        last_message: messages[0] ?? null,
      };
    });
  });

  // POST /api/dms — create or get DM channel between two agents
  app.post<{ Body: { agent1Id: number; agent2Id: number } }>("/api/dms", async (request, reply) => {
    const { agent1Id, agent2Id } = request.body;
    if (!agent1Id || !agent2Id || agent1Id === agent2Id) {
      return reply.code(400).send({ error: "agent1Id and agent2Id are required and must differ" });
    }
    const channel = getOrCreateDmChannel(agent1Id, agent2Id);
    const agent1 = getAgent(channel.agent1_id);
    const agent2 = getAgent(channel.agent2_id);
    return {
      channelId: channel.id,
      name: channel.name,
      agent1: agent1 ? { id: agent1.id, name: agent1.name, avatar_color: agent1.avatar_color } : null,
      agent2: agent2 ? { id: agent2.id, name: agent2.name, avatar_color: agent2.avatar_color } : null,
    };
  });

  // GET /api/dms/:channelId/messages — get messages for a DM channel
  app.get<{ Params: { channelId: string }; Querystring: { limit?: string } }>(
    "/api/dms/:channelId/messages",
    async (request, reply) => {
      const channelId = parseInt(request.params.channelId);
      const limit = parseInt(request.query.limit ?? "50");
      const channel = getDmChannel(channelId);
      if (!channel) return reply.code(404).send({ error: "DM channel not found" });
      const messages = getDmMessages(channelId, limit);
      return [...messages].reverse(); // oldest first
    }
  );

  // POST /api/dms/:channelId/messages — post a message to a DM channel (human or system)
  app.post<{
    Params: { channelId: string };
    Body: { content: string; sender_name?: string; sender_id?: number };
  }>("/api/dms/:channelId/messages", async (request, reply) => {
    const channelId = parseInt(request.params.channelId);
    const { content, sender_name = "You", sender_id = null } = request.body;
    if (!content?.trim()) return reply.code(400).send({ error: "content is required" });

    const channel = getDmChannel(channelId);
    if (!channel) return reply.code(404).send({ error: "DM channel not found" });

    const msg = postDmMessage(channelId, sender_id, sender_name, content.trim());

    // Broadcast to SSE clients
    app.sseClients?.forEach((send) => {
      send("dm_message", { ...msg, channel_id: channelId, channel_name: channel.name });
    });

    // Wake both agents in the DM channel when a human posts
    if (!sender_id) {
      wakeAgent(channel.agent1_id);
      wakeAgent(channel.agent2_id);
    }

    return msg;
  });
}
