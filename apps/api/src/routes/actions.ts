import { FastifyInstance } from "fastify";
import { getDb } from "../db.js";
import { enqueue } from "../orchestrator.js";
import { broadcast } from "../sse.js";

function uuid() {
  return crypto.randomUUID();
}

export default async function actionsRoutes(app: FastifyInstance) {
  app.post<{ Params: { id: string } }>("/api/tasks/:id/actions/submit", async (req, reply) => {
    const db = getDb();
    const task = db.prepare(
      "SELECT t.id, t.title, t.workspace_id as workspaceId, w.repo_path as repoPath, w.default_branch as defaultBranch FROM tasks t JOIN workspaces w ON t.workspace_id = w.id WHERE t.id = ?"
    ).get(req.params.id) as { id: string; title: string; workspaceId: string; repoPath: string; defaultBranch: string } | undefined;
    if (!task) return reply.status(404).send({ error: "Not found" });
    const lastRun = db.prepare("SELECT branch_name as branchName FROM runs WHERE task_id = ? ORDER BY created_at DESC LIMIT 1").get(req.params.id) as { branchName: string | null } | undefined;
    const branch = lastRun?.branchName ?? "bb/task-" + req.params.id + "-submit";
    const payload = {
      workspace: { repo_path: task.repoPath, base_branch: task.defaultBranch ?? "main" },
      workdir_strategy: "git_worktree",
      branch,
      submit: { actions: ["commit", "push"], commit_message: "BullBoard: " + task.title, remote: "origin" },
    };
    const { runId, jobId } = enqueue(db, { taskId: task.id, workspaceId: task.workspaceId, mode: "SUBMIT", payload });
    return reply.status(201).send({ runId, jobId });
  });

  app.post<{ Params: { id: string } }>("/api/tasks/:id/actions/replan", async (req, reply) => {
    const db = getDb();
    const now = new Date().toISOString();
    const task = db.prepare("SELECT id, plan_round as planRound FROM tasks WHERE id = ?").get(req.params.id) as { id: string; planRound: number } | undefined;
    if (!task) return reply.status(404).send({ error: "Not found" });
    const newRound = task.planRound + 1;
    db.prepare("UPDATE tasks SET status = 'plan', plan_round = ?, updated_at = ? WHERE id = ?").run(newRound, now, req.params.id);
    db.prepare(
      "INSERT INTO messages (id, task_id, round_type, round_no, author, content, created_at) VALUES (?, ?, 'plan', ?, 'system', ?, ?)"
    ).run(uuid(), req.params.id, newRound, "Re-plan: Round #" + newRound, now);
    const row = db.prepare("SELECT id, status, plan_round as planRound FROM tasks WHERE id = ?").get(req.params.id) as Record<string, unknown>;
    return reply.send(row);
  });

  app.post<{ Params: { id: string } }>("/api/tasks/:id/actions/retry", async (req, reply) => {
    const db = getDb();
    const task = db.prepare("SELECT id, workspace_id as workspaceId FROM tasks WHERE id = ?").get(req.params.id) as { id: string; workspaceId: string } | undefined;
    if (!task) return reply.status(404).send({ error: "Not found" });
    const lastJob = db.prepare(
      "SELECT j.payload_json as payloadJson, j.mode FROM jobs j JOIN runs r ON j.run_id = r.id WHERE r.task_id = ? ORDER BY j.created_at DESC LIMIT 1"
    ).get(req.params.id) as { payloadJson: string; mode: string } | undefined;
    if (!lastJob) return reply.status(400).send({ error: "no run to retry" });
    const runId = uuid();
    const jobId = uuid();
    const now = new Date().toISOString();
    const payload = JSON.parse(lastJob.payloadJson) as Record<string, unknown>;
    if (payload && typeof payload.branch === "string") {
      payload.branch = "bb/task-" + req.params.id + "-r" + runId;
    }
    db.prepare(
      "INSERT INTO runs (id, task_id, mode, status, created_at, updated_at) VALUES (?, ?, ?, 'queued', ?, ?)"
    ).run(runId, task.id, lastJob.mode, now, now);
    db.prepare(
      "INSERT INTO jobs (id, run_id, task_id, workspace_id, mode, payload_json, status, available_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'queued', ?, ?, ?)"
    ).run(jobId, runId, task.id, task.workspaceId, lastJob.mode, JSON.stringify(payload), now, now, now);
    const runRow = db.prepare("SELECT id, task_id as taskId, mode, status FROM runs WHERE id = ?").get(runId) as Record<string, unknown>;
    broadcast("run_status_changed", runRow);
    return reply.status(201).send({ runId, jobId });
  });

  app.post<{ Params: { id: string } }>("/api/tasks/:id/actions/continue-fix", async (req, reply) => {
    const db = getDb();
    const now = new Date().toISOString();
    const task = db.prepare("SELECT id, fix_round as fixRound FROM tasks WHERE id = ?").get(req.params.id) as { id: string; fixRound: number } | undefined;
    if (!task) return reply.status(404).send({ error: "Not found" });
    const newFix = task.fixRound + 1;
    db.prepare("UPDATE tasks SET status = 'in_progress', fix_round = ?, updated_at = ? WHERE id = ?").run(newFix, now, req.params.id);
    db.prepare(
      "INSERT INTO messages (id, task_id, round_type, round_no, author, content, created_at) VALUES (?, ?, 'fix', ?, 'system', ?, ?)"
    ).run(uuid(), req.params.id, newFix, "Continue Fix: Round #" + newFix, now);
    const row = db.prepare("SELECT id, status, fix_round as fixRound FROM tasks WHERE id = ?").get(req.params.id) as Record<string, unknown>;
    return reply.send(row);
  });
}
