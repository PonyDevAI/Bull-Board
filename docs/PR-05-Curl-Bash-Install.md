# PR-05：curl | bash 安装脚本与 uninstall/upgrade

## 目标

- 支持一条命令：`curl -fsSL <INSTALL_URL> | bash`
- 默认：local、all、latest、prefix=/opt/bull-board、port=6666
- 环境变量或参数可覆盖：VERSION, MODE, COMPONENT, PREFIX, PORT
- 检测 OS/arch（Linux amd64/arm64），下载对应 release tarball + SHA256SUMS 并校验
- 解压到 versions/<version>，更新 current，创建 config/data，安装 bb 到 /usr/local/bin，安装并启动 systemd
- uninstall 默认保留 data，--purge-data 清理 data/

## 修改文件清单

- `infra/deploy/install.sh`：
  - 默认 GITHUB_REPO=trustpoker/bull-borad；支持无仓库运行（curl|bash）
  - 增加 detect_arch、download_assets 按 arch 下载 bullboard-all-linux-$arch-$tag.tar.gz 与 SHA256SUMS 并校验（sha256sum 或 shasum -a 256）
  - 非仓库模式：fetch_templates 从 GitHub raw 拉取 bb.service.tpl / bb-runner.service.tpl
  - install_local 中无模板时拉取模板；复制 bb/install.sh 时优先 PREFIX/current/bin（release 包内），否则 SCRIPT_DIR
  - 解压使用 bullboard-all-linux-$arch-$VERSION.tar.gz

## 验证步骤（可复制运行）

```bash
# 1. 从仓库安装（不下载 release，等同 PR-04）
cd /path/to/bull-borad
PREFIX=/tmp/bb-test bash infra/deploy/install.sh install --from-repo --prefix /tmp/bb-test
# 预期：Version: dev，Panel: http://...:6666

# 2. 模拟 curl|bash（需有 release 时）
# curl -fsSL https://raw.githubusercontent.com/trustpoker/bull-borad/main/infra/deploy/install.sh | bash -s install
# 或本地：cat infra/deploy/install.sh | bash -s install --prefix /tmp/bb-test
# 无 release 时会报“下载失败”，属预期

# 3. 卸载（保留 data）
PREFIX=/tmp/bb-test bash infra/deploy/install.sh uninstall --prefix /tmp/bb-test
# 预期：已卸载服务，data/ 与 config/ 已保留
ls /tmp/bb-test/data 2>/dev/null && echo "data 保留 OK"

# 4. 卸载并清理 data
PREFIX=/tmp/bb-test bash infra/deploy/install.sh uninstall --purge-data --prefix /tmp/bb-test
# 预期：已删除 data/、versions/、config/
ls /tmp/bb-test/data 2>/dev/null || echo "data 已删除"
```

## 预期输出

- 安装完成：输出 Panel URL、bb status
- 卸载不 purge：提示 data 保留
- 卸载 --purge-data：data/、versions/、config/ 删除

## 备注

- 完整 curl|bash 验证需在存在 GitHub release 且提供 bullboard-all-linux-{amd64,arm64}-vX.Y.Z.tar.gz 与 SHA256SUMS 后进行（PR-07 产出）。
