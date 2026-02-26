# 多模型 / 多 Agent / 多项目任务编排 Dashboard — 后续计划

在现有 Bull Board（单 Workspace、单 Runner、固定流程）基础上，向「多模型、多 Agent、多项目」任务编排演进。本计划按阶段拆分，便于逐步落地。

---

## 阶段 0：现状（v0.1）

- **单项目**：一个 Workspace 对应一个代码仓库，任务归属 Workspace。
- **单 Runner**：Go Runner 从 SQLite jobs 领任务执行，无 Agent/模型概念。
- **固定流程**：Plan → Pending → In Progress → Review → Testing → Done/Failed。
- **Dashboard**：Workspace 选择、Kanban、Task 详情、SSE 推送。

---

## 阶段 1：多项目（Multi-Project）

**目标**：一个 Control 管理多个「项目」，每个项目可视为当前 Workspace 的扩展（或 Project = Workspace 的别名）。

1. **数据与 API**
   - 保留/扩展 `workspaces` 为「项目」维度；或新增 `projects` 表，与 workspace 1:1 或 N:1。
   - Dashboard：侧栏或 Topbar 的 Workspace 切换改为「项目切换」，支持按项目筛选 Kanban / Tasks / Runs。
2. **看板与路由**
   - 看板按「当前项目」展示；URL 可带 `?project_id=xxx` 或 `/project/:id/kanban`。
3. **交付物**
   - API：`GET /api/projects`（或沿用 workspaces）、任务/运行按 project 过滤。
   - Dashboard：项目选择器、看板/任务列表与 project 联动。

---

## 阶段 2：多模型（Multi-Model）

**目标**：任务编排时可指定「用哪个模型」做 Plan/Review 等，并为后续计费、限流、路由打基础。

1. **数据与配置**
   - 新增 `models` 配置（或表）：id、name、provider、model_id、api_key_ref、max_tokens、默认开关等。
   - 任务/运行层：在 task 或 run 上增加 `model_id`（或 plan_model_id / review_model_id），便于追溯与重放。
2. **Control API**
   - `GET /api/models`：列出可用模型（来自配置或 DB）。
   - 创建/更新任务时可选 `model_id`；Runner 或 Agent 执行时读取该字段调用对应模型。
3. **Dashboard**
   - Settings → Models：模型的增删改查（名称、provider、model_id、限流等）。
   - 创建任务 / Task 详情：模型选择下拉；Task 详情展示「本次使用的模型」。
   - 可选：看板卡片上显示小图标或标签表示「模型」。

---

## 阶段 3：多 Agent（Multi-Agent）

**目标**：不同「Agent」负责不同阶段或不同类型任务（例如 Plan Agent、Code Agent、Review Agent），支持多 Agent 协作编排。

1. **抽象**
   - **Agent**：一种执行角色，绑定到一种或多种 job 类型（如 CODE_CHANGE、VERIFY、REVIEW），可绑定默认模型、超时、重试策略。
   - 可选：Agent 与「能力」绑定（例如只做前端、只做测试），用于路由与展示。
2. **数据与 API**
   - 新增 `agents` 表或配置：id、name、job_types[]、default_model_id、timeout、retry_policy 等。
   - jobs 表增加 `agent_id`（或由 Control 根据 job type + 策略派发到某 Agent）。
   - API：`GET /api/agents`、任务创建/运行时可指定或自动选择 Agent。
3. **Runner 与编排**
   - 单 Runner 时：Runner 内按 `agent_id` 或 job type 选择不同执行逻辑（不同模型、不同 prompt）。
   - 多 Runner 时：不同 Runner 注册为不同 Agent，Control 将 job 派发给对应 Agent 的 Runner。
4. **Dashboard**
   - Settings → Agents：Agent 的增删改查、绑定模型与 job 类型。
   - 看板/任务详情：展示「当前阶段 / 当前 Run 由哪个 Agent 执行」；可选按 Agent 筛选任务。

---

## 阶段 4：任务编排与看板增强（Orchestration + UX）

**目标**：编排策略可配置、看板与任务详情能体现「多模型 + 多 Agent + 多项目」。

1. **编排策略**
   - 支持「阶段 → 模型 / Agent」映射配置（例如 Draft 用 Model A + Plan Agent，Review 用 Model B + Review Agent）。
   - 任务创建或状态推进时，根据阶段自动带出默认 model_id / agent_id；允许用户覆盖。
2. **看板**
   - 列与阶段一致；卡片展示：标题、优先级、负责人、模型/Agent 标签、截止时间、状态。
   - 支持按项目、模型、Agent、优先级筛选；支持多看板（按项目或按流程模板）。
3. **任务详情**
   - 展示完整编排信息：项目、阶段、当前/历史 Run、每个 Run 使用的模型与 Agent、产物、操作日志。
   - 操作：重试、换模型/换 Agent 重跑、转交、阻塞/解阻塞等。

---

## 阶段 5：策略与扩展（可选）

- **路由与策略**：按仓库、分支、标签、优先级等将任务路由到不同 Agent/模型。
- **配额与限流**：按模型/Agent/项目做调用次数与并发限制。
- **审计与计费**：记录每次模型调用（model_id、agent_id、tokens、项目），便于审计与成本分摊。

---

## 建议实施顺序

| 阶段 | 内容           | 依赖     |
|------|----------------|----------|
| 1    | 多项目         | 无       |
| 2    | 多模型         | 无       |
| 3    | 多 Agent       | 阶段 2   |
| 4    | 编排 + 看板增强 | 阶段 1–3 |
| 5    | 策略与扩展     | 阶段 4   |

先做阶段 1（多项目）和阶段 2（多模型）可并行或任选其一；阶段 3 在「模型」抽象清晰后接入更顺。看板与任务详情的「多模型/多 Agent/多项目」展示可随阶段 2、3 逐步加字段与筛选项。

---

## 与现有 plan.md 的关系

- **plan.md**：描述 v0.1 单项目、单 Runner、固定流程与 SQLite 队列，保持不变。
- **本 ROADMAP**：在 v0.1 之上，按「多项目 → 多模型 → 多 Agent → 编排与看板」分阶段演进，每阶段可对应若干 PR 或小版本迭代。
