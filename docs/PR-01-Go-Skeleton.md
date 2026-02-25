# PR-01：Go 工程骨架与命令树

## 目标

- 新增根目录 Go 模块与 cmd/bb、cmd/bb-runner
- Cobra 根命令 + server 子命令 + version
- internal/control、internal/cli、internal/common、internal/runner 目录规划
- bb server 最小实现：/api/health + 静态托管占位（无文件则 404），读取 config

## 修改文件清单

| 文件 | 说明 |
|------|------|
| `go.mod` | 根模块 `github.com/trustpoker/bull-borad`，依赖 cobra |
| `cmd/bb/main.go` | bb 入口，执行 Cobra root |
| `cmd/bb-runner/main.go` | bb-runner 入口（stub，PR-04 实现） |
| `internal/cli/root.go` | Cobra root，--prefix/--port，挂 server/version |
| `internal/cli/server.go` | server 子命令，启动 control.Server |
| `internal/cli/version.go` | version 子命令 |
| `internal/control/server.go` | HTTP 服务：/api/health、/health、/ 静态或 404 |
| `internal/control/version.go` | Version 变量（构建可注入） |
| `internal/control/version_test.go` | 简单测试 |
| `internal/common/config.go` | LoadServerConfig(PREFIX)，读 bb.json 与默认值 |
| `internal/runner/runner.go` | 占位，PR-04 实现 |

## 验证步骤

```bash
cd /path/to/bull-borad

go mod tidy
go test ./...
go build -o bb ./cmd/bb
go build -o bb-runner ./cmd/bb-runner

./bb version
# 预期：bb dev

./bb server --prefix /tmp/bb-test &
sleep 1
curl -s http://localhost:6666/api/health
# 预期：{"ok":true,"service":"bb","version":"dev",...}
curl -s -o /dev/null -w "%{http_code}" http://localhost:6666/
# 预期：404（无 static 目录时）
pkill -f './bb server'
```

## 预期输出

- `go test ./...`：PASS
- `./bb version`：`bb dev`
- `curl http://localhost:6666/api/health`：JSON 含 ok、service、version、uptime、paths
- 无 dashboard dist 时 `GET /` 返回 404
