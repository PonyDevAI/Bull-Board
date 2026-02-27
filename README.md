# Bull Board（bb）

Web 看板：管理改代码任务，通过 SQLite 队列表派发给 bb-runner 执行。无 Postgres/Redis 依赖，目标机器无需 Node/Go 运行时（仅需二进制）。

## Bull Board — 个人自托管 AI 开发编排面板（宝塔式）

### 产品愿景（North Star）

面向**个人单用户自托管**场景，提供类似宝塔面板的部署与运维体验（安装/登录/更新/日志/配置），让你在一台开发服务器上稳定运行整套控制平面。  
在此基础上，通过可配置的多 Agent、多模型编排，把「需求 → 实现 → Review → 测试 → 提交/合并」变成**可追溯的开发流水线**，由人类作最终审核，Agent 负责分工执行。

### 这是什么 / 这不是什么（Scope）

#### 这是（IN）

- **自托管面板**：像宝塔一样安装在一台开发服务器上运行，默认单用户、单实例。
- **多 Agent 团队**：支持 Planner / Dev / Reviewer / Tester / Release 等角色化 Agent，根据职责划分工具与权限。
- **可编排工作流**：以 Workflow / Run / Step 为核心模型，先支持串行 pipeline，后续可演进到简单 DAG。
- **可观测可审计**：每次 Run 的日志、trace、产物、失败原因可查看、可回放，方便排查「为什么 Agent 这样做」。
- **连接器**：围绕 Git 仓库、测试命令、构建脚本、通知通道（如邮件/Webhook）做深度集成，而不是泛化成所有 SaaS 连接器。

#### 不是（OUT）

- **不是通用聊天机器人/IM**：不追求闲聊体验，主要承载结构化开发任务，而非开放式对话。
- **不是企业多租户协作平台**：当前只面向个人/小团队单用户模式，不做复杂组织、团队、多租户和精细化 RBAC。
- **不是 IDE 替代品**：不尝试重做编辑器，更多是对接现有 IDE（如 Cursor）的上下文/改动结果，在服务端编排与记录。
- **不是无人值守“全自动合并”系统**：默认不直接 push/merge 到主分支，关键操作需要人类显式确认。

### 核心原则（Guiding Principles）

1. **流程优先于对话**：所有工作最终都要落在 Workflow / Run / Step 上，聊天只是触发或解释流程的手段，而不是结果本身。
2. **角色清晰、权限最小化**：不同 Agent 拥有不同工具与写入权限，确保「谁能改什么」在配置上是可控、可审计的。
3. **上下文受控**：Agent 的上下文来源（代码、文档、历史记录）要清晰可见，有边界，避免「无限记忆」导致语义跑偏。
4. **默认可解释/可回放**：每一步输入、输出和工具调用都应被记录，支持事后回放和问题定位，而不是黑盒式调用。
5. **人类最终拍板**：push / merge / 发布等关键步骤必须有人类确认；系统可以给出建议和自动化方案，但不能越权执行。
6. **单机可用、逐步演进**：先把单机部署、基础面板和最小流水线打磨稳定，再按需要扩展到更多 Agent、更多 workflow 能力。

### 典型工作流（Example Workflow）

你作为“指挥官”（单用户）在面板中操作，典型闭环流程如下：

1. 在 Bull Board 中录入一个需求或 issue（描述要改的功能/bug，指定目标仓库与分支策略）。
2. **Planner Agent** 读取需求与代码仓库，产出实现方案与任务拆解（子任务/步骤），写入对应的 Workflow/Run。
3. **Dev Agent** 按计划在工作分支上生成代码改动，跑基础检查（lint/format），并创建 PR 或推送到预设分支。
4. **Reviewer Agent** 拉取 PR diff，给出审查意见、风险点和必要修正建议，必要时触发补充改动。
5. **Tester Agent** 调用测试命令（单测、集成测试等），收集结果并生成报告，关联到当前 Run/Step。
6. 你在面板中查看整个流水线：需求、计划、diff、测试报告与 Agent 说明，根据结果决定是否接受改动并在 Git 上合并。

整个过程可多次迭代，但始终围绕同一个 Workflow/Run 进行，确保上下文连续、可追溯。

### MVP 目标（防跑偏清单）

#### MVP 必须闭环（Must）

- **面板底座**：完成部署、登录、API key 管理、版本更新提示、系统日志（Control 日志查看与 tail）等基础功能。
- **Repo 接入**：支持通过 deploy key 或 GitHub App（或等价机制）访问私有仓库，至少能 clone / fetch / push 到指定分支。
- **最小编排 pipeline**：打通一条从「录入需求 → 生成实现方案 → 生成改动 → Review → 测试 → 推送 PR/分支提交」的串行流水线。
- **Run/Step 可追溯**：每次 Run/Step 记录耗时、状态、错误原因与产物（如 diff、日志、测试输出），便于排查和回放。
- **人工审核入口**：在面板里能方便地查看 diff / 测试结果 / Agent 建议，并基于这些信息手动决定是否合并或重试。

#### MVP 暂不做（Not now）

- 多用户协作、团队/租户模型（包括复杂权限管理和审计合规）。
- 复杂 DAG 可视化编排器（先聚焦线性/少分支的 pipeline，对外接口预留即可）。
- 完全自动合并到主分支（允许配置自动化，但默认不开启，以降低风险）。
- 复杂评测与评分体系（如多维打分、长周期统计），当前仅保留基础指标与日志接口。

### 成功指标（Success Metrics）

不追求“完全不会跑偏”，而是通过受控上下文与可追溯机制**显著降低跑偏成本**，可用的衡量指标包括：

- **端到端耗时**：单次任务从录入需求到产生一个「可合并 PR」的中位时间（与人工 baseline 对比）。
- **故障定位时间（MTTR）**：从发现 Agent 行为异常/结果不对，到在面板中定位到问题 Run/Step 的平均时间。
- **Agent 跑偏率**：需要人为大幅修改或废弃的 Run 占比（例如：需要完全重来而不能在原 Run 上迭代的比例）。
- **关键步骤人工审核覆盖率**：PR 合并、发布前等关键节点被人类实际查看/确认的比例。
- **单任务资源/调用成本**（可选）：每个完整 Workflow 消耗的 API 调用次数、Tokens 或计算资源，用于后续优化。

---

## 一条命令安装

```bash
curl -fsSL https://raw.githubusercontent.com/PonyDevAI/Bull-Board/main/infra/deploy/install.sh | bash
```

默认：本机（local）模式、全部组件、最新版本、前缀 `/opt/bull-board`、端口 **8888**。安装完成后访问：

- **Panel**：http://your-host:8888

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

- **local**：systemd 服务 `bb.service`（单端口 8888：面板 + API + SSE）与 `bb-runner.service`。
- **目录**：`/opt/bull-board/` 下 `current`、`versions/<version>`、`config/`、`data/`（持久化）。
- 详细说明见 [docs/DEPLOY.md](docs/DEPLOY.md)。

## 开发

- **Go**：`go build -o bb ./cmd/bb`、`go build -o bb-runner ./cmd/bb-runner`；`go test ./...`
- **前端（仅构建静态产物）**：`pnpm install && pnpm build:dashboard`，产出供 bb server 托管。
- 本地起服务：`./bb server --prefix /tmp/bb-test`，访问 http://localhost:8888

### 本地开发（热重载）

使用 [Air](https://github.com/air-verse/air) 对 Go 做热重载，前端用 Vite 自带 HMR。需先安装 Air：`go install github.com/air-verse/air@latest` 或 `brew install cosmtrek/tap/air`。

开三个终端（若本机另有名为 `air` 的程序如 R 的 Air，请用 `~/go/bin/air` 避免冲突）：

1. **bb server**（API + 静态托管，端口 8888）  
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

前端开发时把 `apps/dashboard/vite.config.ts` 里 proxy 目标改为 `http://localhost:8888`（若当前指向 3000 的 Node control，需改一次）。访问 http://localhost:5173 即可；改 Go 代码会由 Air 自动重新编译并重启，改前端代码由 Vite HMR 热更新。

方案与 PR 说明见 [docs/PLAN.md](docs/PLAN.md) 及 `docs/PR-*.md`。
