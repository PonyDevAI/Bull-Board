# PR-04: Go Runner（SQLite queue worker）

## 修改文件清单

- `apps/runner-go/go.mod` - module + modernc.org/sqlite
- `apps/runner-go/main.go` - 领 job（事务 SELECT + UPDATE）、VERIFY/CODE_CHANGE/SUBMIT 执行、git worktree、artifacts 落盘、回调 POST /api/runner/report、job 状态与重试 backoff

## 配置（环境变量）

- `SQLITE_PATH` - 默认 `data/bullboard.db`
- `ARTIFACTS_DIR` - 默认 `artifacts`
- `RUNNER_ID` - 默认 `runner-1`
- `MAX_CONCURRENCY` - 默认 1
- `LEASE_SECONDS` - 租约时长，默认 600
- `API_BASE_URL` - 默认 `http://localhost:3000`（用于 report 回调）
- `BACKOFF_BASE_SECS` - 重试间隔基数，默认 30

## 启动命令

```bash
# 需安装 Go 1.21+
cd apps/runner-go
go mod tidy
go build -o runner .
# 从仓库根目录运行（保证 SQLITE_PATH/ARTIFACTS_DIR 相对路径正确）
SQLITE_PATH=./data/bullboard.db ARTIFACTS_DIR=./artifacts API_BASE_URL=http://localhost:3000 ./runner
```

或从仓库根：`cd bull-board && SQLITE_PATH=./data/bullboard.db ./apps/runner-go/runner`

## 验证步骤

1. 启动 API（见 PR-02），创建 workspace + task，POST /api/tasks/:id/enqueue 入队一条 VERIFY job（payload 中 workspace.repo_path 指向已有 git 仓库，verify.commands 如 `["echo ok"]`）。
2. 启动 Runner（同上），观察日志；Runner 领取 job 后执行 commands，写 artifacts，调用 /api/runner/report。
3. GET /api/tasks/:id 中 task 应为 done，runs 中该 run 为 succeeded；GET /api/tasks/:id/runs 中 artifacts 含 log/report/diff（路径为 artifacts/<runId>/...）。
