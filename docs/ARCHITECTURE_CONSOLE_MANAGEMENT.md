# Console 配置管理架构与改造方案（权威）

本文档定义：Console 对 Group / Role / Person / Worker 的配置管理能力，以及 Group/Role 的 Prompt、Person 类型（**self**=自建 / **openclaw**=第三方）、Worker 绑定关系。**执行器已全面改名为 Person**（Runner 不再使用）；全量改动清单与实施顺序见 **docs/MASTER_PLAN_RUNNER_TO_PERSON_AND_CONSOLE.md**。

---

## 一、总览：Console 管理什么

Console 作为个人工作台（个人公司）的**配置与调度中心**，统一管理：

| 管理对象 | 含义 | 主要能力 |
|----------|------|----------|
| **Group** | 部门 | 创建/删除/更新部门；部门可配置 Prompt（可空） |
| **Role** | 职位/角色 | 创建/更新角色；角色配置 Prompt；后续与 Person 绑定成 Worker |
| **Person** | 执行器 | 自建 Person 与第三方 Person（如 OpenClaw）；统一抽象；配置、操作、API；一个 Person 可绑定多个 Role 成为多个 Worker |
| **Worker** | 职员 | 为「角色 + Person」绑定，绑定后即 Worker；派单对象 |

关系链：**Group（部门）→ Role（职位，含 Prompt）→ Person（执行器）→ Worker = Role + Person 绑定**。

---

## 二、Group 管理（部门）

### 2.1 职责

- 部门 CRUD：创建、删除、更新部门。
- 部门归属 Company；部门有类型（如 plan / exec）与名称。
- **部门级 Prompt（可空）**：每个部门可配置一段默认 Prompt，用于该部门下任务/角色的上下文或系统提示；可为空。

### 2.2 数据与 API（建议）

- **表**：`depts` 已有；增加列 `prompt TEXT`（可空）。
- **API**（Console）：
  - `GET /api/companies/:company_id/depts` 或 `GET /api/depts?company_id=`
  - `POST /api/depts`（company_id, type, name, prompt?）
  - `PATCH /api/depts/:id`（name, prompt?）
  - `DELETE /api/depts/:id`（无下属 Role/Worker 时可删）

### 2.3 UI

- Console 设置或「组织管理」：部门列表；新建/编辑部门；编辑时可选填「部门 Prompt」。

---

## 三、Role 管理（职位/角色）

### 3.1 职责

- 角色的 CRUD；角色归属 Company（可选归属 Dept）。
- **角色需配置 Prompt**：每个角色有独立 Prompt（系统提示/岗位说明），执行该角色的 Worker 时使用。
- 角色后续与 Person 绑定后形成 Worker；一个 Person 可绑定多个 Role，即多个 Worker。

### 3.2 数据与 API（建议）

- **表**：`roles`（新建）  
  - id, company_id, dept_id（可选）, name, prompt TEXT NOT NULL 或可空, created_at, updated_at  
  - 若暂不建表，可用 dept 的 type（plan/exec）或枚举当「角色」，Prompt 存 dept/agent 上。
- **API**：
  - `GET /api/roles?company_id=&dept_id=`
  - `POST /api/roles`（company_id, dept_id?, name, prompt）
  - `PATCH /api/roles/:id`（name, prompt）
  - `DELETE /api/roles/:id`

### 3.3 UI

- Console「职位/角色管理」：列表；新建/编辑角色；必填或选填「角色 Prompt」。

---

## 四、Person 管理（执行器）

### 4.1 类型：self（自建）与 openclaw（第三方）

| 类型值 | 说明 | 当前/后续支持 |
|--------|------|----------------|
| **self** | 自建 Person，本仓库 **bb-person** 进程，拉 Job、本地执行（Shell/VERIFY 等） | 已有（原 Runner 改名） |
| **openclaw** | 第三方 OpenClaw，通过适配器与 Console 通信；后续可扩展其他 type | OpenClaw 先上 |

**约定**：Person 的 type 仅使用 **self**、**openclaw**；不再使用 builtin/runner 等。

### 4.2 统一抽象（建议）

- **Person 注册表**：所有 Person 在 Console 侧统一为 **persons** 表（由原 runners 表改名）。
  - 字段：id, company_id, **type**（`self` | `openclaw`）, name, endpoint_url（第三方时）, config_json（Console 下发的非敏感配置）, capabilities_json, max_concurrency, status, last_seen_at, version 等。
- **type=self**：本仓库 **bb-person** 进程；register/heartbeat/pull/report；config 可通过 Console API 下发，敏感 key 仍建议运行 Person 时本地配置。
- **type=openclaw**：
  - 适配器向 Console 注册为 Person(type=openclaw)；拉 Job 后转调 OpenClaw，再 report。
  - OpenClaw 支持 `config.apply` / `config.patch`（WebSocket RPC），可 API 下发非敏感配置；敏感 key 建议本机/环境配置。
- **统一方式**：所有 Person 通过 **Console API** 做配置与操作（列表、PATCH config、查看状态）；执行逻辑在 bb-person（self）或适配器（openclaw）中实现。

### 4.3 自建 Person（type=self）参考 OpenClaw 实现

- **bb-person** 可参考 OpenClaw 的「能力暴露」：注册时上报 capabilities；按 Job 的 role/type 选择不同执行策略；配置从 Console 拉取或 env。
- 自建与 OpenClaw 的差异：自建直接跑 Shell/脚本；OpenClaw 通过适配器调 Gateway。统一的是「Person 在 Console 的一条记录 + 同一套 pull/report 协议」。

### 4.4 Person 侧配置（在 Console「Person 管理」里）

- **可配置项**（存 Person 的 config_json 或独立列）：默认 model、超时、并发数、能力开关、第三方 endpoint 等。
- **敏感 key**：不建议经 Console 存明文；Person 或 OpenClaw 本机配置，Console 仅可「标记需配置项」或占位。
- **一个 Person 可绑定多个 Role**：在 Worker 管理里，为同一 Person 选择不同 Role 多次绑定，得到多个 Worker（见下节）。

### 4.5 数据与 API（建议）

- **表**：**persons**（由 runners 表改名，见 **docs/MASTER_PLAN_RUNNER_TO_PERSON_AND_CONSOLE.md**）。
  - 列：id, company_id, **type**（self | openclaw）, name, endpoint_url, config_json, capabilities_json, max_concurrency, status, last_seen_at, version 等。
- **API**（执行器已统一改名为 Person，路径统一为 person）：
  - `POST /api/persons/register`、`POST /api/persons/heartbeat`；body 含 **person_id**、type、capabilities 等。
  - `GET /api/persons`：列表，支持按 type 筛选。
  - `PATCH /api/persons/:id`：更新 name、config_json、max_concurrency 等。
  - `GET /api/person/pull?person_id=...`：拉取 Job。
  - `POST /api/jobs/:id/report`：上报结果。

### 4.6 UI

- 「Person 管理」或「执行器管理」：列表（自建/OpenClaw 等）；新建第三方 Person（填 type、endpoint）；编辑配置（config_json 的可编辑部分）；状态与最后心跳。

---

## 五、Worker 管理（职员）

### 5.1 职责

- **Worker = 角色 + Person 绑定**。选择已有 Role，选择已有 Person，绑定后即生成一条 Worker（职员）；该 Worker 作为派单对象，jobs 的 assigned_worker_id 指向它。
- 一个 Person 可绑定多个 Role，故可产生多个 Worker；同一 Person 以不同角色接不同任务。

### 5.2 数据与 API（建议）

- **表**：`workers` 演进为含 **person_id**（原 runner_id）、**role_id**。
  - workers(id, company_id, role_id, **person_id**, status, max_concurrency, current_job_id, last_seen_at, created_at, updated_at)；可选保留 agent_id 表示「人」= Agent+Person。
  - 同一 person_id 可对应多行（不同 role_id），即一个 Person 绑定多个角色成多个 Worker。
- **API**：
  - `GET /api/workers?company_id=&dept_id=&role_id=&person_id=&status=`
  - `POST /api/workers/bind`：body 含 role_id, person_id（必填）, 可选 agent_id/dept_id；创建 Worker。
  - `POST /api/workers/unbind`：按 worker_id 或 (person_id, role_id) 解绑。

### 5.3 UI

- 「Worker 管理」或「职员管理」：列表（按部门/角色/Person 筛选）；「新建职员」= 选 Role + 选 Person → 绑定；解绑即删除该 Worker 记录（无进行中 Job 时允许）。

---

## 六、当前项目改造清单（如何修改）

### 6.1 数据库（internal/common/db.go）

| 项 | 改动 |
|----|------|
| **depts** | 增加列 `prompt TEXT`（部门 Prompt，可空） |
| **roles** | 新建表 `roles(id, company_id, dept_id, name, prompt, created_at, updated_at)` |
| **runners → persons** | 表改名为 **persons**；列 type（self|openclaw）, endpoint_url, config_json；见 MASTER_PLAN |
| **workers** | 增加列 role_id；约束与唯一键按「同一 person 多 role 多 Worker」调整；若先不拆 Agent，可保留 agent_id，仅加 role_id |

### 6.2 Console API（internal/console）

| 项 | 改动 |
|----|------|
| **Group(Dept)** | 新增或扩展：GET/POST/PATCH/DELETE /api/depts；创建/更新时支持 prompt |
| **Role** | 新增：GET/POST/PATCH/DELETE /api/roles；body 含 name, prompt |
| **Person** | POST /api/persons/register、heartbeat；GET /api/persons；PATCH /api/persons/:id；GET /api/person/pull?person_id=；report 用 person_id；见 MASTER_PLAN |
| **Worker** | bind 接口 body 增加 role_id，必填；列表支持按 role_id/person_id 筛选；unbind 支持按 worker_id 或 (person_id, role_id) |

### 6.3 前端（Dashboard）

| 项 | 改动 |
|----|------|
| **Group** | 设置或组织页：部门列表；新建/编辑部门；部门表单增加「部门 Prompt」输入（可空） |
| **Role** | 新增「职位/角色管理」页：列表；新建/编辑角色；表单含「角色 Prompt」 |
| **Person** | 执行器/Person 管理页：列表（类型、状态）；新建第三方 Person（type=openclaw, endpoint）；编辑 Person 配置（config 可编辑字段） |
| **Worker** | 职员管理页：列表；新建职员 = 选 Role + 选 Person → 绑定；解绑；展示当前 Job、状态 |

### 6.4 Runner/Person 侧（自建与适配器）

| 项 | 改动 |
|----|------|
| **自建 Person（bb-person，type=self）** | 从 Console 拉取 config（可选）；执行 Job 时根据 worker 的 role_id 取 Role.prompt 注入上下文 |
| **OpenClaw 适配器（type=openclaw）** | 注册 Person(type=openclaw)、拉 Job、调 OpenClaw、按 role 区分、report；可调 OpenClaw config.patch 下发非敏感配置 |

### 6.5 文档与命名

| 项 | 改动 |
|----|------|
| **NAMING.md** | 补充 Group(部门)、Role(职位)、Person(执行器)、Worker(职员)；部门/角色 Prompt；Person 类型 |
| **ARCHITECTURE.md** | 指向本文档；Runner 与 Person 的演进关系；Console 管理四块 |
| **PLAN_PERSON_WORKER_CONSOLE.md** | 与本文档对齐；可合并或保留为实施顺序参考 |

---

## 七、实施顺序建议

执行顺序以 **docs/MASTER_PLAN_RUNNER_TO_PERSON_AND_CONSOLE.md** 为准。简要：

1. **Phase 1：Runner → Person 代码与 DB**  
   internal/runner→internal/person；cmd/bb-runner→cmd/bb-person；runners→persons；workers.person_id；API 全面改为 person。
2. **Phase 2：构建与发布**  
   CI、Docker、systemd、install.sh 全部 bb-person / person。
3. **Phase 3：前端**  
   API、类型、路由、组件改为 Person/persons。
4. **Phase 4：文档全量**  
   全仓文档 Runner→Person；新增 MIGRATION_RUNNER_TO_PERSON.md。
5. **Phase 5：Console 管理扩展**  
   Group(depts.prompt)、Role(roles 表)、Person(type=self|openclaw, config_json)、Worker(role_id, person_id)；API 与 UI。

---

## 八、小结

- **Console 管理**：Group（部门，含部门 Prompt）、Role（职位，含角色 Prompt）、Person（执行器，**type=self（自建）| openclaw**）、Worker（职员 = Role + Person 绑定）。
- **Person 类型**：**self** = 本仓库 bb-person；**openclaw** = OpenClaw 适配器。执行器已全面改名为 **Person**（见 MASTER_PLAN），不再使用 Runner 作为正式名。
- **当前项目修改**：按第六节与 **docs/MASTER_PLAN_RUNNER_TO_PERSON_AND_CONSOLE.md** 逐项落地。
