const API = "/api";

export type Workspace = {
  id: string;
  name: string;
  repoPath: string;
  defaultBranch: string;
  createdAt: string;
};

export type Task = {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  status: string;
  planRound: number;
  fixRound: number;
  submitState: string;
  createdAt: string;
  updatedAt: string;
  workspaceName?: string;
};

export type TaskDetail = Task & {
  workspace?: Workspace;
  runs?: Run[];
  messages?: Message[];
};

export type Run = {
  id: string;
  taskId: string;
  mode: string;
  status: string;
  errorKind?: string;
  errorMessage?: string;
  startedAt?: string;
  finishedAt?: string;
  artifacts?: Artifact[];
};

export type Artifact = {
  id: string;
  runId: string;
  type: string;
  uri: string;
  createdAt: string;
};

export type Message = {
  id: string;
  taskId: string;
  roundType: string;
  roundNo: number;
  author: string;
  content: string;
  createdAt: string;
};

export async function getWorkspaces(): Promise<Workspace[]> {
  const r = await fetch(API + "/workspaces");
  if (!r.ok) throw new Error("fetch workspaces failed");
  return r.json();
}

export async function createWorkspace(body: { name: string; repoPath: string }) {
  const r = await fetch(API + "/workspaces", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error("create workspace failed");
  return r.json();
}

export async function getTasks(params?: { workspace_id?: string; status?: string }): Promise<Task[]> {
  const q = new URLSearchParams(params as Record<string, string>).toString();
  const r = await fetch(API + "/tasks" + (q ? "?" + q : ""));
  if (!r.ok) throw new Error("fetch tasks failed");
  return r.json();
}

export async function getTask(id: string): Promise<TaskDetail> {
  const r = await fetch(API + "/tasks/" + id);
  if (!r.ok) throw new Error("fetch task failed");
  return r.json();
}

export async function createTask(body: { workspaceId: string; title: string; description?: string }) {
  const r = await fetch(API + "/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error("create task failed");
  return r.json();
}

export async function updateTaskStatus(id: string, status: string) {
  const r = await fetch(API + "/tasks/" + id + "/status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!r.ok) throw new Error("update status failed");
  return r.json();
}

export async function getTaskRuns(taskId: string): Promise<Run[]> {
  const r = await fetch(API + "/tasks/" + taskId + "/runs");
  if (!r.ok) throw new Error("fetch runs failed");
  return r.json();
}

export async function getTaskMessages(taskId: string): Promise<Message[]> {
  const r = await fetch(API + "/tasks/" + taskId + "/messages");
  if (!r.ok) throw new Error("fetch messages failed");
  return r.json();
}

export async function createMessage(
  taskId: string,
  body: { roundType: string; roundNo: number; author: string; content: string }
) {
  const r = await fetch(API + "/tasks/" + taskId + "/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error("create message failed");
  return r.json();
}

export function artifactDownloadUrl(id: string): string {
  return API + "/artifacts/" + id + "/download";
}

export async function enqueueTask(
  taskId: string,
  body: { mode: string; payload: Record<string, unknown> }
): Promise<{ runId: string; jobId: string }> {
  const r = await fetch(API + "/tasks/" + taskId + "/enqueue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error("enqueue failed");
  return r.json();
}

export async function actionSubmit(taskId: string): Promise<{ runId: string; jobId: string }> {
  const r = await fetch(API + "/tasks/" + taskId + "/actions/submit", { method: "POST" });
  if (!r.ok) throw new Error("submit failed");
  return r.json();
}

export async function actionReplan(taskId: string) {
  const r = await fetch(API + "/tasks/" + taskId + "/actions/replan", { method: "POST" });
  if (!r.ok) throw new Error("replan failed");
  return r.json();
}

export async function actionRetry(taskId: string): Promise<{ runId: string; jobId: string }> {
  const r = await fetch(API + "/tasks/" + taskId + "/actions/retry", { method: "POST" });
  if (!r.ok) throw new Error("retry failed");
  return r.json();
}

export async function actionContinueFix(taskId: string) {
  const r = await fetch(API + "/tasks/" + taskId + "/actions/continue-fix", { method: "POST" });
  if (!r.ok) throw new Error("continue-fix failed");
  return r.json();
}
