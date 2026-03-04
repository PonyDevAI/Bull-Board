# 最终方案迭代 — 需改文件清单（搜索摘要）

## 全仓搜索涉及：control / Runner / Worker / Agent / Workspace / Group

| 类别 | 文件 | 说明 |
|------|------|------|
| 文档 | docs/NAMING.md | 补 agent/dept 权威表述 |
| 文档 | docs/AGENT_RULES.md | 白名单加 worker |
| 文档 | docs/ARCHITECTURE.md | 方案 A、双层并发、workdir、assigned_worker_id |
| 文档 | docs/PLAN.md | Runner≠Agent，指向 ARCHITECTURE |
| 文档 | docs/ROADMAP_MULTI_AGENT.md | 同上 |
| 文档 | docs/MIGRATION_*.md, PR_SUMMARY_*.md | 仅历史，保留 control 作废弃名 |
| 后端 | internal/console/*.go | API/状态机，PR2–PR4 扩展 |
| 后端 | internal/runner/*.go | PR4 执行循环 |
| 后端 | cmd/bb-runner/main.go | Runner 入口 |
| 迁移 | apps/console/migrations/001_initial.sql | 现有；PR2 新增 002_company_workers.sql |
| 前端 | apps/dashboard/* | PR5 Workers 页、Task 卡片 worker |
| 前端 | apps/console/src/routes/* | 若有 workspace 等，术语一致 |

**硬检查**：对外正式名仅 console/runner/worker/dashboard；runner=进程，worker=绑定实体，agent=档案。
