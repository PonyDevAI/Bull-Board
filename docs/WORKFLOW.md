# Bull Board 工作流与 PR 规范

规划 → 执行 → 验证 → 发布的流程与 PR 规范。

## 1. PLAN（规划）

- 先阅读：`docs/AGENT_RULES.md`、`docs/WORKFLOW.md`、`docs/DEFINITION_OF_DONE.md`。
- 输出：分 PR 的实施计划、风险点。不跳过规划直接改代码。

## 2. EXECUTE（执行）

- 严格按 PLAN 中的 PR 顺序执行；一个 PR 只做一件事；不混入无关改动。
- 命名与路径遵守 `docs/NAMING.md`；禁止出现 api/web/runner-go 作为对外名称。
- 涉及部署或安装时，同步改 `docs/DEPLOY.md` 与 `infra/deploy/install.sh`（及 CI/Release 若适用）。

## 3. VERIFY（验证）

- 每个 PR 必须提供：本地验证命令、预期输出。
- 必须跑过：Lint、Build（至少 control + dashboard；改 runner 则 go build）、Test（若存在）。
- 部署/安装相关 PR 需在目标环境（local 或 docker）做一次验证。

## 4. RELEASE（发布）

- 仅当变更影响部署或对外发布时：更新 `docs/DEPLOY.md` 与 release 相关脚本（install.sh、release.yml 等）。
- 不改变 shared 数据目录结构或破坏已有数据。

## 5. PR 输出模板

每个 PR 说明中建议包含：

- **文件清单**：修改/新增文件列表。
- **验证步骤**：lint、build、（可选）本地运行命令与预期。
- **风险与回滚**：风险点、回滚方式（如 git revert）。

## 6. 与 AGENT_RULES / DEFINITION_OF_DONE 的关系

- AGENT_RULES：强制约束（数据、密钥、技术栈、命名、文档）。
- WORKFLOW：流程与 PR 规范（PLAN → EXECUTE → VERIFY → RELEASE）。
- DEFINITION_OF_DONE：单 PR 完成的判定标准（lint/build/test、文档、验证步骤）。
