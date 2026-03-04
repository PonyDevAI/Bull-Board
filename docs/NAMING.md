# Bull Board 对外命名规范

部署与文档统一使用以下对外名称（业务逻辑与源码目录不变）：

| 对外名称 | 说明 | 源码目录 | 部署工件示例 |
|----------|------|----------|--------------|
| **dashboard** | 前端（Workspace 的 UI 视图） | `apps/dashboard` | bullboard-dashboard（镜像/服务名） |
| **console** | Console 控制台服务（Go bb server + 状态机 + SQLite + SSE） | `cmd/bb`（内部实现 `internal/console`） | bullboard-console（镜像/服务名/ systemd unit） |
| **runner** | Runner 执行器进程/客户端 | `apps/runner` / `cmd/bb-runner` | bullboard-runner（镜像/服务名/ systemd unit） |
| **worker** | Agent+Runner 绑定后的「上线员工」业务实体，派单对象 | 逻辑实体 | — |
| **workspace** | 工作空间（多 Workspace 属 Company） | 数据/API | — |
| **company** | 公司（多 Workspace） | 数据/API | — |
| **group** | 公司级部门（plan/exec） | 数据/API | — |

## Release Assets（PR-D3）

- **bullboard-all-linux-amd64-vX.Y.Z.tar.gz**：含 console + dashboard（不包含 shared 数据）
- **bullboard-runner-linux-amd64-vX.Y.Z.tar.gz**：runner 二进制
- **SHA256SUMS**：上述文件的 sha256

## Docker 镜像与 Compose

- 镜像：`bullboard-console`、`bullboard-dashboard`、`bullboard-runner`
- Compose services：`console`、`dashboard`、`runner`
- Profiles：**console**（dashboard + console）、**worker**（runner）

## Systemd

- **bb.service**：Console 控制台服务（Go bb server）
- **bullboard-console.service**：可选，Node 版 Console（若使用）
- **bullboard-runner.service**：Runner

详见 docs/ARCHITECTURE.md 中 Company/Workspace/Dashboard、Agent/Runner/Worker 的权威定义。
