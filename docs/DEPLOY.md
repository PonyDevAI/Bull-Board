# Bull Board（bb）部署指南

本文档说明 **local** 与 **docker** 两种部署模式。唯一入口：**一条命令安装** 或 **bb 命令**。

---

## 一条命令安装

```bash
curl -fsSL https://raw.githubusercontent.com/PonyDevAI/Bull-Board/main/infra/deploy/install.sh | bash
```

- **默认**：local 模式、全部组件（bb + bb-runner）、最新版本、前缀 `/opt/bull-board`、端口 **6666**。
- 可通过环境变量覆盖：`VERSION`、`MODE`、`COMPONENT`、`PREFIX`、`PORT`。
- 安装完成后会输出 Panel URL 与 `bb status`；访问 http://your-host:6666 即可使用。

---

## 目录规范

- **prefix** 默认：`/opt/bull-board`。
- **data** 持久化目录：`/opt/bull-board/data`（升级不覆盖），含：
  - `data/db/bb.sqlite`：SQLite 数据库
  - `data/artifacts/`：执行器产出
  - `data/worktrees/`：git worktree
  - `data/uploads/`：上传文件
- **config**：`/opt/bull-board/config/`（持久化），含 `bb.json`（如 TLS 配置）、可选 `bb.env`。
- **versions**：`/opt/bull-board/versions/<version>/` 为每次安装/升级的程式与看板产物；`current` 符号链接指向当前版本。

---

## Local 模式（默认）

- **bb.service**：看板 + API + SSE，单端口 **6666**（无 nginx）。
- **bb-runner.service**：执行器，默认连接 `http://127.0.0.1:6666`。
- 安装脚本会安装 systemd 单元并启动；日常管理用 **bb** 命令（见 [CLI_SPEC.md](CLI_SPEC.md)）。

### 安装 / 升级 / 卸载

```bash
# 从 release 安装（需已存在 GitHub release）
curl -fsSL ... | bash -s install

# 从仓库安装（先构建后执行）
./infra/deploy/install.sh install --from-repo --prefix /opt/bull-board

# 升级（由 install.sh 负责，bb 不提供 install/upgrade/uninstall）
./infra/deploy/install.sh upgrade
# 或 curl -fsSL ... | bash -s upgrade

# 卸载（默认保留 data）
./infra/deploy/install.sh uninstall
# 彻底删除 data：./infra/deploy/install.sh uninstall --purge-data
```

---

## Docker 模式

- 使用 `--mode docker` 时，安装脚本会准备 `$PREFIX/docker` 下的 compose 与 env。
- 需自行在 `$PREFIX/docker` 执行 `docker compose up -d`；具体镜像与编排见 `infra/docker/`。
- 数据仍建议挂载 `$PREFIX/data`、`$PREFIX/config`，与 local 一致。

---

## TLS（同端口 6666）

- 默认：**http**://host:6666。
- 启用 TLS 后：**https**://host:6666（同端口，不同时提供 HTTP）。

启用方式：

```bash
bb tls enable --self-signed    # 自签证书
bb tls enable --cert /path/to/cert.pem --key /path/to/key.pem
bb restart control
```

关闭 TLS：`bb tls disable`，然后 `bb restart control`。  
启用后 `bb status` 会输出 **https**://host:6666。

---

## 常见问题

- **权限**：Local 模式 systemd 默认以 root 运行；生产建议创建专用用户并修改 unit 中 `User=`，并保证对 `PREFIX/config`、`PREFIX/data`、`PREFIX/current` 有读写权限。
- **OS**：优先支持 Linux（amd64/arm64）；macOS 可本地开发，部署说明以 Linux 为准。

---

## Release 与 CI

- 打 tag `v*.*.*` 触发 GitHub Actions，生成 release assets：
  - `bullboard-all-linux-amd64-vX.Y.Z.tar.gz` / `bullboard-all-linux-arm64-vX.Y.Z.tar.gz`
  - `bullboard-runner-linux-amd64-vX.Y.Z.tar.gz` / `bullboard-runner-linux-arm64-vX.Y.Z.tar.gz`
  - `SHA256SUMS`
- 一条命令安装会按系统架构下载对应 all 包并校验 SHA256。
