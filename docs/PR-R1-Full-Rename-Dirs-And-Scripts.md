# PR-R1：目录与工程脚本全量重命名

本 PR 将源码目录统一为 apps/control、apps/dashboard、apps/runner，并更新所有引用（workspace、package 名、脚本、CI、infra、文档），确保 **pnpm dev / build 可跑**。业务逻辑不变。

---

## 1. 修改文件清单

### A. 目录重命名（git mv）

| 原路径（已废弃） | 新路径 |
|------------------|--------|
| 根下 api 目录 | `apps/control` |
| 根下 web 目录 | `apps/dashboard` |
| 根下 runner-go 目录 | `apps/runner` |

### B. 根与 app package.json、脚本

| 文件 | 修改内容 |
|------|----------|
| `package.json` | `dev:api`→`dev:control`，`dev:web`→`dev:dashboard`，`build:api`→`build:control`，`build:web`→`build:dashboard`；filter 改为 `@bullboard/control` / `@bullboard/dashboard` |
| `apps/control/package.json` | `name`: `"api"` → `"@bullboard/control"` |
| `apps/dashboard/package.json` | `name`: `"web"` → `"@bullboard/dashboard"` |

### C. Go module

| 文件 | 修改内容 |
|------|----------|
| `apps/runner/go.mod` | `module bull-board/runner-go` → `module bull-board/runner` |

### D. CI / 部署 / Docker

| 文件 | 修改内容 |
|------|----------|
| `.github/workflows/release.yml` | 路径与脚本名使用 control/dashboard/runner；build 步骤为 build:control、build:dashboard |
| `infra/deploy/install.sh` | `install_from_repo` 内路径与 pnpm build:control 提示 |
| `infra/docker/Dockerfile.control` | COPY apps/control/... |
| `infra/docker/Dockerfile.dashboard` | COPY apps/dashboard/... |
| `infra/docker/Dockerfile.runner` | COPY apps/runner/ |

### E. 文档

| 文件 | 修改内容 |
|------|----------|
| `README.md` | 目录结构、启动命令（dev:control/dev:dashboard）、端到端步骤路径 |
| `docs/DEPLOY.md` | 源码目录说明、build 脚本名 |
| `docs/NAMING.md` | 表中源码目录列 |
| `docs/PLAN.md` | 目录结构（若仍为 api/web/runner-go 则改为 control/dashboard/runner） |
| `docs/PR-01-Scaffold.md` ~ `docs/PR-D1-Deploy-Templates.md` | 路径与脚本统一为 control/dashboard/runner；dev/build 为 dev:control、dev:dashboard、build:control、build:dashboard |

---

## 2. 本地验证步骤（可复制运行）

### 2.1 安装与构建

```bash
# 仓库根
cd /path/to/bull-borad
pnpm install --no-frozen-lockfile   # 首次或 lockfile 变更后
pnpm build:control
pnpm build:dashboard
```

**预期**：无报错；`apps/control/dist/` 与 `apps/dashboard/dist/` 有产出。

### 2.2 启动 dev（control + dashboard）

```bash
pnpm dev
```

或分两个终端：

```bash
# 终端 1
pnpm dev:control

# 终端 2
pnpm dev:dashboard
```

**预期**：control 监听 3000，dashboard 监听 5173；无启动报错。

### 2.3 Control 健康检查

```bash
curl -s http://localhost:3000/health
```

**预期**：`{"ok":true,"service":"bull-board-control"}`

### 2.4 Dashboard 访问

浏览器打开：`http://localhost:5173`  
**预期**：Bull Board 页面正常展示（Workspaces / 看板等）。

### 2.5 Runner 构建（需本机安装 Go）

```bash
cd apps/runner
go build -o runner
./runner --help  # 或查看 usage
```

**预期**：生成 `runner` 可执行文件，能启动（需配置 SQLITE_PATH、API_BASE_URL 等再真正连 control）。

---

## 3. 预期输出 / 日志要点

- `pnpm build:control`：输出 `node node_modules/typescript/bin/tsc` 无错误。
- `pnpm build:dashboard`：输出含 `vite ... building for production` 与 `✓ built in ...`。
- `pnpm dev:control`：日志有 `Listening at http://0.0.0.0:3000` 或等价。
- `pnpm dev:dashboard`：日志有 `Local: http://localhost:5173`。
- `curl localhost:3000/health`：JSON 中 `service` 为 `bull-board-control`。

---

## 4. 后续 PR

- **PR-R2**：部署体系全量重命名（infra 模板、docker compose、systemd、docs 中部署相关）。
- **PR-R3**：install.sh 全量适配（local + docker；组件选择；version；uninstall/status）。
- **PR-R4**：GitHub Actions（release assets + GHCR images）。
