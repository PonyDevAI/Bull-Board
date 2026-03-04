# 迁移说明：control 已完全移除，改用 console

**重要**：自本版本起，**control** 与 **bullboard-control** 已完全移除，不再提供任何兼容（无旧二进制名、无旧镜像 tag、无旧 compose 服务名、无旧 systemd service、无旧 CLI 命令）。若你此前使用 control，请按下列映射与步骤切换到 **console**。

---

## 旧名 → 新名映射

| 类型 | 旧名 | 新名 |
|------|------|------|
| Go 包/目录 | internal/control | internal/console |
| Node 应用目录 | apps/control | apps/console |
| Node 包名 | @bullboard/control | @bullboard/console |
| Docker 镜像 | bullboard-control | bullboard-console |
| Dockerfile | infra/docker/Dockerfile.control | infra/docker/Dockerfile.console |
| Compose 服务名 | control | console |
| 容器名 | bullboard-control | bullboard-console |
| 环境变量 | CONTROL_PORT | CONSOLE_PORT |
| systemd unit 文件 | bullboard-control.service.tpl | bullboard-console.service.tpl |
| systemd 工作目录 | {{PREFIX}}/current/control | {{PREFIX}}/current/console |
| nginx upstream 名 | control_backend | console_backend |
| nginx 模板变量 | {{CONTROL_UPSTREAM}} | {{CONSOLE_UPSTREAM}} |
| CLI 子命令参数 | bb logs/restart control | bb logs/restart console |
| 前端 unit 标识 | unit=control | unit=console |
| 日志/SyslogIdentifier | bullboard-control | bullboard-console |
| pnpm scripts | dev:control, build:control | dev:console, build:console |
| install.sh / bb 脚本组件名 | control | console |

**API 路径**：当前后端仅使用 `/api/*`，无 `/control` 路径，无需改动。若未来有 `/control` 路径则一律改为 `/console`。

---

## 升级步骤

### 1. 二进制 / 本地安装

- 使用新版本 all 包或从源码构建后，直接使用 **bb** 与 **bb-runner**（二进制名未变）；CLI 中将原 `control` 参数改为 `console`：
  - `bb logs console`、`bb restart console`
- 若使用 install.sh：`--component console`（或 `all`）。

### 2. Docker / Compose

- 镜像：拉取/构建 **bullboard-console**，不再使用 bullboard-control。
- Compose：服务名改为 **console**，环境变量 `CONSOLE_PORT`（原 CONTROL_PORT）；runner 的 `API_BASE_URL` 指向 `http://console:3000`。
- 启动：`docker compose --profile console --profile worker up -d`。

### 3. Systemd

- 若曾使用 **bullboard-control.service**：改为使用 **bb.service**（Go 版 Console）或 **bullboard-console.service**（Node 版模板已更名为 bullboard-console.service.tpl）；工作目录为 `{{PREFIX}}/current/console`。

### 4. Nginx 反代

- 将模板中 `control_backend`、`{{CONTROL_UPSTREAM}}` 改为 **console_backend**、**{{CONSOLE_UPSTREAM}}**，并替换为 console 服务地址（如 127.0.0.1:3000）。

### 5. 前端 / 开发

- 脚本：`pnpm dev:console`、`pnpm build:console`（不再使用 dev:control/build:control）。
- 日志/设置页：请求参数 `unit=console`（原 unit=control）。
- 环境变量：若曾用 `VITE_API_BASE` 指向「control 的地址」，改为指向 **console 的地址**。

---

## 不回退、无兼容

- 不保留旧二进制名、旧镜像 tag、旧 compose 服务名、旧 systemd unit、旧 CLI 子命令。
- 迁移后仅使用 **console** 作为控制台服务名与部署产物名。若有问题请参考 docs/DEPLOY.md、docs/NAMING.md、docs/ARCHITECTURE.md。
