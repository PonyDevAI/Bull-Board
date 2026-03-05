# 总方案：Runner 改名为 Person + Console 配置管理（执行清单）

本文档为**唯一总纲**：Runner 全面改名为 Person（含类型 self/openclaw）、以及 Console 对 Group/Role/Person/Worker 的配置管理。所有代码、构建、部署、文档的改动均按此执行，便于后续「不知道要做什么」时按清单逐项完成。

---

## 一、命名与类型（必须一致）

| 概念 | 英文/标识 | 说明 |
|------|-----------|------|
| **执行器** | **Person** | 原 Runner；跑任务进程或第三方执行能力。 |
| **Person 类型** | **self** | 自建执行器（本仓库 bb-person 进程）。 |
| **Person 类型** | **openclaw** | 第三方 OpenClaw，通过适配器与 Console 通信。 |
| **部门** | Group / Dept | 公司级部门；可配置部门 Prompt（可空）。 |
| **职位** | Role | 角色=职位；可配置角色 Prompt；与 Person 绑定成 Worker。 |
| **职员** | Worker | Worker = Role + Person 绑定；派单对象，assigned_worker_id。 |

**硬性约定**：全仓不再使用 **runner** / **Runner** / **RUNNER** 作为执行器的正式名（仅迁移/历史文档可保留旧名说明）。统一使用 **Person**；类型为 **self** 或 **openclaw**。

---

## 二、Runner → Person 全量改名映射表

### 2.1 代码与仓库

| 类别 | 旧 (Runner) | 新 (Person) |
|------|-------------|-------------|
| Go 包路径 | `internal/runner` | **internal/person** |
| Go 入口目录 | `cmd/bb-runner` | **cmd/bb-person** |
| 包内类型/变量 | RunnerID, runner_id, Config.RunnerID | **PersonID**, **person_id**, **Config.PersonID** |
| 表名 | runners | **persons** |
| 外键/列名 | runner_id | **person_id** |
| API 路径前缀 | /api/runners, /api/runner | **/api/persons**, **/api/person** |
| 请求/响应 JSON 字段 | runner_id | **person_id** |
| 环境变量 | RUNNER_ID | **PERSON_ID** |
| 工作目录默认 | /tmp/bb-runner-work | **/tmp/bb-person-work** |

### 2.2 构建与发布

| 类别 | 旧 | 新 |
|------|-----|-----|
| 二进制名 | bb-runner | **bb-person** |
| 多架构产物 | bb-runner-amd64, bb-runner-arm64 | **bb-person-amd64**, **bb-person-arm64** |
| release 目录 | release/runner-amd64 等 | **release/person-amd64** 等 |
| release 压缩包 | bullboard-runner-linux-*.tar.gz | **bullboard-person-linux-*.tar.gz** |
| all 包内 | bb-runner | **bb-person** |
| .gitignore | /bb-runner, /bb-runner-amd64, /bb-runner-arm64 | **/bb-person**, **/bb-person-amd64**, **/bb-person-arm64** |

### 2.3 Docker

| 类别 | 旧 | 新 |
|------|-----|-----|
| Dockerfile 名 | Dockerfile.runner | **Dockerfile.person** |
| 镜像内二进制 | runner | **person** 或 **bb-person** |
| 环境变量 | RUNNER_ID | **PERSON_ID** |
| compose 服务名 | runner / bb-runner | **person** / **bb-person** |

### 2.4 systemd 与安装脚本

| 类别 | 旧 | 新 |
|------|-----|-----|
| unit 模板 | bb-runner.service.tpl, bullboard-runner.service.tpl | **bb-person.service.tpl**, **bullboard-person.service.tpl** |
| 安装后 unit | bb-runner.service | **bb-person.service** |
| ExecStart | /usr/local/bin/bb-runner | **/usr/local/bin/bb-person** |
| install.sh 变量 | SVC_RUNNER=bb-runner | **SVC_PERSON=bb-person** |
| infra/deploy/bb | bb-runner, SVC_RUNNER | **bb-person**, **SVC_PERSON** |

### 2.5 前端 (Dashboard)

| 类别 | 旧 | 新 |
|------|-----|-----|
| API 路径 | /api/runners | **/api/persons** |
| 类型/字段 | Runner, runner_id, runner_name, runner_last_heartbeat | **Person**, **person_id**, **person_name**, **person_last_heartbeat** |
| 路由 | /dashboard/runners | **/dashboard/persons** |
| 组件/文案 | Runners, RunnerHealthPanel | **Persons** / 执行器，**PersonHealthPanel** |
| Mock | runners | **persons** |

### 2.6 CI/CD

| 类别 | 旧 | 新 |
|------|-----|-----|
| GitHub Actions | 构建 bb-runner, 复制/打包 bb-runner | **bb-person** |
| release 产物名 | bullboard-runner-* | **bullboard-person-*** |

---

## 三、Person 类型：self 与 openclaw

- **type = self**：自建 Person，即本仓库编译的 **bb-person** 进程；register → heartbeat → pull → 本地执行（Shell/VERIFY 等）→ report。
- **type = openclaw**：第三方 OpenClaw；由适配器进程向 Console 注册为 Person(type=openclaw)，拉 Job 后转调 OpenClaw，再 report。
- 表 **persons** 必有列 **type TEXT**，取值 `self` | `openclaw`（后续可扩展）。自建进程注册时带 type=self；适配器注册时带 type=openclaw。

---

## 四、Console 配置管理（简要）

Console 管理四类对象，细节见 **docs/ARCHITECTURE_CONSOLE_MANAGEMENT.md**：

1. **Group（部门）**：CRUD；部门可配置 Prompt（可空）。表 depts 加 prompt。
2. **Role（职位）**：CRUD；角色配置 Prompt。新建表 roles。
3. **Person（执行器）**：注册/心跳/列表/PATCH 配置；类型 self/openclaw；表 persons（由 runners 改名并加 type/endpoint_url/config_json）。
4. **Worker（职员）**：Worker = Role + Person 绑定；bind 时 role_id + person_id；表 workers 含 role_id、person_id（原 runner_id）。

---

## 五、文件级改动清单（按仓库路径）

### 5.1 Go 后端

| 路径 | 改动 |
|------|------|
| **internal/runner/** | 整个目录重命名为 **internal/person/**；包名 package person；所有 RunnerID/runner_id 改为 PersonID/person_id；cfg.RunnerID→cfg.PersonID；API 地址中 runner→person |
| **internal/runner/config.go** | → internal/person/config.go；RUNNER_ID→PERSON_ID；WorkDirBase 默认 /tmp/bb-person-work |
| **internal/runner/loop.go** | → internal/person/loop.go；register/heartbeat/pull 的 body 与 URL 用 person_id |
| **internal/runner/runner.go** | → internal/person/person.go 或 run.go；函数名与注释 Runner→Person |
| **cmd/bb-runner/** | 整个目录重命名为 **cmd/bb-person/**；import internal/person；main 注释 Runner→Person |
| **internal/common/db.go** | runners 表改为 **persons** 表（或迁移脚本建 persons、迁数据、删 runners）；workers.runner_id→**workers.person_id**；persons 表加 type, endpoint_url, config_json；init 中 INSERT runners→INSERT persons |
| **internal/console/server.go** | /api/runner/* → **/api/person/***；/api/runners → **/api/persons**；body runner_id→person_id；注释 Runner→Person |
| **internal/console/workers_runners.go** | 文件可重命名为 **workers_persons.go**；所有 runner_id→person_id；runners 表→persons；API 路径 /api/runners→/api/persons |
| **internal/console/jobs.go** | runner_id→person_id；runners→persons；/api/runner/pull→/api/person/pull；注释 |
| **internal/cli/install.go** | bb-runner→bb-person；/usr/local/bin/bb-runner→bb-person |
| **internal/cli/logs.go** | bb-runner→bb-person |
| **internal/cli/restart.go** | bb-runner→bb-person |
| **internal/cli/status.go** | 若有 runner 字样→person |
| **internal/cli/doctor.go** | 若有 runner 字样→person |

### 5.2 前端 (apps/dashboard)

| 路径 | 改动 |
|------|------|
| **src/api.ts** | Runner 类型→**Person**；runner_id, runner_name, runner_last_heartbeat→**person_id, person_name, person_last_heartbeat**；/runners→**/persons**；getRunners→**getPersons** |
| **src/App.tsx** | 路由 runners→**persons**；WorkersPage 或占位 |
| **src/mocks/sidebar.ts** | /dashboard/runners→**/dashboard/persons**；Runners→Persons 或「执行器」 |
| **src/pages/WorkersPage.tsx** | runners→persons；runner_name, runner_id→person_name, person_id；runner_last_heartbeat→person_last_heartbeat |
| **src/pages/SettingsPage.tsx** | runners→persons；bb-runner.service→bb-person.service |
| **src/pages/DashboardHome.tsx** | runners→persons；RunnerHealthPanel→PersonHealthPanel |
| **src/components/dashboard/RunnerHealthPanel.tsx** | 重命名为 **PersonHealthPanel.tsx**；runners→persons；Runner→Person |
| **src/mocks/dashboard.ts** | runners→**persons**；runner-1 等→person-1 等 |
| **src/mocks/kanban.ts** | 若有 runner 标签→person |

### 5.3 构建、CI、部署

| 路径 | 改动 |
|------|------|
| **.gitignore** | bb-runner, bb-runner-amd64, bb-runner-arm64 → **bb-person**, **bb-person-amd64**, **bb-person-arm64** |
| **.github/workflows/release.yml** | 构建 bb-runner→**bb-person**；bb-runner-amd64/arm64→**bb-person-amd64/arm64**；release 目录与压缩包名 runner→**person**；bullboard-runner-*→**bullboard-person-*** |
| **infra/deploy/install.sh** | SVC_RUNNER→**SVC_PERSON**；bb-runner→**bb-person**；所有复制/构建/ systemctl 中的 runner→person |
| **infra/deploy/bb** | SVC_RUNNER→**SVC_PERSON**；bb-runner→bb-person |
| **infra/deploy/templates/systemd/bb-runner.service.tpl** | 重命名为 **bb-person.service.tpl**；Description/ExecStart/SyslogIdentifier 中 runner→person |
| **infra/deploy/templates/systemd/bullboard-runner.service.tpl** | 重命名为 **bullboard-person.service.tpl**；内容 runner→person |
| **infra/docker/Dockerfile.runner** | 重命名为 **Dockerfile.person**；COPY runner→person；ENV RUNNER_ID→**PERSON_ID**；CMD runner→person |
| **infra/docker/docker-compose.yml** | 服务 runner→**person**；RUNNER_ID→**PERSON_ID** |
| **.air.runner.toml** | 可重命名为 **.air.person.toml**（若存在） |
| **apps/runner/** | 若为独立 app（Go 或其它），目录可重命名为 **apps/person**；二进制名 runner→person |

### 5.4 文档（必须全部更新）

| 路径 | 改动 |
|------|------|
| **docs/NAMING.md** | runner→**Person**；类型 self/openclaw；bb-runner→**bb-person**；bullboard-runner→**bullboard-person**；Release/Docker/Systemd 全部 person |
| **docs/ARCHITECTURE.md** | Runner→**Person**；runners→persons；runner_id→person_id；执行器统一 Person；引用 ARCHITECTURE_CONSOLE_MANAGEMENT |
| **docs/ARCHITECTURE_CONSOLE_MANAGEMENT.md** | builtin→**self**；所有 Runner 表述→Person；表 persons；API /api/persons, /api/person；Phase 5 改为「必须」执行 Runner→Person |
| **docs/PLAN_PERSON_WORKER_CONSOLE.md** | Runner→Person；指向 MASTER_PLAN 与 ARCHITECTURE_CONSOLE_MANAGEMENT |
| **docs/PLAN.md** | bb-runner→bb-person；Runner→Person；runners→persons；locked_by 等 runner_id→person_id |
| **docs/ROADMAP_MULTI_AGENT.md** | Runner→Person；/api/runners→/api/persons |
| **docs/AGENT_RULES.md** | runner→person；白名单改为 console/runner 改为 **person** |
| **docs/DEPLOY.md** | bb-runner→bb-person；bullboard-runner→bullboard-person；服务名 runner→person |
| **docs/CLI_SPEC.md** | 若有 runner 命令或说明→person |
| **docs/WORKFLOW.md** | runner→person |
| **docs/DEFINITION_OF_DONE.md** | runner→person；bb-runner→bb-person |
| **docs/PR1_DOCS_SUMMARY.md** | 可加注：历史为 Runner，现统一 Person |
| **docs/PR2_DB_API_SUMMARY.md** | runners→persons；runner_id→person_id；API /api/persons |
| **docs/PR_SUMMARY_CONTROL_TO_CONSOLE.md** | cmd/bb-runner→cmd/bb-person；Runner→Person |
| **docs/MIGRATION_CONTROL_TO_CONSOLE.md** | 若提到 runner，补充：执行器已改名为 Person，见 MIGRATION_RUNNER_TO_PERSON |
| **docs/_ITERATION_FILE_LIST.md** | internal/runner→internal/person；cmd/bb-runner→cmd/bb-person；Runner→Person |
| **docs/PLAN_OPENCLAW_AS_WORKER.md** | Runner→Person；执行器→Person；type openclaw |
| **README.md** | bb-runner→bb-person；Runner→Person；bullboard-runner→bullboard-person |

### 5.5 迁移文档（必须新增）

| 路径 | 内容 |
|------|------|
| **docs/MIGRATION_RUNNER_TO_PERSON.md** | 新建。说明 Runner 已全面改名为 Person；旧名不再兼容。列出：二进制 bb-runner→bb-person、镜像/服务名、systemd unit、API /api/runners|/api/runner→/api/persons|/api/person、环境变量 RUNNER_ID→PERSON_ID、DB 表 runners→persons、workers.runner_id→person_id。升级步骤：替换二进制、重命名 unit、更新 env、更新 API 调用、执行 DB 迁移。 |

---

## 六、实施顺序（建议 PR/Phase）

1. **Phase 1：Runner → Person 代码与 DB**  
   internal/runner→internal/person；cmd/bb-runner→cmd/bb-person；DB runners→persons、workers.person_id；API 路径与字段全面改为 person；env PERSON_ID。保证 build 通过、单测/手测拉取与上报正常。
2. **Phase 2：构建与发布**  
   CI、release 产物、Docker、.gitignore、systemd 模板、install.sh、infra/deploy/bb 全部改为 bb-person / person。
3. **Phase 3：前端**  
   API、类型、路由、组件、Mock 全部改为 Person/persons。
4. **Phase 4：文档全量**  
   按 5.4 清单逐文件替换 Runner→Person、runner→person、bb-runner→bb-person；并新增 MIGRATION_RUNNER_TO_PERSON.md。
5. **Phase 5：Console 管理扩展**  
   Group(depts.prompt)、Role(roles 表)、Person(type=self|openclaw, config_json)、Worker(role_id, person_id)；API 与 UI 按 ARCHITECTURE_CONSOLE_MANAGEMENT 实现。

---

## 七、验收与一致性检查

- `go build ./cmd/bb ./cmd/bb-person` 通过。
- 全仓 ripgrep：除 MIGRATION*、历史说明外，不应出现 **runner**、**bb-runner**、**runner_id**、**/api/runners**、**/api/runner** 作为正式名。
- 文档、compose、systemd、CI 仅使用 **Person**、**bb-person**、**person_id**、**/api/persons**、**/api/person**。
- Person 类型仅使用 **self**、**openclaw**（自建=self，OpenClaw=openclaw）。

---

## 八、参考（已按本方案更新）

- Console 配置管理详细设计：**docs/ARCHITECTURE_CONSOLE_MANAGEMENT.md**（Person 类型 self/openclaw）
- 命名规范：**docs/NAMING.md**（Person、bb-person、bullboard-person）
- 架构总览：**docs/ARCHITECTURE.md**（Person/Worker/Agent）
- 迁移说明：**docs/MIGRATION_RUNNER_TO_PERSON.md**
