# PR-06：TLS v1（同端口 6666：off / self-signed / custom-cert）

## 目标

- control 支持 TLS，配置存于 PREFIX/config/bb.json（或 BB_CONFIG 指向的文件）
- 同端口 6666：TLS=off 时 http，TLS=on 时 https（不同时监听 HTTP）
- bb CLI：bb tls enable --self-signed | bb tls enable --cert <path> --key <path> | bb tls disable
- 启用 TLS 后 bb status 输出 https://host:6666

## 修改文件清单

- `apps/control/src/index.ts`：增加 loadTlsConfig()，从 BB_CONFIG 或 PREFIX/config/bb.json 读取 tls.enabled、certPath、keyPath；listen 时若启用则使用 https 选项
- `infra/deploy/templates/systemd/bb.service.tpl`：增加 Environment=PREFIX={{PREFIX}} 以便 control 解析 config 路径
- `infra/deploy/bb`：增加 tls 子命令（enable --self-signed、enable --cert/--key、disable），写 bb.json 并提示 bb restart control

## 验证步骤（可复制运行）

```bash
# 1. 确保已安装（如 PREFIX=/tmp/bb-test）
PREFIX=/tmp/bb-test bash infra/deploy/bb tls enable --self-signed --prefix /tmp/bb-test
# 预期：已启用 TLS（自签）。请执行: bb restart control

# 2. 检查配置
cat /tmp/bb-test/config/bb.json
# 预期：tls.enabled true, mode self-signed, certPath/keyPath 指向 PREFIX/config/*.pem

# 3. 若在 Linux 且 bb 已运行：bb restart control 后
# curl -sk https://localhost:6666/api/health
# 预期：{"ok":true,"service":"bb"}（-k 忽略自签证书告警）

# 4. 关闭 TLS
PREFIX=/tmp/bb-test bash infra/deploy/bb tls disable --prefix /tmp/bb-test
# 预期：已关闭 TLS。请执行: bb restart control
```

## 预期输出

- bb tls enable --self-signed：生成 bb-cert.pem、bb-key.pem，写入 bb.json，提示重启
- bb status：当 bb.json 含 tls 时 Panel 为 https://...:6666
- 浏览器打开 https://localhost:6666 可见证书不受信任提示（自签属正常）

## 备注

- 自签证书由 openssl 生成，CN=bb，有效期 365 天。
