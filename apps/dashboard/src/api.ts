/** 与 console 连接：默认同源 /api；独立 console 时设 VITE_API_BASE，如 https://console.example.com */
const API_BASE = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");
const API = API_BASE + "/api";

const defaultFetchOptions: RequestInit = { credentials: "include" };

function handleResponse<T>(r: Response): Promise<T> {
  if (r.status === 401) {
    // 已在登录页时不重定向，避免 401 导致循环跳转
    if (!window.location.pathname.startsWith("/login")) {
      window.location.href = "/login?returnTo=" + encodeURIComponent(window.location.pathname + window.location.search);
    }
    return Promise.reject(new Error("unauthorized"));
  }
  if (!r.ok) throw new Error("request failed");
  return r.json();
}

export function getApiBase(): string {
  return API_BASE || "";
}

export type Workspace = {
  id: string;
  name: string;
  repoPath: string;
  defaultBranch: string;
  createdAt: string;
};

export type WorkflowTemplate = {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  config_json: string;
  created_at: string;
  updated_at: string;
};

export type WorkflowStep = {
  id: string;
  workflow_template_id: string;
  role_id?: string;
  name: string;
  step_type: string;
  step_order: number;
  config_json: string;
  created_at: string;
};

export type TaskWorkflowState = {
  workflow_run?: { id: string; status: string };
  step_runs?: Array<{ id: string; name?: string; step_order?: number; status: string; worker_id?: string }>;
  current_step?: { id: string; status: string; name?: string; worker_id?: string };
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
  workflowRun?: { id: string; status: string };
  stepRuns?: Array<{ id: string; name?: string; step_order?: number; status: string; worker_id?: string }>;
  currentStep?: { id: string; status: string; name?: string; worker_id?: string };
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
  assignedWorkerId?: string;
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

// --- Auth ---
export type AuthUser = { username: string };

export async function authMe(): Promise<AuthUser | null> {
  const r = await fetch(API + "/auth/me", defaultFetchOptions);
  if (r.status === 401) return null;
  if (!r.ok) throw new Error("auth check failed");
  return r.json();
}

export async function authLogin(username: string, password: string): Promise<AuthUser> {
  const r = await fetch(API + "/auth/login", {
    ...defaultFetchOptions,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error((e as { error?: string }).error || "登录失败");
  }
  return r.json();
}

export async function authLogout(): Promise<void> {
  await fetch(API + "/auth/logout", { ...defaultFetchOptions, method: "POST" });
}

// --- System ---
export type SystemVersion = { current_version: string };

export async function getSystemVersion(): Promise<SystemVersion> {
  const r = await fetch(API + "/system/version", defaultFetchOptions);
  return handleResponse<SystemVersion>(r);
}

export type SystemUpdate = {
  current_version: string;
  has_update: boolean;
  ignored_versions: string[];
  latest: {
    version: string;
    name: string;
    published_at: string;
    release_url: string;
    notes_md: string;
    assets: { name: string; size: number; download_url: string }[];
  };
  error?: string;
};

export async function getSystemUpdate(): Promise<SystemUpdate> {
  const r = await fetch(API + "/system/update", defaultFetchOptions);
  return handleResponse<SystemUpdate>(r);
}

export type SystemLogsResponse = {
  unit: "console";
  lines: number;
  content: string;
};

export async function getSystemLogs(lines: number, query?: string, since?: string): Promise<SystemLogsResponse> {
  const params = new URLSearchParams();
  if (lines > 0) {
    params.set("lines", String(lines));
  }
  if (query) {
    params.set("query", query);
  }
   if (since) {
     params.set("since", since);
   }
  const r = await fetch(API + "/system/logs" + "?" + params.toString(), defaultFetchOptions);
  return handleResponse<SystemLogsResponse>(r);
}

export async function ignoreVersion(version: string): Promise<{ ok: boolean; ignored_versions: string[] }> {
  const r = await fetch(API + "/system/update/ignore", {
    ...defaultFetchOptions,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ version }),
  });
  return handleResponse(r);
}

export type UpgradePlan = { mode: string; command: string };

export async function getUpgradePlan(version: string): Promise<UpgradePlan> {
  const r = await fetch(API + "/system/upgrade/plan", {
    ...defaultFetchOptions,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ version }),
  });
  return handleResponse(r);
}

// --- API Keys ---
export type ApiKeyItem = {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt?: string;
  revokedAt?: string;
};

export async function getApiKeys(): Promise<ApiKeyItem[]> {
  const r = await fetch(API + "/api-keys", defaultFetchOptions);
  return handleResponse(r);
}

export async function createApiKey(name: string): Promise<ApiKeyItem & { api_key_plaintext: string }> {
  const r = await fetch(API + "/api-keys", {
    ...defaultFetchOptions,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: name || "API Key" }),
  });
  return handleResponse(r);
}

export async function revokeApiKey(id: string): Promise<void> {
  const r = await fetch(API + "/api-keys/" + id + "/revoke", { ...defaultFetchOptions, method: "POST" });
  return handleResponse(r);
}

export async function deleteApiKey(id: string): Promise<void> {
  const r = await fetch(API + "/api-keys/" + id, { ...defaultFetchOptions, method: "DELETE" });
  return handleResponse(r);
}

// --- Workspaces etc ---
export async function getWorkspaces(): Promise<Workspace[]> {
  const r = await fetch(API + "/workspaces", defaultFetchOptions);
  return handleResponse(r);
}

export async function createWorkspace(body: { name: string; repoPath: string }) {
  const r = await fetch(API + "/workspaces", {
    ...defaultFetchOptions,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse(r);
}

export async function getTasks(params?: { workspace_id?: string; status?: string }): Promise<Task[]> {
  const q = new URLSearchParams(params as Record<string, string>).toString();
  const r = await fetch(API + "/tasks" + (q ? "?" + q : ""), defaultFetchOptions);
  return handleResponse(r);
}

export async function getTask(id: string): Promise<TaskDetail> {
  const r = await fetch(API + "/tasks/" + id, defaultFetchOptions);
  return handleResponse(r);
}

export async function createTask(body: { workspaceId: string; title: string; description?: string; workflowTemplateId?: string }) {
  const r = await fetch(API + "/tasks", {
    ...defaultFetchOptions,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse(r);
}

export async function updateTaskStatus(id: string, status: string) {
  const r = await fetch(API + "/tasks/" + id + "/status", {
    ...defaultFetchOptions,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  return handleResponse(r);
}

export async function getTaskRuns(taskId: string): Promise<Run[]> {
  const r = await fetch(API + "/tasks/" + taskId + "/runs", defaultFetchOptions);
  return handleResponse(r);
}

export async function getTaskMessages(taskId: string): Promise<Message[]> {
  const r = await fetch(API + "/tasks/" + taskId + "/messages", defaultFetchOptions);
  return handleResponse(r);
}

export async function createMessage(
  taskId: string,
  body: { roundType: string; roundNo: number; author: string; content: string }
) {
  const r = await fetch(API + "/tasks/" + taskId + "/messages", {
    ...defaultFetchOptions,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse(r);
}

export function artifactDownloadUrl(id: string): string {
  return API + "/artifacts/" + id + "/download";
}

export async function enqueueTask(
  taskId: string,
  body: { mode: string; payload: Record<string, unknown> }
): Promise<{ runId: string; jobId: string }> {
  const r = await fetch(API + "/tasks/" + taskId + "/enqueue", {
    ...defaultFetchOptions,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse(r);
}

export async function actionSubmit(taskId: string): Promise<{ runId: string; jobId: string }> {
  const r = await fetch(API + "/tasks/" + taskId + "/actions/submit", { ...defaultFetchOptions, method: "POST" });
  return handleResponse(r);
}

export async function actionReplan(taskId: string) {
  const r = await fetch(API + "/tasks/" + taskId + "/actions/replan", { ...defaultFetchOptions, method: "POST" });
  return handleResponse(r);
}

export async function actionRetry(taskId: string): Promise<{ runId: string; jobId: string }> {
  const r = await fetch(API + "/tasks/" + taskId + "/actions/retry", { ...defaultFetchOptions, method: "POST" });
  return handleResponse(r);
}

export async function actionContinueFix(taskId: string) {
  const r = await fetch(API + "/tasks/" + taskId + "/actions/continue-fix", { ...defaultFetchOptions, method: "POST" });
  return handleResponse(r);
}

export type Role = WorkforceResource & { home_id: string; name: string; code: string; description?: string };
export type ModelProfile = WorkforceResource & { home_id: string; name: string; provider: string; model_name: string };
export type IntegrationInstance = WorkforceResource & { home_id: string; connector_code: string; name: string; status: string };
export type AgentApp = WorkforceResource & { home_id: string; name: string; default_model_profile_id?: string; default_execution_backend_id?: string };
export type ExecutionBackend = WorkforceResource & { home_id: string; connector_code: string; name: string; type: string; endpoint_url: string; status: string };
export type Worker = WorkforceResource & {
  home_id: string;
  workspace_id: string;
  group_id: string;
  role_id: string;
  agent_app_id: string;
  execution_backend_id: string;
  name: string;
  status: string;
  max_concurrency: number;
};

export type WorkforceResource = Record<string, any> & { id: string };

async function listResource(path: string): Promise<WorkforceResource[]> {
  const r = await fetch(API + path, defaultFetchOptions);
  const data = await handleResponse<{ items: WorkforceResource[] }>(r);
  return data.items ?? [];
}

async function createResource(path: string, body: Record<string, any>): Promise<WorkforceResource> {
  const r = await fetch(API + path, {
    ...defaultFetchOptions,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await handleResponse<{ item: WorkforceResource }>(r);
  return data.item;
}

async function updateResource(path: string, id: string, body: Record<string, any>): Promise<WorkforceResource> {
  const r = await fetch(API + path + "/" + id, {
    ...defaultFetchOptions,
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await handleResponse<{ item: WorkforceResource }>(r);
  return data.item;
}

export const workforceApi = {
  listRoles: () => listResource("/roles"),
  createRole: (body: Record<string, any>) => createResource("/roles", body),
  updateRole: (id: string, body: Record<string, any>) => updateResource("/roles", id, body),
  listModelProfiles: () => listResource("/model-profiles"),
  createModelProfile: (body: Record<string, any>) => createResource("/model-profiles", body),
  updateModelProfile: (id: string, body: Record<string, any>) => updateResource("/model-profiles", id, body),
  listIntegrations: () => listResource("/integrations"),
  createIntegration: (body: Record<string, any>) => createResource("/integrations", body),
  updateIntegration: (id: string, body: Record<string, any>) => updateResource("/integrations", id, body),
  listAgentApps: () => listResource("/agent-apps"),
  createAgentApp: (body: Record<string, any>) => createResource("/agent-apps", body),
  updateAgentApp: (id: string, body: Record<string, any>) => updateResource("/agent-apps", id, body),
  listExecutionBackends: () => listResource("/execution-backends"),
  createExecutionBackend: (body: Record<string, any>) => createResource("/execution-backends", body),
  updateExecutionBackend: (id: string, body: Record<string, any>) => updateResource("/execution-backends", id, body),
  listWorkers: () => listResource("/workers"),
  createWorker: (body: Record<string, any>) => createResource("/workers", body),
  updateWorker: (id: string, body: Record<string, any>) => updateResource("/workers", id, body),
};


export async function getWorkflowTemplates(): Promise<{ items: WorkflowTemplate[] }> {
  const r = await fetch(API + "/workflow-templates", defaultFetchOptions);
  return handleResponse(r);
}

export async function createWorkflowTemplate(body: { workspace_id: string; name: string; description?: string; config_json?: string }) {
  const r = await fetch(API + "/workflow-templates", {
    ...defaultFetchOptions,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse(r);
}

export async function updateWorkflowTemplate(id: string, body: Record<string, unknown>) {
  const r = await fetch(API + "/workflow-templates/" + id, {
    ...defaultFetchOptions,
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse(r);
}

export async function getWorkflowTemplateSteps(templateId: string): Promise<{ items: WorkflowStep[] }> {
  const r = await fetch(API + "/workflow-templates/" + templateId + "/steps", defaultFetchOptions);
  return handleResponse(r);
}

export async function createWorkflowTemplateStep(templateId: string, body: Record<string, unknown>) {
  const r = await fetch(API + "/workflow-templates/" + templateId + "/steps", {
    ...defaultFetchOptions,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse(r);
}

export async function getTaskWorkflow(taskId: string): Promise<TaskWorkflowState> {
  const r = await fetch(API + "/tasks/" + taskId + "/workflow", defaultFetchOptions);
  return handleResponse(r);
}
