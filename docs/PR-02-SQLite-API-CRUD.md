# PR-02: SQLite Schema + API CRUD

## 修改文件清单

- `apps/control/package.json` - 增加 better-sqlite3、zod、@types/better-sqlite3
- `apps/control/migrations/001_initial.sql` - 建表 workspaces/tasks/runs/artifacts/messages/jobs + 索引
- `apps/control/src/db.ts` - 打开 SQLite、启动时执行 migrations 目录下 SQL
- `apps/control/src/schemas.ts` - zod 校验：createWorkspaceSchema、createTaskSchema、updateTaskStatusSchema、createMessageSchema
- `apps/control/src/routes/workspaces.ts` - GET/POST /api/workspaces，GET /api/workspaces/:id
- `apps/control/src/routes/tasks.ts` - GET/POST /api/tasks，GET /api/tasks/:id，POST /api/tasks/:id/status，GET/POST /api/tasks/:id/messages，GET /api/tasks/:id/runs
- `apps/control/src/routes/runs.ts` - GET /api/runs/:run_id/artifacts，GET /api/artifacts/:id/download
- `apps/control/src/routes/events.ts` - GET /api/events（SSE 心跳）
- `apps/control/src/index.ts` - 注册上述路由

## 启动命令

```bash
# 从仓库根目录（推荐，DB 使用 data/bullboard.db）
cd bull-board
pnpm install
pnpm build:control
SQLITE_PATH=./data/bullboard.db node apps/control/dist/index.js

# 或从 apps/control 目录（DB 为 apps/control/data/bullboard.db）
cd apps/control && pnpm run build && node dist/index.js
```

## 验证步骤

1. **健康检查（Control）**：`curl -s http://localhost:3000/health` → `{"ok":true,"service":"bull-board-control"}`
2. **Workspace**：  
   `curl -s -X POST http://localhost:3000/api/workspaces -H "Content-Type: application/json" -d '{"name":"demo","repoPath":"/tmp/repo"}'` → 201 + body  
   `curl -s http://localhost:3000/api/workspaces` → 列表含 demo
3. **Task**：用返回的 workspace id 创建 task：  
   `curl -s -X POST http://localhost:3000/api/tasks -H "Content-Type: application/json" -d '{"workspaceId":"<id>","title":"Test"}'` → 201  
   `curl -s http://localhost:3000/api/tasks` → 列表含该 task
4. **SSE**：`curl -s -N http://localhost:3000/api/events` → 约 15s 收到 `: heartbeat`
