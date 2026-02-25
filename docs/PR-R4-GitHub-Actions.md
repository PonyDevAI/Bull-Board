# PR-R4：GitHub Actions（release assets + GHCR）

打 tag v*.*.* 时自动构建并发布；命名已在 PR-R1 中与目录重命名同步。

## 触发与产物

- **触发**：push tag 匹配 `v*.*.*`
- **Release assets**：bullboard-control-linux-amd64-{tag}.tar.gz（含 control+dashboard）、bullboard-worker-linux-amd64-{tag}.tar.gz（runner）、SHA256SUMS
- **Docker**：构建并推送 ghcr.io/{owner}/bullboard-control、bullboard-dashboard、bullboard-runner，tags 为版本号与 latest

## 工作流路径（已为 R1 命名）

- 构建：pnpm build:control、pnpm build:dashboard；working-directory apps/runner 构建 runner
- 打包：apps/control/*、apps/dashboard/* → release/control（含 control/、dashboard/）；apps/runner/runner → release/worker/
- 矩阵镜像：control、dashboard、runner

## 验证

推 tag 后于 Actions 页查看 Release 与 GHCR 镜像；或本地用 act/自定义 workflow_dispatch 测试（可选）。
