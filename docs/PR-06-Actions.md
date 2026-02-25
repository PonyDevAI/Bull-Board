# PR-06: Actions 闭环

## 修改文件清单

- `apps/control/src/routes/actions.ts` - POST /api/tasks/:id/actions/submit、replan、retry、continue-fix
- `apps/control/src/index.ts` - 注册 actionsRoutes
- `apps/dashboard/src/api.ts` - actionSubmit、actionReplan、actionRetry、actionContinueFix
- `apps/dashboard/src/pages/TaskDetail.tsx` - Done/Failed 时展示 Actions 按钮并调用上述 API

## 启动命令

同前：API + Web（+ 可选 Runner）。

## 验证步骤（Happy Path）

1. **创建 workspace**：Web → Workspaces → 新增（name + repo_path 指向本地一个 git 仓库）。
2. **创建 task**：看板 → 新建 Task → 选 workspace、填标题 → 创建。
3. **入队 VERIFY**：  
   `curl -s -X POST http://localhost:3000/api/tasks/<task_id>/enqueue -H "Content-Type: application/json" -d '{"mode":"VERIFY","payload":{"workspace":{"repo_path":"<repo_path>","base_branch":"main"},"branch":"bb/task-<task_id>-r1","verify":{"commands":["echo ok"],"timeout_sec":60}}}'`  
   或在后续用 Runner 自动领 job。
4. **Runner 执行**：启动 Runner（SQLITE_PATH/ARTIFACTS_DIR/API_BASE_URL 正确），Runner 领 job、执行、回调 report → task 变为 done。
5. **Done → Submit**：Web 打开该 task 详情，点击 **Submit** → 创建 SUBMIT run 并入队；Runner 执行 commit+push。
6. **Failed → Retry / Continue Fix / Re-plan**：将 task 手动改为 failed 或通过 report 置为 failed，在详情页点击 **Retry**（重跑 last run）、**Continue Fix**（fix_round++、回 in_progress）、**Re-plan**（plan_round++、回 plan）。

## 端到端闭环

创建 workspace/task → 入队 VERIFY → Runner 执行 → Done → Submit（commit/push）→ 完成 v0.1 闭环。
