# bb CLI 命令说明

**bb** 为 Bull Board 运行期管理命令（安装后可执行 `/usr/local/bin/bb`）。**安装/升级/卸载由 install.sh（curl \| bash）负责，bb 不提供 install/upgrade/uninstall。** 默认前缀为 `/opt/bull-board`，端口为 **6666**；可通过 `--prefix`、`--port` 或环境变量 `BB_PREFIX`、`BB_PORT` 覆盖。

---

## 命令列表

| 命令 | 说明 |
|------|------|
| `bb server` | 启动 Control Plane 服务（端口 6666；systemd 下由 bb.service 调用） |
| `bb status` | 服务状态与 Panel 地址 |
| `bb logs [control\|runner] [-f] [--lines N]` | 查看日志（Linux journalctl） |
| `bb restart [control\|runner\|all]` | 重启服务 |
| `bb doctor` | 环境检查 |
| `bb version` | 显示版本号 |
| `bb tls enable --self-signed` | 启用 TLS（自签证书） |
| `bb tls enable --cert <path> --key <path>` | 启用 TLS（自定义证书） |
| `bb tls disable` | 关闭 TLS |
| `bb tls status` | 查看 TLS 状态 |

---

## 选项

- `--prefix <dir>`：安装前缀（默认 /opt/bull-board）
- `--port <port>`：端口（仅 server，默认 6666）
- `bb logs`：`-f` 持续输出，`--lines N` 显示行数

---

## 示例

```bash
# 启动服务（本地调试）
bb server --prefix /opt/bull-board

# 状态与 Panel 地址
bb status

# 查看 bb 服务日志（最近 200 行）
bb logs control --lines 200

# 实时日志
bb logs control -f

# 重启
bb restart all
bb restart control

# 环境检查
bb doctor

# 版本
bb version

# TLS
bb tls enable --self-signed
bb restart control
bb tls status
bb tls disable
bb restart control
```

---

## 环境变量

- `BB_PREFIX`：安装前缀，默认 `/opt/bull-board`
- `BB_PORT`：端口，默认 `6666`
- 安装/升级/卸载请使用：`curl -fsSL <INSTALL_URL> \| bash` 或 `./infra/deploy/install.sh`（见 [DEPLOY.md](DEPLOY.md)）
