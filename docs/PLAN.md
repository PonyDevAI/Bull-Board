# Bull Board — v0.1 方案文档（SQLite + SQLite Queue + Go Runner）

## 0. 目标
在单台开发服务器上提供一个 Web 控制台（看板），管理“改代码任务”，并把任务派发给 Go Runner 执行。所有数据与队列都本地化，不依赖 Postgres/Redis。

看板流程固定：
Plan/Draft → Pending → In Progress → Review → Testing → Done/Failed

Done/Failed 后通过 Actions 完成闭环：
- Done：Submit（commit/push）、Re-plan、Continue improvement
- Failed：Retry、Continue Fix、Re-plan

## 1. 组件
1) Console API（Fastify + TS）
- 任务/运行/产物/消息 API
- 状态机与编排 Orchestrator
- SQLite：作为唯一数据库（同时存队列表 jobs）
- SSE：推送 task/run 状态变更给前端（EventSource）

2) SQLite（单文件 DB）
- 系统事实源：workspaces/tasks/runs/artifacts/messages/actions
- 队列：jobs 表（替代 Redis 队列/Streams）

3) Go Runner（常驻二进制）
- 从 SQLite jobs 表“领取 job”（原子加锁/租约）
- 执行 job：CODE_CHANGE（v0.1 只做 apply_patch）、VERIFY（Testing）、SUBMIT（commit/push）
- 保存 artifacts（diff/log/report）到本地目录
- 写回 runs 与 jobs 状态；可选调用 API 回调 `POST /api/runner/report` 上报结果，API 据此推送 SSE

4) Web Console（Vite + React + TS + Tailwind + shadcn/ui）
- Workspace selector
- Kanban board
- Task detail：Messages/Runs/Artifacts/Actions
- SSE 订阅状态事件

---

## 2. SQLite 队列（jobs 表）设计

### 2.1 jobs 表字段（v0.1）
- id (uuid)              # job_id
- run_id (uuid)
- task_id (uuid)
- workspace_id (uuid)
- mode (text)            # CODE_CHANGE | VERIFY | SUBMIT
- payload_json (text)    # JSON string
- status (text)          # queued | running | succeeded | failed
- priority (int default 0)
- available_at (datetime)  # 支持 delay/backoff
- attempts (int default 0)
- max_attempts (int default 3)
- locked_by (text nullable)  # runner_id
- locked_until (datetime nullable) # 租约超时
- last_error (text nullable)
- created_at (datetime)
- updated_at (datetime)

### 2.2 领取 job 的原子流程（Go Runner）
关键原则：单机多进程下也要避免重复领取同一个 job。

建议使用事务 + BEGIN IMMEDIATE（拿写锁）：
1) BEGIN IMMEDIATE;
2) SELECT id FROM jobs
   WHERE status='queued'
     AND available_at <= now
     AND (locked_until IS NULL OR locked_until < now)
   ORDER BY priority DESC, created_at ASC
   LIMIT 1;
3) UPDATE jobs
   SET status='running',
       locked_by=?,
       locked_until=now+lease_seconds,
       attempts=attempts+1,
       updated_at=now
   WHERE id=?;
4) COMMIT;

执行完成后：
- runs 表写入 status/succeeded/failed、artifacts
- jobs 表更新 status、locked_until=NULL、last_error（失败时写）

### 2.3 重试/backoff（v0.1）
- 如果 job 执行失败且 attempts < max_attempts：
  - status 置回 queued
  - available_at = now + backoff_seconds（例如 30s * attempts）
  - last_error 写入
- 如果超过 max_attempts：
  - status=failed

---

## 3. 业务状态机规则
- VERIFY 失败若属于代码/测试失败：
  - 不进入 Failed
  - task.fix_round += 1
  - task.status = In Progress
  - 写 system message（Fix Round #N）记录失败摘要与日志路径
- infra/权限/依赖等阻塞类错误：
  - task.status = Failed（可写 blocked reason）

Done/Failed Actions（手动触发）：
- Done：
  - Submit：enqueue SUBMIT job（commit/push）
  - Re-plan：plan_round += 1，status=Plan/Draft
  - Continue：status=In Progress
- Failed：
  - Retry：对 last run 创建新 run + enqueue 相同 job
  - Continue Fix：fix_round += 1，status=In Progress，并写 system message
  - Re-plan：plan_round += 1，status=Plan/Draft

---

## 4. Runner Payload（v0.1）

### CODE_CHANGE（apply_patch）
{
  "workspace": { "repo_path": "/srv/repos/myrepo", "base_branch": "main" },
  "workdir_strategy": "git_worktree",
  "branch": "bb/task-<task_id>-r<run_id>",
  "code_change": { "type": "apply_patch", "patch": "diff --git ..." }
}

### VERIFY（Testing）
{
  "workspace": { "repo_path": "/srv/repos/myrepo", "base_branch": "main" },
  "workdir_strategy": "git_worktree",
  "branch": "bb/task-<task_id>-r<run_id>",
  "verify": { "commands": ["pnpm lint","pnpm test","pnpm build"], "timeout_sec": 1800 }
}

### SUBMIT（commit/push）
{
  "workspace": { "repo_path": "/srv/repos/myrepo", "base_branch": "main" },
  "workdir_strategy": "git_worktree",
  "branch": "bb/task-<task_id>-r<run_id>",
  "submit": { "actions": ["commit","push"], "commit_message": "BullBoard: <title>", "remote": "origin" }
}

---

## 5. Console API（Fastify）接口（v0.1）
Workspace:
- GET /api/workspaces
- POST /api/workspaces

Tasks:
- GET /api/tasks?workspace_id=&status=
- POST /api/tasks
- GET /api/tasks/:id
- POST /api/tasks/:id/status
- GET /api/tasks/:id/messages
- POST /api/tasks/:id/messages

Runs/Artifacts:
- GET /api/tasks/:id/runs
- GET /api/runs/:run_id/artifacts
- GET /api/artifacts/:id/download

Actions:
- POST /api/tasks/:id/actions/submit
- POST /api/tasks/:id/actions/replan
- POST /api/tasks/:id/actions/retry
- POST /api/tasks/:id/actions/continue-fix

SSE:
- GET /api/events （推送 task_status_changed / run_status_changed）

---

## 6. 目录结构
bull-board/
  apps/
    api/
    web/
    runner-go/
  packages/
    shared/
  docs/
    PLAN.md
  artifacts/           # 默认 artifacts 落盘目录
  data/
    bullboard.db       # SQLite DB 文件（可配置）