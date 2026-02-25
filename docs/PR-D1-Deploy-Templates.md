# PR-D1: DEPLOY.md + templates + docker compose/Dockerfiles

## 修改文件清单（对外命名：dashboard / control / runner）

- **docs/DEPLOY.md** - 部署指南：Tier1/Tier2、install.sh 用法、shared 目录、指定版本/仅 control 或 worker 示例、SSE/权限/SQLite WAL 常见问题；对外名称 dashboard/control/runner
- **infra/deploy/templates/systemd/bullboard-control.service.tpl** - Control Plane systemd unit（WorkingDirectory/EnvironmentFile/ExecStart）
- **infra/deploy/templates/systemd/bullboard-runner.service.tpl** - Runner systemd unit
- **infra/deploy/templates/nginx/bullboard.conf.tpl** - nginx 反代（upstream **control_backend**，占位 `{{CONTROL_UPSTREAM}}`），含 **SSE（proxy_buffering off）**
- **infra/deploy/templates/env/bullboard.env.example** - 共享配置示例（Control / Runner 段）
- **infra/docker/docker-compose.yml** - services：**control**、**dashboard**、**runner**；profiles：**control**（dashboard+control）、**worker**（runner）；镜像 bullboard-control、bullboard-dashboard、bullboard-runner
- **infra/docker/Dockerfile.control** - Node 多阶段构建，产出 Control 镜像（源码 apps/api）
- **infra/docker/Dockerfile.dashboard** - Node 构建静态 + nginx 反代 /api 到 control（源码 apps/web）
- **infra/docker/Dockerfile.runner** - Go 多阶段构建，alpine + git，产出 Runner 镜像（源码 apps/runner-go）

## 验证步骤（本地）

1. **模板与文档**
   - 检查 `docs/DEPLOY.md` 存在且包含 Tier1/Tier2、install 示例、shared 说明、常见问题；对外名称均为 dashboard/control/runner
   - 检查 `infra/deploy/templates/systemd/` 下 **bullboard-control.service.tpl**、**bullboard-runner.service.tpl** 存在；nginx 模板中 upstream 为 **control_backend**，占位为 `{{CONTROL_UPSTREAM}}`、`{{WEB_ROOT}}`

2. **Docker 构建（需在仓库根执行）**
   - Control：`docker build -f infra/docker/Dockerfile.control -t bullboard-control:local .`
   - Dashboard：`docker build -f infra/docker/Dockerfile.dashboard -t bullboard-dashboard:local .`
   - Runner：`docker build -f infra/docker/Dockerfile.runner -t bullboard-runner:local .`
   - 三次构建均成功即通过

3. **Docker Compose（仅 control，最小验证）**
   - 在仓库根执行：`docker compose -f infra/docker/docker-compose.yml --profile control build`
   - 再执行：`docker compose -f infra/docker/docker-compose.yml --profile control up -d`
   - 访问 `http://localhost:8080`（DASHBOARD_PORT）应看到前端；`http://localhost:8080/health` 或 control 端口 3000 应返回健康检查

## 验证步骤（local 模式，若已实现 install.sh）

- 执行 `./infra/deploy/install.sh install --component control` 后，能启动 control + dashboard；`status` 显示 bullboard-control、nginx 正常；浏览器访问 dashboard 并调通 control API。

## 后续 PR 待办

- **PR-D2**：实现 `infra/deploy/install.sh`（install/upgrade/uninstall/status/version；local + docker；组件 control|worker|all；校验 SHA256SUMS；渲染模板与 .env；对外名称 dashboard/control/runner）
- **PR-D3**：GitHub Actions（tag v*.*.* → release assets：**bullboard-control-linux-amd64-vX.Y.Z.tar.gz**（含 control+dashboard）、**bullboard-worker-linux-amd64-vX.Y.Z.tar.gz**（runner）、**SHA256SUMS**；构建并 push Docker 镜像 bullboard-control、bullboard-dashboard、bullboard-runner 到 GHCR，tag 版本 + latest）
