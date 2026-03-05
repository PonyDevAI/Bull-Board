# 把 OpenClaw 当作一个 Worker 的规划

本文档描述如何将 OpenClaw 作为「一种 Worker 的执行后端」，在你的 Bull Board 里实现「派单给 OpenClaw 干活」。

---

## 一、目标

- **Worker** 仍是派单对象（Role + Person 绑定）。
- 执行端 **Person** 类型可为 **self**（自建 bb-person，Shell/VERIFY）或 **openclaw**（OpenClaw 适配器）。
- 当 Person 类型为 **openclaw** 时：Console 下发的 Job 由 **适配器** 转成对 OpenClaw 的调用；OpenClaw 执行完后，适配器把结果 report 回 Console，更新 Job 与 Worker 状态。

即：**OpenClaw 作为 Person(type=openclaw)**，与自建 Person(type=self) 并列；执行器已全面改名为 Person，见 **docs/MASTER_PLAN_RUNNER_TO_PERSON_AND_CONSOLE.md**。

---

## 二、整体思路（两种实现路径）

### 路径 A：独立「OpenClaw 适配器」进程（推荐先做）

- 新增一个常驻进程（**OpenClaw 适配器**）：
  - 向 Console **注册为 Person(type=openclaw)**（执行器已改名为 Person，见 MASTER_PLAN）；
  - 该 Person 下绑定多个 Worker（Role + 此 Person）；
  - 拉取到 Job 后，把 payload 转成对 OpenClaw 的请求，等 OpenClaw 执行完，再 report 回 Console。
- 优点：与自建 Person(type=self) 解耦，部署灵活。
- 缺点：多一个进程/镜像要维护。

### 路径 B：在现有 bb-person 里加「执行器类型」

- 在 **bb-person**（Person type=self）上为 Job 或 Worker 增加执行分支：如按 Worker 的 Person type 或配置区分；若为 openclaw 则调 OpenClaw，否则走 Shell/VERIFY。
- 优点：只维护一个 Person 二进制。
- 缺点：二进制依赖 OpenClaw 调用方式，部署要一起考虑。

**建议**：先按 **路径 A** 做 OpenClaw 适配器（注册为 Person type=openclaw），跑通闭环；可选再合并进 bb-person（路径 B）。

---

## 三、需要提前搞清的点（OpenClaw 侧）

1. **如何触发「一次任务」？**
   - 方式 1：通过 **Gateway HTTP/WebSocket** 给某个 session 发一条「用户消息」，等 AI 回复（或工具跑完）后取结果。需要约定 session（如固定 `task-{job_id}`）和超时。
   - 方式 2：用 **OpenClaw CLI**（如 `claw send ...` 或内部 API）在无头环境跑一条指令，从 stdout/文件拿结果。
   - 方式 3：若 OpenClaw 提供「单次任务 API」（一次请求进、一次结果出），直接调用。
2. **Job payload 里放什么？**
   - 至少：**自然语言指令** 或 **预定义任务类型 + 参数**（如 `{"type":"verify","repo":"...","branch":"..."}`）。
   - 适配器负责把 payload 转成 OpenClaw 能接受的输入（例如一条用户消息或 CLI 参数）。
3. **结果怎么拿？**
   - 轮询 Gateway 的 session 状态 / 最后一条回复；
   - 或 Webhook 回调（若 OpenClaw 支持）；
   - 或 CLI 输出解析。
4. **超时与失败**  
   适配器必须设置超时；超时或 OpenClaw 报错时，向 Console report 为 `failed`，并尽量带上错误信息。

建议先查 OpenClaw 文档：Gateway 的 HTTP API、是否有「发送消息并等待回复」的接口、CLI 的 headless 用法。

---

## 四、在你这边需要落地的内容（规划清单）

### 4.1 数据与模型（可选但建议）

- **Worker 或 Agent 上增加「执行器类型」**  
  - 例如 `executor_type`：`"default"`（当前 Runner+Shell）| `"openclaw"`。  
  - 或通过 **Worker 的扩展属性**（如 `worker.meta_json`）存：`{"executor":"openclaw","gateway_url":"http://..."}`。
- **Job payload 约定**  
  - 对 OpenClaw 型 Worker，payload 可包含：`instruction`（自然语言）、或 `task_type` + 参数；适配器按约定解析并转成 OpenClaw 调用。

### 4.2 适配器（路径 A）核心逻辑

1. **注册与心跳**  
   使用现有 `/api/runners/register`、`/api/runners/heartbeat`（或以后若改名为 node 则用 node 的 API），用同一个「执行端」身份；下面只绑定 OpenClaw 型 Worker。
2. **拉取**  
   使用现有 `GET /api/runner/pull?runner_id=...`；只拉 `assigned_worker_id` 属于本适配器绑定的 Worker 的 Job（与现有 Runner 一致）。
3. **执行**  
   - 解析 Job payload → 构造 OpenClaw 请求（HTTP 或 CLI）。  
   - 调用 OpenClaw，带超时；收集输出/回复。
4. **上报**  
   使用现有 `POST /api/jobs/{id}/report`，把 status（succeeded/failed）、summary、logs、artifacts 回传；并保证 Worker 的 `current_job_id` 被正确清空（与现有 report 逻辑一致）。

### 4.3 部署与配置

- **OpenClaw**：按 OpenClaw 官方方式部署（Gateway 常驻；若用 CLI 则需在适配器所在环境安装 OpenClaw CLI）。
- **适配器**：需要配置至少：
  - Console 地址（API_BASE_URL）；
  - 本执行端 ID（RUNNER_ID 或 NODE_ID）；
  - OpenClaw Gateway 地址（或 CLI 路径）；
  - 可选：默认 session 命名规则、超时时间、并发数（可复用现有 runner 的 max_concurrency 思路）。

### 4.4 与现有 Runner 的并列关系

- **现有 Runner**：继续负责「Shell/VERIFY」型 Worker，逻辑不变。
- **OpenClaw 适配器**：只负责「OpenClaw」型 Worker；拉取与上报协议与现有 Runner 完全一致，仅「执行」这一步改为调 OpenClaw。
- 一个 Console 可同时接多个 Runner + 多个 OpenClaw 适配器；Worker 通过 `executor_type` 或 meta 区分由谁执行。

---

## 五、实施顺序建议（不写代码，只做规划时的顺序）

1. **调研**：确认 OpenClaw 的「单次任务」调用方式（HTTP/CLI/WebSocket），并确定 payload 与结果格式。
2. **约定**：在仓库里定下「OpenClaw 型 Job」的 payload 结构、以及 Worker 上如何标记为 OpenClaw（executor_type 或 meta）。
3. **实现适配器**：按路径 A 实现一个最小可运行进程（register → heartbeat → pull → 调 OpenClaw → report），先不合并进现有 Runner。
4. **联调**：创建 OpenClaw 型 Worker、派一个测试 Job，从 Console 看到 succeeded/failed 与 logs。
5. **可选**：把适配逻辑以「执行器插件」形式迁回现有 Runner（路径 B），或保持独立进程，视运维偏好决定。

---

## 六、小结

- **撤销**：Runner→Node 方案已撤销（不再做 Runner 改名为 Node）。
- **OpenClaw 当 Worker**：把 OpenClaw 当作「一种 Worker 的执行后端」；通过适配器（独立进程或 Runner 内执行器类型）把 Job 转成 OpenClaw 调用，再把结果 report 回 Console。
- **下一步**：先敲定 OpenClaw 的调用方式与 payload/结果约定，再实现适配器并跑通端到端。
