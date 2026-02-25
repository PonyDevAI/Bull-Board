// Shared types/schemas/constants - expanded in PR-02
export const TASK_STATUSES = [
  "plan",
  "pending",
  "in_progress",
  "review",
  "testing",
  "done",
  "failed",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
