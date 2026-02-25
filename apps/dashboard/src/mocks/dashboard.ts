/**
 * Dashboard 首页 mock 数据（仅 UI，不接后端）
 */

export const kpis = {
  load: { value: 1.2, label: "负载", unit: "" },
  cpu: { value: 42, label: "CPU", unit: "%" },
  mem: { value: 68, label: "内存", unit: "%" },
  disk: { value: 55, label: "磁盘", unit: "%" },
};

export const disks = [
  { label: "/", used: 12e9, total: 50e9 },
  { label: "/data", used: 80e9, total: 100e9 },
  { label: "/home", used: 45e9, total: 80e9 },
  { label: "/var", used: 8e9, total: 20e9 },
  { label: "/tmp", used: 2e9, total: 10e9 },
  { label: "/opt", used: 5e9, total: 30e9 },
  { label: "/backup", used: 120e9, total: 200e9 },
  { label: "/cache", used: 15e9, total: 25e9 },
].map((d) => ({ ...d, percent: Math.round((d.used / d.total) * 100) }));

export const pipeline = {
  statusCounts: [
    { status: "Plan/Draft", count: 12 },
    { status: "Pending", count: 8 },
    { status: "In Progress", count: 5 },
    { status: "Review", count: 3 },
    { status: "Testing", count: 2 },
    { status: "Done", count: 120 },
    { status: "Failed", count: 4 },
  ],
  avgDuration: "12m",
  p95Duration: "28m",
  wipThreshold: 5,
  reviewThreshold: 3,
};

export const runners = [
  { name: "runner-1", status: "online" as const, used: 2, total: 4, lastHeartbeat: "2s ago", lastError: "" },
  { name: "runner-2", status: "online" as const, used: 1, total: 4, lastHeartbeat: "5s ago", lastError: "" },
  { name: "runner-3", status: "offline" as const, used: 0, total: 4, lastHeartbeat: "2m ago", lastError: "connection timeout" },
];

export const capacity = {
  total: 12,
  used: 3,
  idle: 9,
  pending: 8,
  running: 3,
};

export const routing = [
  { role: "Planner", primary: "gpt-4o", fallback: "gpt-4o-mini", policy: "fallback on error, max 2 retries" },
  { role: "Implementer", primary: "claude-3-5-sonnet", fallback: "gpt-4o", policy: "fallback on error, timeout 120s" },
  { role: "Reviewer", primary: "gpt-4o", fallback: "claude-3-5-sonnet", policy: "max 2 retries" },
  { role: "Tester", primary: "gpt-4o-mini", fallback: "gpt-4o", policy: "timeout 60s" },
  { role: "Docs", primary: "gpt-4o-mini", fallback: "-", policy: "fallback on error" },
  { role: "Ops", primary: "claude-3-5-sonnet", fallback: "gpt-4o", policy: "timeout 90s" },
];

export const quality = {
  failRate24h: 2.1,
  failCount24h: 4,
  topReasons: [
    { reason: "model timeout", count: 2 },
    { reason: "syntax error", count: 1 },
    { reason: "runner crash", count: 1 },
  ],
  blockedTasks: [
    { id: "T-101", reason: "卡在 Review >2h", severity: "high" as const },
    { id: "T-098", reason: "连续失败 3 次", severity: "med" as const },
    { id: "T-095", reason: "卡在 Testing >1h", severity: "low" as const },
  ],
};

export const activity = [
  { time: "10:32:01", type: "task created", desc: "T-125", ref: "taskId=T-125" },
  { time: "10:31:58", type: "status changed", desc: "T-124 → Done", ref: "taskId=T-124" },
  { time: "10:31:45", type: "runner online", desc: "runner-2", ref: "runnerId=runner-2" },
  { time: "10:30:12", type: "status changed", desc: "T-123 → In Progress", ref: "taskId=T-123" },
  { time: "10:28:00", type: "role→model config changed", desc: "Implementer primary", ref: "role=Implementer" },
  { time: "10:25:33", type: "runner offline", desc: "runner-3", ref: "runnerId=runner-3" },
  { time: "10:24:11", type: "task created", desc: "T-124", ref: "taskId=T-124" },
  { time: "10:22:00", type: "tls changed", desc: "TLS disabled", ref: "" },
  { time: "10:20:05", type: "status changed", desc: "T-122 → Review", ref: "taskId=T-122" },
  { time: "10:18:00", type: "runner online", desc: "runner-1", ref: "runnerId=runner-1" },
];
