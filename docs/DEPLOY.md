# Bull Board 部署指南

本文档说明 Bull Board 的两种部署模式：**Tier 1（local）** 与 **Tier 2（docker）**，以及统一安装脚本的用法。

---

## 部署模式概览

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| **Tier 1（local）** | systemd + nginx/caddy + 共享数据目录，推荐默认 | 单机直装、易排障、资源占用小 |
| **Tier 2（docker）** | docker compose（control / worker / all） | 容器化、多环境一致、可选编排 |

---

## 统一入口脚本

所有安装/升级/卸载均通过 **`infra/deploy/install.sh`** 完成（PR-D2 实现）。

```bash
./infra/deploy/install.sh <subcommand> [options]
```

- **subcommand**：`install` | `upgrade` | `uninstall` | `status` | `version`
- **options**（示例）：
  - `--mode local|docker`（默认 `local`）
  - `--component control|worker|all`（默认 `all`）
  - `--version latest|vX.Y.Z`（默认 `latest`）
  - `--prefix <dir>`（默认 `/opt/bull-board`）
  - `uninstall` 时：`--purge-data` 才会删除 shared 数据
  - **`--from-repo`**（仅 install/upgrade）：从当前仓库构建目录安装，不下载 release；需先执行 `pnpm build:api`、构建 web 与 runner，适合本地/开发验证

---

## Tier 1：Local 部署（systemd + nginx）

### 目录与数据（shared，必须持久化）

安装脚本会创建并保持以下目录（升级/重装不删除）：

- `$PREFIX/shared/data`：SQLite 数据库文件（如 `bullboard.db`）
- `$PREFIX/shared/artifacts`：Runner 产出（diff/log/report）
- `$PREFIX/shared/worktrees`：git worktree 工作目录
- `$PREFIX/shared/config`：配置（如 `.env`）

**任何升级不得破坏上述目录内容，需跨版本保留。**

### 安装（示例）

```bash
# 默认：local 模式、最新版本、全部组件、前缀 /opt/bull-board
./infra/deploy/install.sh install

# 指定版本
./infra/deploy/install.sh install --version v0.1.0

# 仅安装 control（Control Plane + Dashboard）
./infra/deploy/install.sh install --component control

# 仅安装 worker（Runner 执行器）
./infra/deploy/install.sh install --component worker

# 自定义前缀
./infra/deploy/install.sh install --prefix /opt/bull-board

# 从当前仓库安装（无需 release，先 pnpm build:api 并构建 web、runner）
./infra/deploy/install.sh install --from-repo --prefix /opt/bull-board
```

### 升级

```bash
./infra/deploy/install.sh upgrade
./infra/deploy/install.sh upgrade --version v0.2.0
./infra/deploy/install.sh upgrade --component control
```

### 卸载

```bash
# 仅卸载服务与配置，保留 shared 数据
./infra/deploy/install.sh uninstall

# 同时删除 shared 数据（慎用）
./infra/deploy/install.sh uninstall --purge-data
```

### 状态与版本

```bash
./infra/deploy/install.sh status
./infra/deploy/install.sh version
```

### 配置

首次安装后，若 `$PREFIX/shared/config/.env` 不存在，脚本会从模板写入并提示编辑。需根据实际环境设置：

- Control：`PORT`、`SQLITE_PATH`（指向 shared/data 下 DB）
- Runner：`SQLITE_PATH`、`ARTIFACTS_DIR`、`API_BASE_URL`、`RUNNER_ID` 等

---

## Tier 2：Docker 部署

### 组件与 profiles

- **control**：Control Plane + Dashboard（control 服务 + 前端；dashboard 由 nginx 提供静态并反代 /api 到 control）
- **worker**：Runner（Go 执行器）
- **all**：control + worker

```bash
# 仅启动 control（control + dashboard）
./infra/deploy/install.sh install --mode docker --component control

# 仅启动 worker
./infra/deploy/install.sh install --mode docker --component worker

# 全部
./infra/deploy/install.sh install --mode docker --component all
```

### 安装（示例）

```bash
./infra/deploy/install.sh install --mode docker
./infra/deploy/install.sh install --mode docker --version v0.1.0
./infra/deploy/install.sh install --mode docker --component control --prefix /opt/bull-board
```

### 升级与卸载

```bash
./infra/deploy/install.sh upgrade --mode docker
./infra/deploy/install.sh uninstall --mode docker
./infra/deploy/install.sh uninstall --mode docker --purge-data
```

### Shared 数据在 Docker 下的挂载

脚本会将 `$PREFIX/shared/data`、`$PREFIX/shared/artifacts`、`$PREFIX/shared/worktrees`、`$PREFIX/shared/config` 挂载到对应容器内，保证与 local 模式一致的数据持久化。

### Docker Worker 工具链说明

- **默认镜像**：包含 Go Runner 二进制 + **git**（用于 `git worktree`）。不包含 Node/pnpm（仅 Runner 需访问 repo）。
- **自定义镜像**：若需在镜像内安装额外工具（如特定 Node 版本、自定义脚本），可基于 `Dockerfile.runner` 构建并修改 `docker-compose.yml` 中 worker 的 `image` 与 `build` 配置；在 DEPLOY 文档中说明“自定义 Runner 镜像”的构建与替换方式。

---

## 指定版本安装

- `--version latest`：通过 GitHub API 解析当前仓库最新 release tag（如 `GITHUB_REPO=owner/repo` 可配置）。
- `--version vX.Y.Z`：直接使用该 tag 的 release assets 与 Docker 镜像 tag。

示例：

```bash
./infra/deploy/install.sh install --version v0.1.0
./infra/deploy/install.sh install --mode docker --version v0.1.0
```

---

## 常见问题

### SSE 反代配置

SSE 需禁用缓冲，否则事件可能延迟或丢失。nginx 示例（已包含在模板中）：

```nginx
location /api/events {
    proxy_pass http://control_backend;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_buffering off;
    proxy_cache off;
    chunked_transfer_encoding off;
}
```

若使用 Caddy，需在对应 route 上关闭 buffer。

### 权限

- Local 模式：systemd 以配置的用户运行 control/runner，需保证该用户对 `$PREFIX/shared` 有读写权限。
- Docker 模式：容器内运行用户需对挂载的 volume 有读写权限；可在 compose 或 Dockerfile 中指定 UID/GID。

### SQLite WAL 建议

生产环境建议开启 SQLite WAL 模式以提升并发。可在应用层或部署后通过 SQL 执行：`PRAGMA journal_mode=WAL;`（若应用未默认开启，可在 config 或启动脚本中说明）。

---

## Release 与 CI（PR-D3）

工作流：`.github/workflows/release.yml`。打 tag `v*.*.*` 后自动执行：

- **Release assets**：构建并上传 `bullboard-control-linux-amd64-vX.Y.Z.tar.gz`（含 control + dashboard）、`bullboard-worker-linux-amd64-vX.Y.Z.tar.gz`（runner）、`SHA256SUMS` 到 GitHub Release。
- **Docker**：构建并推送镜像到 GHCR：`ghcr.io/<owner>/bullboard-control`、`bullboard-dashboard`、`bullboard-runner`，tag 为版本号（如 `v0.1.0`）与 `latest`。
- `<owner>` 由 `GITHUB_REPOSITORY` 的 owner 部分自动得到（小写）；无需额外配置。

---

## 最小可验证闭环

- **Local**：执行 `install.sh install`（或仅 control）后，能启动 control + dashboard；浏览器访问 dashboard 并调通 control API；再安装 worker 后，runner 能领取 job 并回调 control。
- **Docker**：`install.sh install --mode docker --component control` 后，至少 control + dashboard 能启动并可访问；worker 模式提供说明并可单独启动（工具链依赖在本文档中明确）。
