# PR2：DB + API（公司级资源模型与员工上线）

## 变更目的

实现最小数据模型与 API：companies、workspaces(company_id)、depts、agents、runners（扩展）、workers；Runner 注册/心跳、Worker 绑定/解绑、列表查询。

## 文件列表

- internal/common/db.go（initSchemaCompanyWorkers：companies、depts、agents、workers；runners 补列；workspaces 补 company_id）
- internal/console/workers_runners.go（新增：register、heartbeat、runners list、workers bind/unbind/list）
- internal/console/server.go（路由：/api/runners/register、/api/runners/heartbeat 放行；/api/runners、/api/workers 鉴权后分发）
- docs/PR2_DB_API_SUMMARY.md

## 关键改动点

- **companies**：id, name, created_at；默认插入 id='default'。
- **depts**：id, company_id, type (plan|exec), name。
- **agents**：id, company_id, dept_id, name, roles_json, model_config_json, prompt_profile, tool_profile, is_enabled。
- **runners**：在原有 id、last_heartbeat 上增加 company_id, name, host, capabilities_json, max_concurrency, version, last_seen_at, status。
- **workers**：id, company_id, dept_id, agent_id (UNIQUE), runner_id (非 UNIQUE，方案 A)，status, max_concurrency, current_job_id, last_seen_at。
- **API**：POST /api/runners/register、POST /api/runners/heartbeat（无需 session）；GET /api/runners、GET /api/workers?dept=&status=、POST /api/workers/bind、POST /api/workers/unbind（需鉴权）。

## 验证步骤

```bash
go build ./cmd/bb ./cmd/bb-runner
# 启动 bb server，curl 测试：
# curl -X POST http://localhost:8888/api/runners/register -H "Content-Type: application/json" -d '{"runner_id":"r1","name":"runner1"}'
# curl -X POST http://localhost:8888/api/runners/heartbeat -H "Content-Type: application/json" -d '{"runner_id":"r1"}'
# 登录后 GET /api/runners、GET /api/workers
```

## 风险点与回滚

- 已有 DB 会执行 ALTER 与 INSERT OR IGNORE companies；回滚需删除新表/新列或恢复 db.go 与 workers_runners.go。
