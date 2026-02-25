# PR-R3：install.sh 全量适配

install.sh 在 PR-R1 中已按 **control / dashboard / runner** 路径与命名全量适配，功能满足需求。

---

## 1. 功能清单（已实现）

| 项目 | 状态 |
|------|------|
| 子命令 install / upgrade / uninstall / status / version | ✅ |
| --mode local \| docker（默认 local） | ✅ |
| --component control \| worker \| all（默认 all） | ✅ |
| --version latest \| vX.Y.Z（默认 latest） | ✅ |
| --prefix（默认 /opt/bull-board） | ✅ |
| --purge-data（仅 uninstall） | ✅ |
| --from-repo（从仓库构建目录安装） | ✅ |
| Local：systemd（bullboard-control、bullboard-runner）+ nginx 模板 + shared（data/artifacts/worktrees/config） | ✅ |
| Docker：compose 与 .env 渲染到 $PREFIX/shared/docker/，按 component 执行 profile up -d | ✅ |
| Release 下载：bullboard-control-*、bullboard-worker-*、SHA256SUMS | ✅ |

---

## 2. 本地验证步骤

### 从仓库安装（dry-run 式：只装到临时目录并检查）
```bash
cd /path/to/bull-borad
pnpm build:control && pnpm build:dashboard
# 若有 Go：cd apps/runner && go build -o runner && cd ../..

./infra/deploy/install.sh install --from-repo --prefix /tmp/bb-r3 --component all
# 预期：/tmp/bb-r3/releases/<version>/control 与 worker 有内容；/tmp/bb-r3/current 指向该版本

./infra/deploy/install.sh status --prefix /tmp/bb-r3
./infra/deploy/install.sh version --prefix /tmp/bb-r3

./infra/deploy/install.sh uninstall --prefix /tmp/bb-r3
# 可选：--purge-data 清空 shared
```

### Docker 模式
```bash
./infra/deploy/install.sh install --from-repo --mode docker --prefix /tmp/bb-docker --component control
# 预期：$PREFIX/shared/docker 有 docker-compose.yml 与 .env；docker compose up 已执行（需本机有 Docker）
```

---

## 3. 修改文件清单

- **infra/deploy/install.sh**：在 PR-R1 中已更新 apps/control、apps/dashboard、apps/runner 路径及 pnpm build:control 等提示。

**结论**：PR-R3 与 PR-R1 一并完成，无单独提交。
