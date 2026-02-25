# PR-05: Web Console（看板 + 详情 + SSE）

## 修改文件清单

- `apps/dashboard/package.json` - 增加 react-router-dom
- `apps/dashboard/src/App.tsx` - Router、导航、Routes（/、/workspaces、/board、/tasks/:id）
- `apps/dashboard/src/main.tsx` - BrowserRouter 包裹
- `apps/dashboard/src/api.ts` - getWorkspaces/createWorkspace、getTasks/createTask、getTask、updateTaskStatus、getTaskMessages、getTaskRuns、artifactDownloadUrl、enqueueTask
- `apps/dashboard/src/useSSE.ts` - EventSource 订阅 /api/events，监听 task_status_changed / run_status_changed 触发回调
- `apps/dashboard/src/pages/Workspaces.tsx` - 列表 + 新增 Dialog（name、repo_path）
- `apps/dashboard/src/pages/Board.tsx` - 按状态列展示 tasks，新建 Task 表单，SSE 刷新
- `apps/dashboard/src/pages/TaskDetail.tsx` - 状态切换按钮、Tabs（Messages/Runs/Artifacts）、Actions 占位
- `apps/dashboard/src/components/ui/button.tsx` - 增加 ghost variant

## 启动命令

```bash
pnpm dev:control   # 终端 1
pnpm dev:dashboard   # 终端 2
```

## 验证步骤

1. 打开 http://localhost:5173，进入 Workspaces，新增一个 workspace（name + repo_path）。
2. 进入看板，点击「新建 Task」，选择 workspace 并输入标题，创建后在看板各列中看到 task（按 status）。
3. 点击某 task 进入详情，切换状态、查看 Messages/Runs/Artifacts。
4. 开两个浏览器标签：一标签打开看板，另一标签用 API 或 Runner 触发 task/run 状态变化，确认第一标签通过 SSE 自动刷新。
