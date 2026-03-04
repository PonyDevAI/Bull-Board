import { z } from "zod";

export const taskStatusEnum = z.enum([
  "plan", "pending", "in_progress", "review", "testing", "done", "failed"
]);
export const submitStateEnum = z.enum(["not_submitted", "committed", "pushed", "pr_opened"]);
export const messageRoundTypeEnum = z.enum(["plan", "fix"]);
export const messageAuthorEnum = z.enum(["user", "system", "agent"]);

export const createWorkspaceSchema = z.object({
  name: z.string().min(1),
  repoPath: z.string().min(1),
  defaultBranch: z.string().optional().default("main"),
});
export type CreateWorkspaceBody = z.infer<typeof createWorkspaceSchema>;

export const createTaskSchema = z.object({
  workspaceId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional().default(""),
});
export type CreateTaskBody = z.infer<typeof createTaskSchema>;

export const updateTaskStatusSchema = z.object({ status: taskStatusEnum });
export type UpdateTaskStatusBody = z.infer<typeof updateTaskStatusSchema>;

export const createMessageSchema = z.object({
  roundType: messageRoundTypeEnum,
  roundNo: z.number().int().min(0),
  author: messageAuthorEnum,
  content: z.string(),
});
export type CreateMessageBody = z.infer<typeof createMessageSchema>;
