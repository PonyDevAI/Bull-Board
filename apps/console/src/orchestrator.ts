import type Database from "better-sqlite3";
import { getDb } from "./db.js";
import { broadcast } from "./sse.js";

function uuid() {
  return crypto.randomUUID();
}

export type JobMode = "CODE_CHANGE" | "VERIFY" | "SUBMIT";

export function enqueue(
  db: Database.Database,
  params: {
    taskId: string;
    workspaceId: string;
    mode: JobMode;
    payload: Record<string, unknown>;
  }
): { runId: string; jobId: string } {
  const runId = uuid();
  const jobId = uuid();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO runs (id, task_id, mode, status, created_at, updated_at) VALUES (?, ?, ?, 'queued', ?, ?)`
  ).run(runId, params.taskId, params.mode, now, now);
  db.prepare(
    `INSERT INTO jobs (id, run_id, task_id, workspace_id, mode, payload_json, status, available_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'queued', ?, ?, ?)`
  ).run(
    jobId,
    runId,
    params.taskId,
    params.workspaceId,
    params.mode,
    JSON.stringify(params.payload),
    now,
    now,
    now
  );
  const runRow = db.prepare("SELECT id, task_id as taskId, mode, status FROM runs WHERE id = ?").get(runId) as Record<string, unknown>;
  broadcast("run_status_changed", runRow);
  return { runId, jobId };
}

const reportSchema = {
  run_id: (v: unknown) => typeof v === "string",
  status: (v: unknown) => v === "succeeded" || v === "failed",
  error_kind: (v: unknown) => v == null || ["none", "code_failed", "test_failed", "infra_failed"].includes(v as string),
  summary: (v: unknown) => v == null || typeof v === "string",
  artifacts: (v: unknown) => v == null || (Array.isArray(v) && v.every((a: unknown) => a && typeof (a as { type?: string }).type === "string" && typeof (a as { uri?: string }).uri === "string")),
};

export function applyReport(
  body: {
    run_id: string;
    status: "succeeded" | "failed";
    error_kind?: string;
    summary?: string;
    artifacts?: { type: string; uri: string }[];
  }
): { taskId: string } | { error: string } {
  if (!reportSchema.run_id(body.run_id) || !reportSchema.status(body.status)) {
    return { error: "run_id and status required" };
  }
  if (body.error_kind != null && !reportSchema.error_kind(body.error_kind)) return { error: "invalid error_kind" };
  if (body.artifacts != null && !reportSchema.artifacts(body.artifacts)) return { error: "invalid artifacts" };

  const db = getDb();
  const run = db.prepare("SELECT id, task_id as taskId, mode FROM runs WHERE id = ?").get(body.run_id) as { id: string; taskId: string; mode: string } | undefined;
  if (!run) return { error: "run not found" };

  const now = new Date().toISOString();
  db.prepare(
    "UPDATE runs SET status = ?, error_kind = ?, error_message = ?, finished_at = ?, updated_at = ? WHERE id = ?"
  ).run(
    body.status,
    body.error_kind ?? "none",
    body.summary ?? null,
    now,
    now,
    body.run_id
  );

  if (body.artifacts?.length) {
    const ins = db.prepare("INSERT INTO artifacts (id, run_id, type, uri, created_at) VALUES (?, ?, ?, ?, ?)");
    for (const a of body.artifacts) {
      ins.run(uuid(), body.run_id, a.type, a.uri, now);
    }
  }

  const job = db.prepare("SELECT id FROM jobs WHERE run_id = ?").get(body.run_id) as { id: string } | undefined;
  if (job) {
    db.prepare(
      "UPDATE jobs SET status = ?, locked_until = NULL, last_error = ?, updated_at = ? WHERE id = ?"
    ).run(body.status, body.status === "failed" ? (body.summary ?? "") : null, now, job.id);
  }

  const task = db.prepare("SELECT id, status, fix_round as fixRound FROM tasks WHERE id = ?").get(run.taskId) as { id: string; status: string; fixRound: number } | undefined;
  if (!task) return { taskId: run.taskId };

  if (run.mode === "VERIFY") {
    if (body.status === "succeeded") {
      db.prepare("UPDATE tasks SET status = 'done', updated_at = ? WHERE id = ?").run(now, task.id);
      broadcast("task_status_changed", { taskId: task.id, status: "done" });
    } else {
      const kind = (body.error_kind ?? "none") as string;
      if (kind === "code_failed" || kind === "test_failed") {
        const newFix = task.fixRound + 1;
        db.prepare("UPDATE tasks SET status = 'in_progress', fix_round = ?, updated_at = ? WHERE id = ?").run(newFix, now, task.id);
        const msgContent = `Fix Round #${newFix}\n${body.summary ?? ""}`;
        db.prepare(
          "INSERT INTO messages (id, task_id, round_type, round_no, author, content, created_at) VALUES (?, ?, 'fix', ?, 'system', ?, ?)"
        ).run(uuid(), task.id, newFix, msgContent, now);
        broadcast("task_status_changed", { taskId: task.id, status: "in_progress", fix_round: newFix });
      } else {
        db.prepare("UPDATE tasks SET status = 'failed', updated_at = ? WHERE id = ?").run(now, task.id);
        broadcast("task_status_changed", { taskId: task.id, status: "failed" });
      }
    }
  }

  const runRow = db.prepare("SELECT id, task_id as taskId, mode, status, error_kind as errorKind, error_message as errorMessage, finished_at as finishedAt FROM runs WHERE id = ?").get(body.run_id) as Record<string, unknown>;
  broadcast("run_status_changed", runRow);
  return { taskId: run.taskId };
}
