# PR-03: Orchestrator + 入队/出队 + 状态机 + SSE

## 修改文件清单

- `apps/api/src/sse.ts` - SSE 订阅者集合与 broadcast(event, data)
- `apps/api/src/orchestrator.ts` - enqueue()、applyReport()，状态机：VERIFY 成功→done；code/test 失败→fix_round++、in_progress、system message；infra→failed
- `apps/api/src/routes/events.ts` - 注册时 addSubscriber(reply.raw)，便于广播
- `apps/api/src/routes/runner.ts` - POST /api/runner/report（Runner 回调）
- `apps/api/src/routes/tasks.ts` - POST /api/tasks/:id/enqueue（mode + payload）
- `apps/api/src/index.ts` - 注册 runnerRoutes

## 启动命令

同 PR-02：`pnpm build:api` 后 `SQLITE_PATH=./data/bullboard.db node apps/api/dist/index.js`（从仓库根）。

## 验证步骤

1. 创建 workspace 与 task（同 PR-02）。
2. **入队**：  
   `curl -s -X POST http://localhost:3000/api/tasks/<task_id>/enqueue -H "Content-Type: application/json" -d '{"mode":"VERIFY","payload":{"workspace":{"repo_path":"/tmp/repo","base_branch":"main"},"branch":"bb/task-1","verify":{"commands":["echo ok"],"timeout_sec":60}}}'`  
   → 201，返回 `{ "runId", "jobId" }`；GET /api/tasks/:id/runs 可见新 run status=queued。
3. **Runner 回调**（模拟）：  
   `curl -s -X POST http://localhost:3000/api/runner/report -H "Content-Type: application/json" -d '{"run_id":"<run_id>","status":"succeeded","summary":"ok"}'`  
   → 200；GET /api/tasks/:id 中 task.status=done。
4. **SSE 广播**：先 `curl -s -N http://localhost:3000/api/events` 保持连接，再在另一终端执行步骤 2 或 3，应收到 `event: run_status_changed` / `event: task_status_changed`。
