# PR-02：bb.service 托管 dashboard（去 nginx，单端口 6666）

## 目标

- control（Fastify）直接托管 dashboard 静态资源，无需 nginx
- 单端口 6666：`/` 为 SPA，`/api/*` 为 API，`/api/events` 为 SSE
- SPA fallback：非 `/api` 的 GET 返回 index.html

## 修改文件清单

- `apps/control/package.json`：依赖 `@fastify/static@7`（兼容 Fastify 4）
- `apps/control/src/index.ts`：
  - 默认端口改为 6666
  - 新增 `/api/health` 与保留 `/health`
  - 使用 `STATIC_DIR` / `DASHBOARD_DIST` 或相对路径 `../../dashboard/dist` 解析 dashboard 构建目录
  - 注册 `@fastify/static` 托管该目录，`setNotFoundHandler` 对非 GET 或非 `/api` 的 404 返回 index.html

## 验证步骤（可复制运行）

```bash
cd /path/to/bull-borad

# 1. 构建
pnpm run build
# 预期：control + dashboard 均构建成功

# 2. 启动 control（默认 6666）
PORT=6666 node apps/control/dist/index.js &
sleep 2

# 3. API 健康检查
curl -s http://localhost:6666/api/health
# 预期：{"ok":true,"service":"bb"}

# 4. 根路径返回 SPA
curl -s -o /dev/null -w "%{http_code}" http://localhost:6666/
# 预期：200
curl -s http://localhost:6666/ | head -3
# 预期：<!DOCTYPE html> ...

# 5. 停止
pkill -f "node apps/control/dist/index.js"
```

## 预期输出

- `curl http://localhost:6666/api/health` → `{"ok":true,"service":"bb"}`
- `curl -s -w "%{http_code}" http://localhost:6666/` → `200`，且 body 为 dashboard 的 index.html
- 浏览器打开 `http://localhost:6666/` 可看到 dashboard

## 备注

- API 已统一为 `/api` 前缀；SSE 为 `/api/events`。未启用 compression，无需对 SSE 做额外配置。
