import { FastifyInstance } from "fastify";
import { getDb } from "../db.js";
import { createWorkspaceSchema } from "../schemas.js";

function uuid() {
  return crypto.randomUUID();
}

export default async function workspacesRoutes(app: FastifyInstance) {
  app.get("/api/workspaces", async () => {
    const db = getDb();
    const rows = db.prepare(
      "SELECT id, name, repo_path as repoPath, default_branch as defaultBranch, gate_level1_commands as gateLevel1Commands, created_at as createdAt, updated_at as updatedAt FROM workspaces ORDER BY created_at DESC"
    ).all();
    return rows;
  });

  app.get<{ Params: { id: string } }>("/api/workspaces/:id", async (req, reply) => {
    const db = getDb();
    const row = db.prepare(
      "SELECT id, name, repo_path as repoPath, default_branch as defaultBranch, gate_level1_commands as gateLevel1Commands, created_at as createdAt, updated_at as updatedAt FROM workspaces WHERE id = ?"
    ).get(req.params.id) as Record<string, unknown> | undefined;
    if (!row) return reply.status(404).send({ error: "Not found" });
    return row;
  });

  app.post("/api/workspaces", async (req, reply) => {
    const parsed = createWorkspaceSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation failed", details: parsed.error.flatten() });
    }
    const { name, repoPath, defaultBranch } = parsed.data;
    const id = uuid();
    const db = getDb();
    const now = new Date().toISOString();
    db.prepare(
      "INSERT INTO workspaces (id, name, repo_path, default_branch, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(id, name, repoPath, defaultBranch ?? "main", now, now);
    const row = db.prepare(
      "SELECT id, name, repo_path as repoPath, default_branch as defaultBranch, gate_level1_commands as gateLevel1Commands, created_at as createdAt, updated_at as updatedAt FROM workspaces WHERE id = ?"
    ).get(id) as Record<string, unknown>;
    return reply.status(201).send(row);
  });
}
