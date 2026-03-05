# 最终方案迭代 — 需改文件清单（搜索摘要）

## 全仓涉及：Person（原 Runner）/ Worker / Agent / Workspace / Group / Role

**执行器已全面改名为 Person**（类型 self / openclaw）。总方案与完整清单见 **docs/MASTER_PLAN_RUNNER_TO_PERSON_AND_CONSOLE.md**。

| 类别 | 文件 | 说明 |
|------|------|------|
| 总方案 | docs/MASTER_PLAN_RUNNER_TO_PERSON_AND_CONSOLE.md | Runner→Person 全量清单 + Console 管理 Phase |
| 文档 | docs/NAMING.md | Person、self/openclaw、部署产物 bb-person |
| 文档 | docs/AGENT_RULES.md | 白名单 person/worker；术语 person=执行器 |
| 文档 | docs/ARCHITECTURE.md | Person/Worker/Agent；方案 A；指向 MASTER_PLAN |
| 文档 | docs/ARCHITECTURE_CONSOLE_MANAGEMENT.md | Group/Role/Person/Worker 配置管理；type self|openclaw |
| 文档 | docs/PLAN.md | Person 执行器、persons 表、person_id |
| 文档 | docs/ROADMAP_MULTI_AGENT.md | persons、/api/persons |
| 文档 | docs/MIGRATION_RUNNER_TO_PERSON.md | 旧名→新名、升级步骤 |
| 后端 | internal/**person**/*.go | 原 internal/runner；Person 实现 |
| 后端 | cmd/**bb-person**/main.go | 原 cmd/bb-runner；Person 入口 |
| 后端 | internal/console/*.go | API /api/persons、/api/person；persons 表；workers.person_id |
| 前端 | apps/dashboard/* | Persons 页、person_id、getPersons；Workers 页 |
| 构建/CI | .github/workflows/release.yml, infra/deploy/* | bb-person、bullboard-person |
| 部署 | docs/DEPLOY.md, install.sh | bb-person.service |

**硬检查**：对外正式名仅 console/**person**/worker/dashboard；**person=执行器**（type self|openclaw），worker=职员（Role+Person 绑定），agent=档案。
