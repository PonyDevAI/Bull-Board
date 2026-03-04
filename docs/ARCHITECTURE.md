# Bull Board 架构说明（权威）

本文档为 Company/Workspace/Dashboard、Agent/Runner/Worker 及方案组/执行组的权威定义，与 docs/NAMING.md 一致。

---

## 1. 层级与角色

### 1.1 Company / Workspace / Dashboard

- **Company**：公司级租户，可拥有多个 Workspace。
- **Workspace**：工作空间，对应一个代码仓库（或项目）的协作边界；任务、运行、产物归属 Workspace。
- **Dashboard**：Workspace 的 UI 视图；前端应用，提供看板、任务详情、设置等。一个 Company 下可有多个 Workspace，每个 Workspace 在 Dashboard 中通过选择器切换。

### 1.2 部门（Group / Dept）

- **Group**（公司级部门）：用于规划与执行分工，例如：
  - **plan**（方案组）：负责需求理解、方案设计、评审（proposer → 用户确认 → plan_reviewer → judge → 用户最终确认 → 生成 jobs）。
  - **exec**（执行组）：负责代码变更、测试、代码评审等，由 Worker 执行并回报 artifacts/run。

### 1.3 Console / Runner / Worker / Agent

- **Console**：控制台服务（Go bb server）。提供 API、状态机、SQLite、SSE；任务与队列管理、鉴权、静态托管。部署产物名：bullboard-console。
- **Runner**：执行器进程/客户端。常驻二进制，与 Console 通信（heartbeat / poll / report），从队列领取 job 并执行。部署产物名：bullboard-runner。**Runner 不是 Agent**；Runner 是进程/二进制。
- **Worker**：Agent + Runner 绑定后的「上线员工」业务实体，是派单对象。一个 Worker 对应一个已注册、可接单的执行能力（例如某台机器上的某个 Runner 注册为某 Agent 类型）。
- **Agent**：一种执行角色或能力类型（如 Plan Agent、Code Agent、Review Agent），可绑定模型、job 类型、超时与重试策略。Agent 与 Runner 绑定后形成 Worker，用于任务编排与派单。

---

## 2. 任务与队列

### 2.1 jobs 与 assigned_worker_id

- **jobs** 表：队列中的作业；可强指派到具体 Worker。
- **jobs.assigned_worker_id**：强指派字段；若非空，仅该 Worker 可领取该 job。
- **Runner 拉取规则**：Runner 拉取 job 时需匹配自身对应的 Worker（及可选 agent_id / job_type）；若 job 有 assigned_worker_id，则仅该 Worker 可领。
- **Worker 在线/忙碌规则**：Worker 通过 heartbeat 上报在线状态；忙碌状态可由「当前正在执行的 job 数」或显式状态字段表示，用于调度与限流。

### 2.2 方案组（plan）

- 流程：proposer → 用户确认 → plan_reviewer → judge → 用户最终确认 → 生成 jobs。
- 产出：计划、评审结果、以及要下发给执行组的 jobs。

### 2.3 执行组（exec）

- 角色：coder、test、code_reviewer 等，由 **Worker** 执行。
- 行为：领取 job、执行、回报 artifacts/run 状态；Console 据此更新 runs/artifacts 并推送 SSE。

---

## 3. 与文档的对应关系

- 对外命名与部署产物：见 **docs/NAMING.md**。
- 单机 v0.1 方案与 SQLite 队列：见 **docs/PLAN.md**。
- 多 Agent / 多项目演进：见 **docs/ROADMAP_MULTI_AGENT.md**；其中「Control」均指 **Console**，「Runner」与「Agent/Worker」区别见上文。
