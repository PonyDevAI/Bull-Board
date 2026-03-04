import { FastifyInstance } from "fastify";
import fs from "node:fs";
import path from "node:path";
import { getDb } from "../db.js";

export default async function runsRoutes(app: FastifyInstance) {
  app.get<{ Params: { run_id: string } }>("/api/runs/:run_id/artifacts", async (req) => {
    const db = getDb();
    const rows = db.prepare(
      "SELECT id, run_id as runId, type, uri, meta, created_at as createdAt FROM artifacts WHERE run_id = ?"
    ).all(req.params.run_id) as Record<string, unknown>[];
    return rows;
  });

  app.get<{ Params: { id: string } }>("/api/artifacts/:id/download", async (req, reply) => {
    const db = getDb();
    const row = db.prepare("SELECT id, uri FROM artifacts WHERE id = ?").get(req.params.id) as { id: string; uri: string } | undefined;
    if (!row) return reply.status(404).send({ error: "Not found" });
    const fullPath = path.isAbsolute(row.uri) ? row.uri : path.join(process.cwd(), row.uri);
    if (!fs.existsSync(fullPath)) return reply.status(404).send({ error: "File not found" });
    return reply.send(fs.createReadStream(fullPath));
  });
}
