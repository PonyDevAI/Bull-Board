# Bull Board（bb）

Web 看板：管理改代码任务，通过 SQLite 队列表派发给 bb-runner 执行。无 Postgres/Redis 依赖，目标机器无需 Node/Go 运行时（仅需二进制）。

## 一条命令安装

```bash
curl -fsSL https://raw.githubusercontent.com/trustpoker/bull-borad/main/infra/deploy/install.sh | bash
```

默认：本机（local）模式、全部组件、最新版本、前缀 `/opt/bull-board`、端口 **6666**。安装完成后访问：

- **Panel**：http://your-host:6666

## 使用 bb 命令

安装后 **bb**（`/usr/local/bin/bb`）用于运行期管理（安装/升级/卸载由上述 install.sh 负责）：

```bash
bb server            # 启动服务（systemd 下由 bb.service 调用）
bb status            # 服务状态与 Panel 地址
bb logs [control|runner] [-f] [--lines N]
bb restart [control|runner|all]
bb doctor
bb tls enable --self-signed | bb tls enable --cert <path> --key <path> | bb tls disable | bb tls status
```

完整命令见 [docs/CLI_SPEC.md](docs/CLI_SPEC.md)。

## 部署与目录

- **local**：systemd 服务 `bb.service`（单端口 6666：面板 + API + SSE）与 `bb-runner.service`。
- **目录**：`/opt/bull-board/` 下 `current`、`versions/<version>`、`config/`、`data/`（持久化）。
- 详细说明见 [docs/DEPLOY.md](docs/DEPLOY.md)。

## 开发

- **Go**：`go build -o bb ./cmd/bb`、`go build -o bb-runner ./cmd/bb-runner`；`go test ./...`
- **前端（仅构建静态产物）**：`pnpm install && pnpm build:dashboard`，产出供 bb server 托管。
- 本地起服务：`./bb server --prefix /tmp/bb-test`，访问 http://localhost:6666

### 本地开发（热重载）

使用 [Air](https://github.com/air-verse/air) 对 Go 做热重载，前端用 Vite 自带 HMR。需先安装 Air：`go install github.com/air-verse/air@latest` 或 `brew install cosmtrek/tap/air`。

开三个终端（若本机另有名为 `air` 的程序如 R 的 Air，请用 `~/go/bin/air` 避免冲突）：

1. **bb server**（API + 静态托管，端口 6666）  
   ```bash
   ~/go/bin/air
   ```
2. **bb-runner**（与 control 通信，需与 server 使用相同数据目录）  
   ```bash
   ~/go/bin/air -c .air.runner.toml
   ```
3. **前端**（Vite 开发服务器，端口 5173）  
   ```bash
   cd apps/dashboard && pnpm dev
   ```

前端开发时把 `apps/dashboard/vite.config.ts` 里 proxy 目标改为 `http://localhost:6666`（若当前指向 3000 的 Node control，需改一次）。访问 http://localhost:5173 即可；改 Go 代码会由 Air 自动重新编译并重启，改前端代码由 Vite HMR 热更新。

方案与 PR 说明见 [docs/PLAN.md](docs/PLAN.md) 及 `docs/PR-*.md`。
