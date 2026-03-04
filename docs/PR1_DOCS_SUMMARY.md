# PR1：文档更新（术语 + 权威架构）

## 变更目的

- 全仓文档对外名统一为 **console**（无 control 正式名）；Runner/Worker/Agent 定义统一且不混用。
- 补全 NAMING、AGENT_RULES，增强 ARCHITECTURE：方案 A（一 Runner 多 Worker）、assigned_worker_id 强指派、Runner 拉取规则、goroutine + 双层并发 + 每 job 独立 workdir。
- PLAN/ROADMAP 修正“Runner 当 Agent”表述，指向 ARCHITECTURE。

## 文件列表

- docs/NAMING.md
- docs/AGENT_RULES.md
- docs/ARCHITECTURE.md
- docs/PLAN.md
- docs/ROADMAP_MULTI_AGENT.md
- docs/_ITERATION_FILE_LIST.md（迭代清单，可选保留）
- docs/PR1_DOCS_SUMMARY.md（本摘要）

## 关键改动点

- **NAMING.md**：补充 agent（员工档案）、dept(group) plan/exec；worker 说明含 assigned_worker_id。
- **AGENT_RULES.md**：对外名称白名单增加 worker；术语一致：runner=进程，worker=绑定实体，agent=档案。
- **ARCHITECTURE.md**：Console 职责（方案组对话+编排）；Agent=档案、Worker=绑定实体；**§2 方案 A** 一 Runner 多 Worker、拉取规则、续租/回收；**§3.2 Runner 执行模型** 双层并发、独立 workdir、超时、artifacts。
- **PLAN.md**：Runner 描述改为按 assigned_worker_id 领取、双层并发与独立 workdir，指向 ARCHITECTURE。
- **ROADMAP_MULTI_AGENT.md**：Agent=档案、方案 A、assigned_worker_id、Runner 拉取与执行模型，指向 ARCHITECTURE。

## 验证步骤

```bash
go build ./cmd/bb ./cmd/bb-runner
# 全仓检查：除 MIGRATION/PR_SUMMARY/历史说明外，无 control 作正式名
rg -l 'control|bullboard-control' --glob '*.md' .   # 仅 MIGRATION*、PR_SUMMARY*、_ITERATION* 出现为预期
```

## 风险点与回滚

- 仅文档变更，无代码/DB 变更；回滚即还原上述文件。
