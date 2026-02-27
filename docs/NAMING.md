# Bull Board 对外命名规范

部署与文档统一使用以下对外名称（业务逻辑与源码目录不变）：

| 对外名称 | 说明 | 源码目录 | 部署工件示例 |
|----------|------|----------|--------------|
| **dashboard** | 前端 | `apps/dashboard` | bullboard-dashboard（镜像/服务名） |
| **control** | Control Plane（Go bb server + 状态机 + SQLite + SSE） | `cmd/bb`（内部实现 `internal/control`） | bullboard-control（镜像/服务名/ systemd unit） |
| **runner** | Go 执行器 | `apps/runner` | bullboard-runner（镜像/服务名/ systemd unit） |

## Release Assets（PR-D3）

- **bullboard-control-linux-amd64-vX.Y.Z.tar.gz**：含 control + dashboard（不包含 shared 数据）
- **bullboard-worker-linux-amd64-vX.Y.Z.tar.gz**：runner 二进制
- **SHA256SUMS**：上述文件的 sha256

## Docker 镜像与 Compose

- 镜像：`bullboard-control`、`bullboard-dashboard`、`bullboard-runner`
- Compose services：`control`、`dashboard`、`runner`
- Profiles：**control**（dashboard + control）、**worker**（runner）

## Systemd

- **bullboard-control.service**：Control Plane
- **bullboard-runner.service**：Runner
