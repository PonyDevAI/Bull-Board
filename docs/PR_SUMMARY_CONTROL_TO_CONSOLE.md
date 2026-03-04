# control → console 全面改名：PR 摘要与验证

以下按 4 个 PR（或 4 组 commit）交付，便于分步合并或审查。

---

## PR1：代码与服务改名（control → console），含 API 路由/前端调用同步

**变更目的**：将后端服务与内部命名从 control 统一改为 console，并同步前端与 CLI 的 unit/参数。

**文件列表**：
- `internal/console/*`（新建，替代 internal/control）
- `internal/control/*`（已删除）
- `internal/cli/server.go`、`internal/cli/version.go`、`internal/cli/logs.go`、`internal/cli/restart.go`
- `cmd/bb-runner/main.go`（注释）
- `apps/control` → `apps/console`（目录重命名）
- `apps/console/package.json`（name: @bullboard/console）
- `apps/console/src/index.ts`（注释）
- `package.json`（dev:console、build:console）
- `pnpm-lock.yaml`（apps/console）
- `apps/dashboard/src/api.ts`、`apps/dashboard/src/pages/LogsPage.tsx`、`apps/dashboard/src/pages/SettingsPage.tsx`
- `.gitignore`（apps/console/data/）

**关键改动**：
- Go 包 `internal/control` → `internal/console`，所有 import 与 package 声明已更新。
- 日志 API 的 unit 参数与响应：`control` → `console`。
- CLI：`bb logs/restart control` → `console`；默认 which 仍为 bb（Console 对应 systemd unit bb）。
- 前端：unit=control → unit=console；api.ts 注释与默认 unit 更新。
- Node 应用目录与包名：apps/control → apps/console，@bullboard/control → @bullboard/console。

**验证步骤**：
```bash
go build ./cmd/bb ./cmd/bb-runner
pnpm build:console
```

**风险点与回滚**：若单独回滚 PR1，需恢复 internal/control、apps/control 及上述引用；建议与 PR2–PR4 一并发布。

---

## PR2：构建与发布产物改名（Docker/compose/systemd/release/CI/scripts）

**变更目的**：构建与发布产物、镜像、compose、systemd、CI、脚本中不再出现 control/bullboard-control，全部改为 console。

**文件列表**：
- `infra/docker/Dockerfile.control` → `infra/docker/Dockerfile.console`（重命名+注释）
- `infra/docker/docker-compose.yml`（服务名 control→console，镜像 bullboard-control→bullboard-console，CONSOLE_PORT，depends_on、API_BASE_URL 指向 console）
- `infra/docker/Dockerfile.dashboard`（proxy 目标 control→console）
- `infra/docker/Dockerfile.runner`（API_BASE_URL http://console:3000）
- `infra/deploy/templates/systemd/bullboard-control.service.tpl` → `bullboard-console.service.tpl`（重命名+内容）
- `infra/deploy/templates/nginx/bullboard.conf.tpl`（control_backend→console_backend，CONTROL_UPSTREAM→CONSOLE_UPSTREAM）
- `.github/workflows/release.yml`（matrix image: console）
- `infra/deploy/install.sh`（component console，want_console）
- `infra/deploy/bb`（SVC_CONSOLE，usage/restart/logs/tls 中 console）

**关键改动**：
- Docker 镜像与 compose 服务名、容器名、环境变量、依赖关系均使用 console。
- systemd 模板仅保留 bullboard-console.service.tpl；工作目录与 SyslogIdentifier 为 console。
- CI 构建镜像名为 bullboard-console；Dockerfile 引用 Dockerfile.console。
- install.sh / bb 脚本中组件名与提示语均为 console。

**验证步骤**：
```bash
go build ./cmd/bb ./cmd/bb-runner
docker compose -f infra/docker/docker-compose.yml --profile console build
```

**风险点与回滚**：已部署的 compose 需改用新服务名 console 并重新拉取/构建 bullboard-console 镜像；回滚需恢复旧镜像名与服务名并重新部署。

---

## PR3：文档全量对齐（NAMING/AGENT_RULES/PLAN/ROADMAP + 新增 ARCHITECTURE）

**变更目的**：对外命名、规范、方案与路线图文档统一为 console；新增权威架构说明。

**文件列表**：
- `docs/NAMING.md`（console/runner/worker/workspace/company/group/dashboard；部署产物示例全部 console）
- `docs/AGENT_RULES.md`（control→console；流程说明同步）
- `docs/PLAN.md`（internal/console；目录说明；指向 ARCHITECTURE）
- `docs/ROADMAP_MULTI_AGENT.md`（Control→Console；Runner 与 Agent/Worker 表述修正；指向 ARCHITECTURE）
- `docs/ARCHITECTURE.md`（新建：Company/Workspace/Dashboard、Group=plan/exec、Agent/Runner/Worker、jobs.assigned_worker_id、方案组与执行组）
- `docs/DEPLOY.md`、`docs/CLI_SPEC.md`、`docs/DASHBOARD_CONTROL.md`（control→console）
- `docs/WORKFLOW.md`、`docs/DEFINITION_OF_DONE.md`（control→console）
- `README.md`（bb logs/restart、control→console 描述）

**关键改动**：
- NAMING.md：对外命名表与部署产物示例全部使用 console。
- AGENT_RULES.md：命名白名单与流程中 control 改为 console。
- 新增 ARCHITECTURE.md：层级、Group、Console/Runner/Worker/Agent 定义、派单与队列规则。
- PLAN/ROADMAP：术语与指向 ARCHITECTURE；修正 Runner 与 Agent 的表述。

**验证步骤**：文档审阅；可配合 `bb --help`、`bb logs console` 等确认 CLI 与文档一致。

**风险点与回滚**：仅文档与示例；回滚为还原文档内容即可。

---

## PR4：新增迁移文档 MIGRATION_CONTROL_TO_CONSOLE.md + 全仓一致性清理

**变更目的**：明确 control 已完全移除、不提供兼容；提供旧名→新名映射与升级步骤；移除残留旧名引用（除迁移文档内作为废弃名说明）。

**文件列表**：
- `docs/MIGRATION_CONTROL_TO_CONSOLE.md`（新建）
- `docs/_RENAME_MAP_CONTROL_TO_CONSOLE.txt`（已删除，内容已并入 MIGRATION）

**关键改动**：
- MIGRATION 文档说明：control/bullboard-control 已完全移除；列出二进制/镜像/compose/systemd/API/env 等旧→新映射；给出升级步骤（替换命令/配置）。
- 全仓仅 MIGRATION 文档中保留「control」「bullboard-control」作为被废弃名出现；无其它可执行入口或正式名。

**验证步骤**：
```bash
# 一致性检查：除 MIGRATION 外不应再出现可执行/正式名 control、bullboard-control
rg -l 'control|bullboard-control' --glob '!*.md' .
# 应无结果或仅 CI/历史相关；docs 下仅 MIGRATION_CONTROL_TO_CONSOLE.md 可包含上述词
```

**风险点与回滚**：无运行时影响；回滚即删除或修改 MIGRATION 文档。

---

## 最终验证（全部合并后）

```bash
# 构建
go build ./cmd/bb ./cmd/bb-runner
pnpm build:console && pnpm build:dashboard

# 可选：Compose 构建
docker compose -f infra/docker/docker-compose.yml --profile console build

# CLI 帮助与日志
./bb --help
./bb logs console --lines 5
./bb restart console
```

全仓搜索：除 `docs/MIGRATION_CONTROL_TO_CONSOLE.md` 中作为“已废弃名”出现外，不应再存在可执行入口或正式名称 **control**、**bullboard-control**。文档、示例、compose、systemd、CI 均引用 **console**。
