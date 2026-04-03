import { FastifyInstance } from "fastify";
import { getAllSettings, setSetting } from "../database.js";

export async function settingsRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/settings
  app.get("/api/settings", async () => {
    return getAllSettings();
  });

  // PATCH /api/settings
  app.patch<{ Body: Record<string, string> }>("/api/settings", async (request) => {
    const updates = request.body;
    for (const [key, value] of Object.entries(updates)) {
      setSetting(key, String(value));
    }
    return getAllSettings();
  });
}
