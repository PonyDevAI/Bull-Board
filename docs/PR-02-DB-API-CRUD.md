# PR-02: DB + API CRUD + SSE stub

## 修改文件清单

- `apps/api/package.json` - 增加 @prisma/client、prisma，build 含 prisma generate，脚本 db:generate/db:push/db:migrate
- `apps/api/.env.example` - DATABASE_URL、PORT 示例
- `apps/api/prisma/schema.prisma` - Workspace / Task / Step / Run / Artifact / Message 及枚举
- `apps/api/src/db.ts` - PrismaClient 单例
- `apps/api/src/routes/workspaces.ts` - GET/POST /api/workspaces，GET/PATCH/DELETE /api/workspaces/:id
- `apps/api/src/routes/tasks.ts` - GET/POST /api/tasks，GET/PATCH /api/tasks/:id，POST /api/tasks/:id/status，GET/POST /api/tasks/:id/messages，GET /api/tasks/:id/runs
- `apps/api/src/routes/runs.ts` - GET /api/runs/:run_id/artifacts，GET /api/artifacts/:id/download
- `apps/api/src/routes/events.ts` - GET /api/events（SSE，当前仅心跳）
- `apps/api/src/index.ts` - 注册上述路由

## 启动命令

```bash
# 1. 基础设施
pnpm infra:up
# 等待 postgres/redis 就绪后：

# 2. 同步数据库（在 apps/api 目录或设置 DATABASE_URL）
cd apps/api && cp .env.example .env  # 按需修改
pnpm db:push

# 3. API
pnpm dev:api   # 或 cd apps/api && pnpm run build && node dist/index.js

# 4. Web（可选）
pnpm dev:web
```

## 验证步骤

1. **健康检查**：`curl -s http://localhost:3000/health` → `{"ok":true,"service":"bull-board-api"}`
2. **Workspace CRUD**：
   - `curl -s -X POST http://localhost:3000/api/workspaces -H "Content-Type: application/json" -d '{"name":"demo","repoPath":"/tmp/repo"}'` → 201 + workspace
   - `curl -s http://localhost:3000/api/workspaces` → 列表含 demo
3. **Task CRUD**：用上一步返回的 workspace id 创建 task：`curl -s -X POST http://localhost:3000/api/tasks -H "Content-Type: application/json" -d '{"workspaceId":"<id>","title":"Test"}'` → 201
   - `curl -s http://localhost:3000/api/tasks` → 列表含该 task
4. **SSE**：`curl -s -N http://localhost:3000/api/events` → 约 15s 收到 `: heartbeat` 注释行。
