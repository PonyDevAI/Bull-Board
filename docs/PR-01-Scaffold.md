# PR-01: Scaffold + 文档

## 修改文件清单

- `package.json` - 根 package：scripts 增加 `dev`，移除 infra 相关
- `pnpm-workspace.yaml` - monorepo 工作区（已有）
- `.gitignore` - 增加 `data/*.db`、`!data/.gitkeep`
- `data/.gitkeep` - 占位，SQLite 文件目录
- `README.md` - 技术栈、目录结构、启动命令、验证步骤
- `docs/PLAN.md` - 补充 Runner 回调说明（已有完整方案）
- `apps/api/package.json` - 仅 Fastify 依赖，移除 Prisma
- `apps/api/src/index.ts` - 仅注册 `GET /health`
- 删除：`apps/api/src/db.ts`、`apps/api/src/routes/*.ts`、`apps/api/prisma/schema.prisma`

（Web 与 packages/shared、artifacts 已在既有 scaffold 中，本 PR 未改。）

## 启动命令

```bash
pnpm install
pnpm dev:api   # 终端 1
pnpm dev:web   # 终端 2
# 或：pnpm dev（API 后台 + Web 前台）
```

## 验证步骤

1. **API**：`curl -s http://localhost:3000/health` → `{"ok":true,"service":"bull-board-api"}`
2. **Web**：打开 http://localhost:5173，看到 Bull Board 欢迎页。
