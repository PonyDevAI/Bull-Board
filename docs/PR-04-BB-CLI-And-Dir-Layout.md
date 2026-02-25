# PR-04：bb CLI（/usr/local/bin/bb）与目录规范

## 目标

- 实现 bb CLI（bash），支持 install/upgrade/uninstall/status/logs/restart/doctor
- 目录规范：PREFIX/versions/<version>/、PREFIX/current -> versions/<version>、PREFIX/config/、PREFIX/data/db|artifacts|worktrees|uploads
- install 默认 all，安装 control + dashboard 产物 + runner，启用 systemd（Linux）
- 安装完成输出 Panel URL 与 bb status

## 修改文件清单

- `infra/deploy/bb`：新增，bb CLI 脚本（bash）
- `infra/deploy/install.sh`：重写为 bb 目录规范
  - 使用 versions/、config/、data/（不再 shared/、releases/）
  - 使用 bb.service、bb-runner.service（不再 bullboard-control、bullboard-runner）
  - 组件名 runner（不再 worker），端口 6666
  - install_from_repo 产出 versions/<v>/control、dashboard、runner
  - install_local 创建 config/、data/db|artifacts|worktrees|uploads，复制 bb 与 install.sh 到 PREFIX/bin，root 时安装 bb 到 /usr/local/bin
- `infra/deploy/templates/env/bullboard.env.example`：仍可选；install 生成 config/bb.env

## 验证步骤（可复制运行）

```bash
cd /path/to/bull-borad

# 1. 构建
pnpm run build
# 若有 Go：cd apps/runner && go build -o runner
# 若无 Go：echo '#!/bin/sh' > apps/runner/runner && chmod +x apps/runner/runner  # stub

# 2. 从仓库安装（非 root 仅创建目录与复制，不装 systemd）
PREFIX=/tmp/bb-test bash infra/deploy/install.sh install --from-repo --prefix /tmp/bb-test
# 预期：Version: dev，Panel: http://...:6666

# 3. bb status / doctor（使用同 PREFIX）
bash infra/deploy/bb status --prefix /tmp/bb-test
bash infra/deploy/bb doctor --prefix /tmp/bb-test

# 4. 目录结构
ls -la /tmp/bb-test/
ls -la /tmp/bb-test/current
ls /tmp/bb-test/versions/
# 预期：current -> versions/dev，有 config/、data/、versions/dev/control|dashboard|runner

# 5. 清理
rm -rf /tmp/bb-test
```

## 预期输出

- install 输出含 "Version: dev"（或指定版本）、"Panel: http://...:6666"
- bb status 显示 PREFIX、Version、Panel（Linux 下还有 Services）
- bb doctor 显示 PREFIX、PORT、current 链接、node、systemd/API 状态
- 目录含 versions/<v>/control（含 dist）、versions/<v>/dashboard/dist、versions/<v>/runner/runner，以及 config/、data/db、data/artifacts 等

## 备注

- 完整 systemd 验证需 Linux：sudo 运行 install 后 systemctl start bb bb-runner 并访问 http://localhost:6666
- bb 查找 install.sh：先与 bb 同目录，再 PREFIX/bin/install.sh（安装后由 install.sh 写入）
