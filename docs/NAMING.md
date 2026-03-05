# Bull Board 对外命名规范

部署与文档统一使用以下对外名称。**执行器已全面改名为 Person**（不再使用 Runner）；总改动清单见 **docs/MASTER_PLAN_RUNNER_TO_PERSON_AND_CONSOLE.md**。

---

## 核心名称

| 对外名称 | 说明 | 源码/数据 | 部署工件示例 |
|----------|------|-----------|--------------|
| **dashboard** | 前端（Workspace 的 UI 视图） | `apps/dashboard` | bullboard-dashboard（镜像/服务名） |
| **console** | Console 控制台服务（Go bb server + 状态机 + SQLite + SSE） | `cmd/bb`（`internal/console`） | bullboard-console（镜像/服务名/ systemd unit） |
| **person** | Person 执行器进程/客户端；类型 **self**（自建）或 **openclaw**（第三方） | `internal/person` / `cmd/bb-person` | bullboard-person（镜像/服务名/ systemd unit） |
| **worker** | 职员 = Role + Person 绑定，派单对象；jobs 强指派 assigned_worker_id | 数据/API | — |
| **workspace** | 工作空间/项目运行域（多 Workspace 属 Company） | 数据/API | — |
| **company** | 公司级租户（多 Workspace） | 数据/API | — |
| **agent** | 员工档案（静态配置：roles/model/prompt/tool_profile/权限等） | 数据/API | — |
| **dept(group)** | 公司级部门：plan（方案组）/ exec（执行组）；可配置部门 Prompt（可空） | 数据/API | — |
| **role** | 职位/角色；可配置角色 Prompt，与 Person 绑定后成 Worker | 数据/API | — |

- **Person 类型**：**self** = 本仓库 bb-person 自建执行器；**openclaw** = OpenClaw 适配器。全仓不再使用 runner/Runner 作为执行器正式名。
- Console 对 Group / Role / Person / Worker 的配置管理详见 **docs/ARCHITECTURE_CONSOLE_MANAGEMENT.md**。

---

## Release Assets（PR-D3）

- **bullboard-all-linux-amd64-vX.Y.Z.tar.gz**：含 console + dashboard（不包含 shared 数据）
- **bullboard-person-linux-amd64-vX.Y.Z.tar.gz**：person 执行器二进制（bb-person）
- **SHA256SUMS**：上述文件的 sha256

## Docker 镜像与 Compose

- 镜像：`bullboard-console`、`bullboard-dashboard`、**bullboard-person**
- Compose services：`console`、`dashboard`、**person**
- Profiles：**console**（dashboard + console）、**worker**（person）

## Systemd

- **bb.service**：Console 控制台服务（Go bb server）
- **bullboard-console.service**：可选，Node 版 Console（若使用）
- **bb-person.service** / **bullboard-person.service**：Person 执行器（原 Runner）

详见 **docs/ARCHITECTURE.md** 与 **docs/MASTER_PLAN_RUNNER_TO_PERSON_AND_CONSOLE.md**。
