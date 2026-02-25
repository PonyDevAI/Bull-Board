# Bull Board

Web 看板控制台 v0.1：管理改代码任务，通过 SQLite 队列表派发给 Go 执行器（runner）执行。无 Postgres/Redis 依赖。

## 对外命名（部署与文档统一）

| 对外名称 | 说明 | 源码目录 |
|----------|------|----------|
| **dashboard** | 前端（Vite + React + Tailwind + shadcn/ui） | `apps/web` |
| **control** | Control Plane（Fastify API + 状态机 + SQLite + SSE） | `apps/api` |
| **runner** | Go 执行器（领 job、git worktree、artifacts、回调 control） | `apps/runner-go` |

部署工件与文档一律使用 **dashboard / control / runner**；源码目录可保持 `apps/api`、`apps/web`、`apps/runner-go` 不变。

## 技术栈

- **Control**: Fastify + TypeScript + SQLite + SSE
- **队列**: SQLite `jobs` 表（原子领取 + 租约锁）
- **Runner**: Go 常驻进程，从 SQLite 领任务并执行（git worktree + artifacts）
- **Dashboard**: Vite + React + TypeScript + TailwindCSS + shadcn/ui

## 目录结构

```
bull-board/
  apps/api/          # Control Plane 源码（对外名 control）
  apps/web/          # Dashboard 源码（对外名 dashboard）
  apps/runner-go/    # Runner 源码（对外名 runner）
  packages/shared/   # 共享类型/常量
  docs/PLAN.md       # 方案文档
  data/              # SQLite 文件目录（bullboard.db）
  artifacts/         # Runner 产出（diff/log/report）
```

## 启动命令（PR-01）

```bash
# 安装依赖
pnpm install

# 启动 control（终端 1）
pnpm dev:api

# 启动 dashboard（终端 2）
pnpm dev:web
```

或一次启动两者（后台 + 前台）：`pnpm dev`（control 后台，dashboard 前台）。

## 验证步骤（PR-01）

1. **Control 健康检查**  
   `curl -s http://localhost:3000/health`  
   期望：`{"ok":true,"service":"bull-board-api"}`

2. **Dashboard**  
   浏览器打开 http://localhost:5173，应看到 Bull Board 欢迎页。

## 端到端验证（v0.1 闭环）

1. 启动 control（从仓库根）：`SQLITE_PATH=./data/bullboard.db node apps/api/dist/index.js`
2. 启动 dashboard：`pnpm dev:web`
3. 可选启动 runner：`cd apps/runner-go && go build -o runner && SQLITE_PATH=../../data/bullboard.db API_BASE_URL=http://localhost:3000 ./runner`
4. Dashboard：Workspaces → 新增（repo_path 为本地 git 仓库）→ 看板 → 新建 Task → 入队 VERIFY（或 curl POST /api/tasks/:id/enqueue）→ runner 执行后 task 变为 Done → 详情页点击 Submit 完成闭环。

## 方案详情

见 [docs/PLAN.md](docs/PLAN.md)。各 PR 说明见 [docs/PR-01-Scaffold.md](docs/PR-01-Scaffold.md) ～ [docs/PR-06-Actions.md](docs/PR-06-Actions.md)。
