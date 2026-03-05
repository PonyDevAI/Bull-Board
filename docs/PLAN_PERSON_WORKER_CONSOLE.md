# 方向：Person（执行器）+ 人 + Worker（职员）+ Console 配置管理

本文档按你的目标整理命名、数据模型和 Console 职责，作为后续改代码的规划依据。

- **执行器已全面改名为 Person**（Runner 不再使用）；Person 类型为 **self**（自建）或 **openclaw**（第三方）。
- **总方案与全量改动清单**：**docs/MASTER_PLAN_RUNNER_TO_PERSON_AND_CONSOLE.md**
- **Console 配置管理详细设计**：**docs/ARCHITECTURE_CONSOLE_MANAGEMENT.md**
- **迁移说明**：**docs/MIGRATION_RUNNER_TO_PERSON.md**

---

## 一、核心定位

- **产品**：个人工作台（个人公司）、个人私有空间。
- **Console**：配置与管理中心——管理部门(Group)、管理人、管理职员(Worker)。

---

## 二、命名与层级（统一约定）

| 概念 | 英文/表名 | 说明 |
|------|-----------|------|
| **部门** | Group / Dept | 公司级部门，如 plan / exec。 |
| **职位/角色** | Role | 角色 = 职位（如方案员、执行员）。 |
| **执行器** | **Person**（原 Runner） | 跑任务的进程/躯体；改名为 Person。 |
| **人** | Agent + Person 绑定 | 档案(Agent) 绑定到执行器(Person) = 一个能干活的人。 |
| **职员** | **Worker** | 人 + 角色 = 为人绑定职位后的派单对象；jobs 指派给 Worker。 |

关系一句话：

- **Group** = 部门  
- **Role** = 职位  
- **人** = Agent + Person（执行器）  
- **Worker（职员）** = 人 + Role  
- **Runner 改名为 Person**（执行器叫 Person）

---

## 三、Runner → Person 改名范围（执行器改名为 Person）

与「Runner 改 Node」范围相同，只是目标词改为 **Person**：

| 类型 | 旧 (Runner) | 新 (Person) |
|------|-------------|------------|
| 表名 | runners | **persons** |
| 外键/字段 | runner_id | **person_id** |
| 二进制/进程 | bb-runner | **bb-person** |
| API 路径 | /api/runners, /api/runner | **/api/persons**, **/api/person** |
| 请求/响应字段 | runner_id | **person_id** |
| 环境变量 | RUNNER_ID | **PERSON_ID** |
| systemd / 脚本 | bb-runner.service | **bb-person.service** |
| Docker / CI | runner 相关 | **person** 相关 |

代码与目录：

- `internal/runner` → **internal/person**
- `cmd/bb-runner` → **cmd/bb-person**
- 注释/文档中 Runner（执行器）→ **Person**

---

## 四、数据模型（与当前实现的对应）

### 4.1 当前 → 目标

| 当前 | 目标 |
|------|------|
| runners 表 | **persons** 表（执行器） |
| workers 表：agent_id, runner_id, dept_id, ... | workers 表 = **职员**：agent_id, **person_id**, **role_id**（或 dept_id 兼作职位），… |
| 人 | 无单独表；**人** = (agent_id, person_id)，即职员行里的 agent+person 部分 |

### 4.2 建议表结构（迁移后）

- **persons**（执行器，原 runners）  
  - id, company_id, name, host, capabilities_json, max_concurrency, version, last_seen_at, status, last_heartbeat

- **workers**（职员 = 人 + 角色）  
  - id, company_id, dept_id, agent_id, **person_id**（原 runner_id）, **role_id**（职位，可新建 roles 表或先用 dept_id 表示）, status, max_concurrency, current_job_id, last_seen_at, created_at, updated_at  
  - 约束：同一 (agent_id, person_id) 可有多行（不同 role），或同一 (agent_id, person_id, role_id) 唯一，依业务定。

- **roles**（可选，职位）  
  - id, company_id, name, dept_id（可选）  
  - 若暂不建表，可用 dept_id 或固定枚举（plan/exec）当职位。

- **人**：不单独建表，由「Agent + Person 绑定」表示；在 UI 上可做「人」列表 = 所有 (agent_id, person_id) 或所有 worker 行去重 (agent_id, person_id)。

---

## 五、Console 配置管理（你要走的方向）

Console 负责三块配置与管理：

1. **管理 Group（部门）**  
   - 增删改部门；部门类型 plan/exec 等。  
   - 对应表：depts（已有）。

2. **管理 Person（执行器）**  
   - 执行器注册、心跳、列表；可读 name/host/status/capabilities。  
   - 对应：persons 表（原 runners）+ 现有 register/heartbeat/list API 改名。

3. **管理人**  
   - 「人」= Agent + Person 绑定。  
   - 管理方式二选一或并存：  
     - 方式 A：在「职员(Worker)」管理里一起做——创建/编辑职员时选 Agent、选 Person、选 Role，即同时完成「人」的绑定与「职员」的生成。  
     - 方式 B：单独「人」管理（列表 = 所有 agent+person 绑定），再在「职员」管理里为人选角色。  
   - 对应：agents 表 + persons 表；绑定关系落在 workers 行（agent_id + person_id）。

4. **管理职员 Worker**  
   - 职员 = 人 + 角色。  
   - 列表/编辑：按部门(Group)筛选、显示职位(Role)、当前任务、在线状态；创建/编辑时选人(agent+person)、选角色(role)。  
   - 对应：workers 表（含 person_id, role_id）。

逻辑总结：**Console 配置管理 Group、配置管理 Person（执行器）、配置管理人（Agent+Person）、管理职员 Worker（人+角色）**——这个逻辑是对的，按上面实现即可。

---

## 六、API 与前端（改名与扩展）

- **Person（执行器）**  
  - POST /api/persons/register  
  - POST /api/persons/heartbeat  
  - GET /api/persons  
  - 原 /api/runner/pull、/api/jobs/:id/report 中 runner_id → **person_id**。

- **Worker（职员）**  
  - GET /api/workers?dept=&status=&role=  
  - POST /api/workers/bind：body 含 agent_id, **person_id**, role_id（或 dept_id）  
  - POST /api/workers/unbind  
  - 拉取/上报逻辑不变，仅 runner_id → person_id。

- **前端**  
  - 侧栏/路由：Runners → **Persons**（或「执行器」）。  
  - Workers 页：展示职员（人+角色）、可筛选部门/职位；创建/编辑职员时选 Agent、Person、Role。

---

## 七、实施顺序建议

1. **Phase 1：Runner → Person 全量改名**  
   表/字段/二进制/API/脚本/文档（见第三节），不改变业务逻辑，仅命名统一为 Person。

2. **Phase 2：Worker 增加角色(职位)**  
   workers 表加 role_id（或先用 dept_id 表示职位）；bind API 与 UI 支持选角色；Console「管理职员」能为人绑定角色。

3. **Phase 3：Console 配置管理完善**  
   - 管理 Group（部门）  
   - 管理 Person（执行器）  
   - 管理人（Agent+Person 绑定）与 管理职员（Worker）  
   按上面第五节实现或迭代。

4. **Phase 4（可选）**  
   roles 表、更细的职位与权限。

---

## 八、小结

- **Group** = 部门；**Role** = 职位；**人** = Agent + Person（执行器）；**Worker** = 职员 = 人 + 角色。  
- **Runner 改名为 Person**（执行器），全仓一致：表/API/二进制/进程/脚本/文档。  
- **Console**：配置管理 Group、配置管理 Person、配置管理人、管理职员 Worker；逻辑正确，按此方向实现即可。

后续改代码时按 Phase 1 → 2 → 3 推进，可再拆成具体 PR/任务列表。

---

## 九、Person 的配置（模型 key 等）：Console 下发 vs 运行 Person 时配置

### 9.1 两种方式

| 方式 | 做法 | 优点 | 缺点 |
|------|------|------|------|
| **Console 下发** | Console 存每个 Person 的配置（API keys、model、env 等）；Person 注册/心跳时拉取，或 Console 在「管理 Person」里推送 | 集中管理、可审计、改 key 不用登机器 | 需安全传输与存储；Person 必须能连 Console |
| **运行 Person 时配置** | 部署 Person 的机器上：环境变量、配置文件、挂载的 secret（如 `OPENAI_API_KEY`） | 简单、key 不经过 Console、符合现有 bb-person 的 env 习惯 | 分散、换 key 要改每台机器 |

### 9.2 推荐：混合

- **敏感 key（API key 等）**：在**运行 Person 的机器上**配置（env / 配置文件 / 云 secret），不经过 Console，降低泄露面。
- **非敏感或策略类**：由 **Console 下发**（如默认 model、超时、并发数、能力开关）。Person 启动或定时从 Console 拉取，或 Console 在 Person 管理页「下发配置」触发。
- 若将来要做「个人工作台内统一改 key」，可做「Console 加密存储 + Person 用临时 token 拉取解密后的配置」，需额外设计安全与轮换。

结论：**模型 key 等敏感信息建议运行 Person 时配置；其它可 Console 下发。**

---

## 十、一个 Person 能否绑定多个角色？

**可以。**

- 数据模型：**Worker（职员）= 人(Agent+Person) + 角色**。同一对 (agent_id, person_id) 可以对应**多行 Worker**，每行一个 role_id。
- 即：同一个「人」（同一个 Agent 绑定在同一个 Person 上）可以拥有**多个职位**，形成多个 Worker；派单时指定 assigned_worker_id 到不同 Worker，即同一 Person 以不同角色接不同任务。
- **一个 Person** 上可以有多个人（多个 Agent 绑定到同一 Person），每个人又可以绑定多个角色，所以**一个 Person 上可以有多个 Worker（多角色）**。

---

## 十一、OpenClaw 作为 Person 时，绑定多个角色执行不同任务？

**可以。**

- 一个 OpenClaw 实例 = **一个 Person**（执行器）。为该 Person 绑定一个或多个 Agent；每个 (Agent, Person) 可以再绑定多个角色，得到多个 Worker。
- 例如：一个 OpenClaw Person + 一个 Agent，绑定角色「方案员」与「执行员」→ 两个 Worker。任务派给「方案员」Worker 时，payload 或路由带 role=plan；派给「执行员」Worker 时带 role=exec。适配器（或 OpenClaw 侧）根据 assigned_worker_id 对应的角色，选择不同 prompt/model/工具执行。
- 这样**同一个 OpenClaw 可以以不同角色接不同任务**，执行不同职责（方案评审、代码执行等）；只需在适配器里按 Worker/角色区分请求即可。
