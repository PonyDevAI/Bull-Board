# Dashboard 与 Control 连接说明

Dashboard（前端）通过 HTTP 请求和 SSE 连接 Control（后端）的 `/api` 接口。

## 1. 接口约定

- **Control** 默认端口 **6666**，提供：
  - `GET/POST /api/workspaces`、`GET /api/workspaces/:id`
  - `GET/POST /api/tasks`、`GET/POST /api/tasks/:id`、`/api/tasks/:id/status|messages|runs|enqueue`、`/api/tasks/:id/actions/*`
  - `GET /api/runs/:run_id/artifacts`、`GET /api/artifacts/:id/download`
  - `GET /api/events`（SSE）
  - `GET /api/health`
- **Dashboard** 的 `src/api.ts` 和 `useSSE.ts` 会请求上述路径。

## 2. 开发环境（本地联调）

1. 先启动 **Control**（提供 API）：
   ```bash
   cd apps/control && pnpm dev
   # 监听 http://localhost:6666
   ```
2. 再启动 **Dashboard**（Vite 会做代理）：
   ```bash
   cd apps/dashboard && pnpm dev
   # 打开 http://localhost:5173
   ```
3. Vite 配置（`apps/dashboard/vite.config.ts`）中已把 `/api` 和 `/api/events` 代理到 `http://localhost:6666`，因此页面里的请求会发到 Control，**无需改代码**。

## 3. 生产环境（同源部署，推荐）

- 使用 **Control 托管 Dashboard 静态资源**：
  1. 构建：`cd apps/dashboard && pnpm build`
  2. 启动 Control 时指定静态目录：
     ```bash
     STATIC_DIR=../dashboard/dist pnpm start
     # 或
     DASHBOARD_DIST=/path/to/dashboard/dist pnpm start
     ```
  3. 同一端口（默认 6666）既提供 `/api`，又提供前端页面；Dashboard 请求 `/api` 为同源，无需配置。

## 4. 生产环境（前后端分离 / 跨域）

- 若 Dashboard 和 Control **不同域**（例如前端在 CDN，API 在 `https://api.example.com`）：
  1. 构建时指定 Control 的基址（无末尾斜杠）：
     ```bash
     cd apps/dashboard
     VITE_API_BASE=https://api.example.com pnpm build
     ```
  2. 打包后所有请求会发往 `https://api.example.com/api/...`，SSE 会连 `https://api.example.com/api/events`。
  3. Control 需配置 CORS 允许该前端域名（若尚未配置）。

## 5. 小结

| 场景           | 做法 |
|----------------|------|
| 本地开发       | 先起 control:6666，再起 dashboard；Vite 代理 `/api` → control |
| 生产同源       | Control 用 `STATIC_DIR` / `DASHBOARD_DIST` 托管 dashboard dist，同端口 |
| 生产跨域       | 构建时设 `VITE_API_BASE=https://control 的地址`，Control 开 CORS |
