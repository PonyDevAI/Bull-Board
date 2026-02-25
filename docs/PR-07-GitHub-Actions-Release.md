# PR-07：GitHub Actions（tag 自动 release）

## 目标

- push tag v*.*.* 触发 workflow
- 构建 dashboard dist + control + runner（linux amd64/arm64）
- 产出 release assets：bullboard-all-linux-{amd64,arm64}-vX.Y.Z.tar.gz、bullboard-runner-linux-{amd64,arm64}-vX.Y.Z.tar.gz、SHA256SUMS
- 创建 GitHub Release 并上传上述文件

## 修改文件清单

- `.github/workflows/release.yml`：
  - 构建 control + dashboard（pnpm），runner 分别构建 amd64/arm64（Go）
  - 打包 all：control/、dashboard/、runner/（对应 arch）、bin/bb、bin/install.sh
  - 打包 runner-only：runner/runner
  - 生成 SHA256SUMS，上传 4 个 tarball + SHA256SUMS
  - 保留 docker  job（GHCR 推送）

## 验证步骤（可复制运行）

- 在 CI 中验证：推送 tag 如 `v0.1.0`，在 Actions 页查看 Release workflow 是否成功，Release 页是否出现 4 个 tar.gz 与 SHA256SUMS。
- 本地模拟打包（可选）：
  ```bash
  pnpm run build
  cd apps/runner && go build -o runner . && cd ../..
  mkdir -p release/all/control release/all/dashboard release/all/runner release/all/bin
  cp -r apps/control/dist apps/control/migrations apps/control/package.json release/all/control/
  (cd release/all/control && npm install --omit=dev)
  cp -r apps/dashboard/dist release/all/dashboard/
  cp infra/deploy/bb infra/deploy/install.sh release/all/bin && chmod +x release/all/bin/bb
  cp apps/runner/runner release/all/runner/
  tar -czvf bullboard-all-linux-amd64-v0.1.0.tar.gz -C release/all control dashboard runner bin
  ```

## 预期输出

- Release 页含：bullboard-all-linux-amd64-vX.Y.Z.tar.gz、bullboard-all-linux-arm64-vX.Y.Z.tar.gz、bullboard-runner-linux-amd64-vX.Y.Z.tar.gz、bullboard-runner-linux-arm64-vX.Y.Z.tar.gz、SHA256SUMS。
- 用户可：`curl -fsSL https://raw.githubusercontent.com/trustpoker/bull-borad/main/infra/deploy/install.sh | bash -s install`（或设 GITHUB_REPO 后下载对应 arch 的 all 包）。
