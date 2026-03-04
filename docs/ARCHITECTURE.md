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

- **Console**：控制台服务（Go bb server）。负责 API、状态机、审计、看板、🧠方案组对话流水与生成执行编排 jobs。部署产物名：bullboard-console。
- **Runner**：执行器进程/客户端（动态实体）。常驻二进制，与 Console 通信（heartbeat / capabilities / load）；可部署本机或远程。**Runner 不是 Agent**；Runner 是进程。
- **Agent**：员工档案（静态配置）。含 roles、model、prompt、tool_profile、权限等；不跑任务，与 Runner 绑定后才形成 Worker。
- **Worker**：员工上线实体 = Agent + Runner 绑定，是派单对象。执行 jobs 强指派 `assigned_worker_id`。同一 Runner 可绑定多个 Agent，形成多个 Worker（方案 A，见下）。

---

## 2. 方案 A：一个 Runner 绑定多个 Worker

- **绑定关系**：`workers` 表中 `agent_id` 唯一、`runner_id` 不唯一；即一个 Runner 进程可绑定多个 Agent，对应多行 worker（同一 `runner_id` 多行 worker）。
- **拉取规则**：Runner 拉取 job 时，仅能领取 `assigned_worker_id IN ( 该 runner_id 下的所有 worker_id )` 且 `status=queued` 且可获得租约的 jobs；在 DB 中原子地将 job 标记为 running 并写入 `lease_until`。
- **续租/回收**：Runner 心跳可携带当前 job ids 续租，或 `POST /api/jobs/{id}/lease/renew`；超过 `lease_until` 的 running job 回收为 queued（或按策略 failed）。

---

## 3. 任务与队列

### 3.1 jobs 与 assigned_worker_id

- **jobs** 表：队列中的作业；**必须强指派** `assigned_worker_id`（NOT NULL）。Console 创建 job 时指定；后续可扩展自动挑选。
- **Runner 拉取**：`GET /api/runner/pull?runner_id=...` 返回仅属于该 Runner 所绑定 workers 的 queued jobs，并原子写 lease。
- **report**：`POST /api/jobs/{id}/report`（status + summary + artifacts refs + logs）；Console 更新 job 状态与 `worker.current_job_id`。

### 3.2 Runner 执行模型（goroutine + 双层并发 + 独立 workdir）

- **启动流程**：register → heartbeat loop → pull loop。
- **双层并发限制**：
  - **runner.max_concurrency**（机器级）：全局 semaphore，限制该 Runner 进程同时执行的 job 数。
  - **worker.max_concurrency**（员工级，默认 1）：每个 worker 的 semaphore；每个 job 在对应 worker 上占一槽。
- **独立 workdir**：每个 job 使用单独目录，例如 `/work/<company>/<workspace>/<task>/<job>/`，在该目录 clone/worktree repo，避免 repo 串扰。后续可扩展容器隔离；当前为 workdir 隔离 + 软隔离（命令白名单/可写路径/超时）。
- **超时**：每个 job 有 timeout，Runner 必须 kill 并 report failed。
- **artifacts**：stdout/stderr、关键输出文件写入 artifacts 目录并回传 Console（至少 log 文本或文件 uri）。

### 3.3 方案组（plan）

- 流程：proposer → 用户确认 → plan_reviewer → judge → 用户最终确认 → 生成 jobs。
- 产出：计划、评审结果、以及要下发给执行组的 jobs。

### 3.4 执行组（exec）

- 角色：coder、test、code_reviewer 等，由 **Worker** 执行。
- 行为：领取 job、执行、回报 artifacts/run 状态；Console 据此更新 runs/artifacts 并推送 SSE。

---

## 4. 与文档的对应关系

- 对外命名与部署产物：见 **docs/NAMING.md**。
- 单机 v0.1 方案与 SQLite 队列：见 **docs/PLAN.md**。
- 多 Agent / 多项目演进：见 **docs/ROADMAP_MULTI_AGENT.md**；其中「Control」均指 **Console**，「Runner」与「Agent/Worker」区别见上文。
