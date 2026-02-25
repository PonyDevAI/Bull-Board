# Bull Board 完成定义（Definition of Done）

单个 PR 视为**完成**需满足以下条件。用于 VERIFY 阶段与 Code Review。

---

## 1. 代码与构建

- [ ] **Lint 通过**：执行项目配置的 lint（如 `pnpm lint`、`eslint`、`go vet`），无报错。
- [ ] **Build 通过**：与改动相关的构建成功：
  - 改 control/dashboard：`pnpm build:control`、`pnpm build:dashboard` 无报错。
  - 改 runner：`cd apps/runner && go build -o runner` 无报错。
- [ ] **Test**（若存在）：与本次改动相关的测试通过；若项目暂无 test，在 PR 中说明即可。

---

## 2. 验证步骤与预期

- [ ] PR 中提供**可复制执行的验证命令**（见 `docs/WORKFLOW.md` 模板）。
- [ ] 关键步骤有**预期输出**说明（如健康检查返回、页面可访问、安装脚本退出码）。
- [ ] 若涉及部署/安装，已在**目标环境**（local 或 docker）做过至少一次验证，并在 PR 中写明。

---

## 3. 文档与部署

- [ ] **对应文档已更新**：功能/配置/API 变更需同步到 `docs/` 下相关文档（如 DEPLOY、NAMING、PLAN 或专项 PR 文档）。
- [ ] **部署相关**：若影响安装、升级、卸载或发布流程，已更新：
  - `docs/DEPLOY.md`
  - `infra/deploy/install.sh`（及模板、env 示例若适用）
  - `.github/workflows/release.yml`（若影响 release assets 或 Docker 镜像）

---

## 4. 约束符合（见 AGENT_RULES）

- [ ] 未修改 shared 数据目录内容；未提交密钥/密码。
- [ ] 未引入 Postgres/Redis；仍使用 SQLite + SQLite jobs。
- [ ] 对外命名仅使用 dashboard/control/runner；无 api/web/runner-go。

---

## 5. 风险与回滚

- [ ] PR 中已简要说明**风险点**与**回滚方式**（如 revert、配置回退、数据兼容）。

---

满足以上条件后，该 PR 可视为符合「完成定义」，可合并并在需要时进入 RELEASE 流程。
