import { FastifyInstance } from "fastify";
import { getDb } from "../db.js";
import { enqueue } from "../orchestrator.js";
import { createTaskSchema, updateTaskStatusSchema, createMessageSchema } from "../schemas.js";

function uuid() {
  return crypto.randomUUID();
}

export default async function tasksRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { workspace_id?: string; status?: string } }>("/api/tasks", async (req) => {
    const { workspace_id, status } = req.query ?? {};
    const db = getDb();
    let sql = "SELECT t.id, t.workspace_id as workspaceId, t.title, t.description, t.status, t.plan_round as planRound, t.fix_round as fixRound, t.submit_state as submitState, t.created_at as createdAt, t.updated_at as updatedAt, w.name as workspaceName FROM tasks t LEFT JOIN workspaces w ON t.workspace_id = w.id WHERE 1=1";
    const params: string[] = [];
    if (workspace_id) { sql += " AND t.workspace_id = ?"; params.push(workspace_id); }
    if (status) { sql += " AND t.status = ?"; params.push(status); }
    sql += " ORDER BY t.updated_at DESC";
    const rows = params.length ? db.prepare(sql).all(...params) : db.prepare(sql).all();
    return rows;
  });

  app.get<{ Params: { id: string } }>("/api/tasks/:id", async (req, reply) => {
    const db = getDb();
    const row = db.prepare(
      "SELECT id, workspace_id as workspaceId, title, description, status, plan_round as planRound, fix_round as fixRound, submit_state as submitState, created_at as createdAt, updated_at as updatedAt FROM tasks WHERE id = ?"
    ).get(req.params.id) as Record<string, unknown> | undefined;
    if (!row) return reply.status(404).send({ error: "Not found" });
    const workspace = db.prepare("SELECT id, name, repo_path as repoPath, default_branch as defaultBranch FROM workspaces WHERE id = ?").get((row as { workspaceId: string }).workspaceId) as Record<string, unknown> | undefined;
    const runs = db.prepare("SELECT id, task_id as taskId, mode, status, error_kind as errorKind, error_message as errorMessage, started_at as startedAt, finished_at as finishedAt FROM runs WHERE task_id = ? ORDER BY started_at DESC").all(req.params.id);
    const messages = db.prepare("SELECT id, task_id as taskId, round_type as roundType, round_no as roundNo, author, content, created_at as createdAt FROM messages WHERE task_id = ? ORDER BY id ASC").all(req.params.id);
    return { ...row, workspace, runs, messages };
  });

  app.post("/api/tasks", async (req, reply) => {
    const parsed = createTaskSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: "Validation failed", details: parsed.error.flatten() });
    const { workspaceId, title, description } = parsed.data;
    const id = uuid();
    const db = getDb();
    const now = new Date().toISOString();
    db.prepare(
      "INSERT INTO tasks (id, workspace_id, title, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(id, workspaceId, title, description ?? "", now, now);
    const row = db.prepare(
      "SELECT id, workspace_id as workspaceId, title, description, status, plan_round as planRound, fix_round as fixRound, submit_state as submitState, created_at as createdAt, updated_at as updatedAt FROM tasks WHERE id = ?"
    ).get(id) as Record<string, unknown>;
    return reply.status(201).send(row);
  });

  app.post<{ Params: { id: string }; Body: { status?: string } }>("/api/tasks/:id/status", async (req, reply) => {
    const parsed = updateTaskStatusSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: "Validation failed", details: parsed.error.flatten() });
    const db = getDb();
    const now = new Date().toISOString();
    const result = db.prepare("UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?").run(parsed.data.status, now, req.params.id);
    if (result.changes === 0) return reply.status(404).send({ error: "Not found" });
    const row = db.prepare("SELECT id, workspace_id as workspaceId, title, description, status, plan_round as planRound, fix_round as fixRound, submit_state as submitState, created_at as createdAt, updated_at as updatedAt FROM tasks WHERE id = ?").get(req.params.id) as Record<string, unknown>;
    return row;
  });

  app.get<{ Params: { id: string } }>("/api/tasks/:id/messages", async (req) => {
    const db = getDb();
    const rows = db.prepare(
      "SELECT id, task_id as taskId, round_type as roundType, round_no as roundNo, author, content, created_at as createdAt FROM messages WHERE task_id = ? ORDER BY id ASC"
    ).all(req.params.id);
    return rows;
  });

  app.post<{ Params: { id: string } }>("/api/tasks/:id/messages", async (req, reply) => {
    const parsed = createMessageSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: "Validation failed", details: parsed.error.flatten() });
    const task = getDb().prepare("SELECT id FROM tasks WHERE id = ?").get(req.params.id);
    if (!task) return reply.status(404).send({ error: "Task not found" });
    const id = uuid();
    const db = getDb();
    const now = new Date().toISOString();
    db.prepare(
      "INSERT INTO messages (id, task_id, round_type, round_no, author, content, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(id, req.params.id, parsed.data.roundType, parsed.data.roundNo, parsed.data.author, parsed.data.content, now);
    const row = db.prepare("SELECT id, task_id as taskId, round_type as roundType, round_no as roundNo, author, content, created_at as createdAt FROM messages WHERE id = ?").get(id) as Record<string, unknown>;
    return reply.status(201).send(row);
  });

  app.get<{ Params: { id: string } }>("/api/tasks/:id/runs", async (req) => {
    const db = getDb();
    const runs = db.prepare(
      "SELECT id, task_id as taskId, mode, status, worktree_path as worktreePath, branch_name as branchName, error_kind as errorKind, error_message as errorMessage, started_at as startedAt, finished_at as finishedAt, created_at as createdAt FROM runs WHERE task_id = ? ORDER BY started_at DESC"
    ).all(req.params.id);
    const runIds = (runs as { id: string }[]).map((r) => r.id);
    const artifactsByRun: Record<string, unknown[]> = {};
    if (runIds.length) {
      const placeholders = runIds.map(() => "?").join(",");
      const artifacts = db.prepare(`SELECT id, run_id as runId, type, uri, meta, created_at as createdAt FROM artifacts WHERE run_id IN (${placeholders})`).all(...runIds) as { runId: string; id: string; type: string; uri: string; meta: string | null; createdAt: string }[];
      for (const a of artifacts) {
        if (!artifactsByRun[a.runId]) artifactsByRun[a.runId] = [];
        artifactsByRun[a.runId].push(a);
      }
    }
    return (runs as Record<string, unknown>[]).map((r) => ({ ...r, artifacts: artifactsByRun[(r.id as string)] ?? [] }));
  });

  app.post<{
    Params: { id: string };
    Body: { mode: "CODE_CHANGE" | "VERIFY" | "SUBMIT"; payload: Record<string, unknown> };
  }>("/api/tasks/:id/enqueue", async (req, reply) => {
    const db = getDb();
    const task = db.prepare("SELECT id, workspace_id as workspaceId FROM tasks WHERE id = ?").get(req.params.id) as { id: string; workspaceId: string } | undefined;
    if (!task) return reply.status(404).send({ error: "Not found" });
    const body = req.body as { mode?: string; payload?: Record<string, unknown> } | undefined;
    if (!body?.payload || !body?.mode || !["CODE_CHANGE", "VERIFY", "SUBMIT"].includes(body.mode)) {
      return reply.status(400).send({ error: "mode and payload required" });
    }
    const { runId, jobId } = enqueue(db, {
      taskId: task.id,
      workspaceId: task.workspaceId,
      mode: body.mode as "CODE_CHANGE" | "VERIFY" | "SUBMIT",
      payload: body.payload,
    });
    return reply.status(201).send({ runId, jobId });
  });
}
