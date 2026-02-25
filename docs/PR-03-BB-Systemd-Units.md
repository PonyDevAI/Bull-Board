# PR-03：systemd 标准化（bb.service / bb-runner.service）

## 目标

- 提供 systemd unit 模板：`bb.service`（control，端口 6666）、`bb-runner.service`（runner，默认 control_url=http://127.0.0.1:6666）
- 模板位于 repo 的 infra 目录，由安装脚本（PR-05）写入 `/etc/systemd/system/`
- 运行用户：模板中暂用 root，文档说明可改为 bullboard 等专用用户

## 修改文件清单

- `infra/deploy/templates/systemd/bb.service.tpl`：新增，control 单端口 6666，WorkingDirectory=`{{PREFIX}}/current/control`，环境变量 PORT、SQLITE_PATH、DASHBOARD_DIST，EnvironmentFile 可选 `{{PREFIX}}/config/bb.env`
- `infra/deploy/templates/systemd/bb-runner.service.tpl`：新增，WorkingDirectory=`{{PREFIX}}/current/runner`，API_BASE_URL=http://127.0.0.1:6666，SQLITE_PATH、ARTIFACTS_DIR 指向 `{{PREFIX}}/data/...`

## 验证步骤（可复制运行）

**说明**：完整验证需 Linux 环境（或 Docker 内 Linux）。以下 1～2 可在本机执行；3 需 Linux。

```bash
cd /path/to/bull-borad

# 1. 模板存在且占位正确
ls -la infra/deploy/templates/systemd/bb.service.tpl infra/deploy/templates/systemd/bb-runner.service.tpl
grep -q '{{PREFIX}}' infra/deploy/templates/systemd/bb.service.tpl && echo "PREFIX placeholder OK"
grep -q '6666' infra/deploy/templates/systemd/bb.service.tpl && echo "port 6666 OK"
grep -q 'API_BASE_URL' infra/deploy/templates/systemd/bb-runner.service.tpl && echo "runner API_BASE_URL OK"

# 2. 替换 PREFIX 后 unit 语法正确（可选，需 systemd）
# PREFIX=/opt/bull-board
# sed "s|{{PREFIX}}|$PREFIX|g" infra/deploy/templates/systemd/bb.service.tpl | systemd-analyze verify /dev/stdin 2>&1 || true

# 3. 在 Linux 上（安装完成后）：
# sudo systemctl daemon-reload
# sudo systemctl start bb
# sudo systemctl start bb-runner
# sudo systemctl status bb bb-runner
# 预期：active (running)
```

## 预期输出

- 步骤 1：两个模板文件存在，grep 输出 PREFIX placeholder OK、port 6666 OK、runner API_BASE_URL OK
- 步骤 3（Linux）：`bb` 与 `bb-runner` 均为 `active (running)`（前提：已按 PR-04/05 完成安装，current 指向有效版本且含 control/runner 与 config/data）

## 备注

- 运行用户：当前为 root；生产建议创建 `bullboard` 用户并修改 unit 中 `User=`，并保证对 `PREFIX/config`、`PREFIX/data`、`PREFIX/current` 有读写权限。
