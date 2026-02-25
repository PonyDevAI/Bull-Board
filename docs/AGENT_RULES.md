# Bull Board 长期维护与交付代理规则

代理在维护与交付 Bull Board 时的强制约束与默认工作流。所有 PR 与发布必须符合本规则。

## 1. 默认工作流

1. **PLAN**：先读 docs/AGENT_RULES.md、docs/WORKFLOW.md、docs/DEFINITION_OF_DONE.md；给出分 PR 的实施计划与风险点。
2. **EXECUTE**：严格按计划逐 PR 修改；每个 PR 只做一件事；不混入无关改动。
3. **VERIFY**：每个 PR 提供本地验证命令与预期输出；必须跑过 lint/build（必要时 test）。
4. **RELEASE**：若涉及部署/发布，必须更新 docs/DEPLOY.md 与 release 相关脚本。

## 2. 强制约束

- 数据与密钥：不允许改 shared 数据目录内容；不允许提交密钥、Token、密码。
- 技术栈：不允许引入 Postgres/Redis。当前版本使用 SQLite + SQLite jobs 队列表。
- 命名规范：对外与文档、部署、脚本仅使用 dashboard（前端）、control（Control Plane）、runner（Go 执行器）。禁止出现 api/web/runner-go 作为对外名称。
- 文档与部署：所有变更必须更新对应文档；若影响部署或安装，必须同步更新 install.sh 与 DEPLOY.md（及 CI/Release 若适用）。

## 3. 每个 PR 输出格式

- 文件清单：本 PR 修改/新增的文件列表。
- 命令验证步骤：可复制执行的本地命令与预期输出（含 lint/build，必要时 test）。
- 风险/回滚方式：可能影响点与回滚方式。

## 4. 参考文档

- 部署与安装：docs/DEPLOY.md
- 对外命名：docs/NAMING.md
- 工作流与 PR 规范：docs/WORKFLOW.md
- 完成定义：docs/DEFINITION_OF_DONE.md
