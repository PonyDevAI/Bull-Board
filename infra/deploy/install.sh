#!/usr/bin/env bash
# Bull Board 安装/升级/卸载脚本（bb 目录规范）
# 用法: ./install.sh <install|upgrade|uninstall|status|version> [options]
# 目录: PREFIX/versions/<v>/, PREFIX/current -> versions/<v>, PREFIX/config/, PREFIX/data/
# 服务: bb.service, bb-runner.service，端口 6666

set -e

# 一条命令安装：curl -fsSL <INSTALL_URL> | bash  可设 VERSION MODE COMPONENT PREFIX PORT
GITHUB_REPO="${GITHUB_REPO:-PonyDevAI/Bull-Board}"
PREFIX="${PREFIX:-/opt/bull-board}"
MODE="${MODE:-local}"
COMPONENT="${COMPONENT:-all}"
VERSION="${VERSION:-latest}"
PORT="${PORT:-6666}"
PURGE_DATA=false
FROM_REPO=false

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-.}")" 2>/dev/null && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." 2>/dev/null && pwd)"
TEMPLATES="$SCRIPT_DIR/templates"
# 非仓库内运行时（如 curl|bash）无 templates，后续下载
[ ! -f "$REPO_ROOT/go.mod" ] || [ ! -d "$REPO_ROOT/cmd/bb" ] && IN_REPO=false || IN_REPO=true

usage() {
  echo "用法: $0 <install|upgrade|uninstall|status|version> [options]"
  echo "选项:"
  echo "  --mode local|docker    部署模式（默认 local）"
  echo "  --component control|runner|all  组件（默认 all）"
  echo "  --version latest|vX.Y.Z  版本（默认 latest）"
  echo "  --prefix <dir>         安装前缀（默认 /opt/bull-board）"
  echo "  --port <port>          端口（默认 6666）"
  echo "  --purge-data           仅 uninstall：同时删除 data 目录"
  echo "  --from-repo            从当前仓库构建目录安装（不下载 release）"
  exit 1
}

get_latest_tag() {
  if [ -n "$GITHUB_REPO" ]; then
    curl -sSL "https://api.github.com/repos/$GITHUB_REPO/releases/latest" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/' || true
  fi
}

# Linux amd64 / arm64（aarch64 -> arm64）
detect_arch() {
  local m; m="$(uname -m)"
  case "$m" in
    x86_64|amd64) echo "amd64" ;;
    aarch64|arm64) echo "arm64" ;;
    *) echo "amd64" ;;
  esac
}

download_assets() {
  local tag="$1"
  local tmpdir="$2"
  [ -n "$GITHUB_REPO" ] || { echo "GITHUB_REPO 未设置"; return 1; }
  local arch; arch="$(detect_arch)"
  local base="https://github.com/$GITHUB_REPO/releases/download/$tag"
  local tarball="bullboard-all-linux-$arch-$tag.tar.gz"
  echo "下载 $tarball ..."
  (cd "$tmpdir" && curl -fsSL -O "$base/$tarball" -O "$base/SHA256SUMS") || { echo "下载失败"; return 1; }
  if [ -f "$tmpdir/SHA256SUMS" ]; then
    (cd "$tmpdir" && sha256sum -c SHA256SUMS 2>/dev/null) || (cd "$tmpdir" && shasum -a 256 -c SHA256SUMS 2>/dev/null) || { echo "SHA256 校验失败"; return 1; }
  fi
  return 0
}

# 非仓库模式：从 GitHub 拉取 systemd 模板到临时目录
fetch_templates() {
  local tmpdir="$1"
  local branch="${2:-main}"
  local base="https://raw.githubusercontent.com/$GITHUB_REPO/$branch/infra/deploy/templates"
  mkdir -p "$tmpdir/systemd"
  curl -fsSL "$base/systemd/bb.service.tpl" -o "$tmpdir/systemd/bb.service.tpl"
  curl -fsSL "$base/systemd/bb-runner.service.tpl" -o "$tmpdir/systemd/bb-runner.service.tpl"
  echo "$tmpdir"
}

# 从仓库构建目录安装到 PREFIX/versions/<VERSION>/（全 Go：bb + bb-runner + dashboard dist）
install_from_repo() {
  local ver="${VERSION:-dev}"
  local dest_base="$PREFIX/versions/$ver"
  mkdir -p "$dest_base/dashboard"

  # Go 二进制 bb、bb-runner（需在仓库根已 go build）
  if [ -f "$REPO_ROOT/bb" ] && [ -f "$REPO_ROOT/bb-runner" ]; then
    cp "$REPO_ROOT/bb" "$REPO_ROOT/bb-runner" "$dest_base/"
    chmod +x "$dest_base/bb" "$dest_base/bb-runner"
  elif command -v go >/dev/null 2>&1; then
    (cd "$REPO_ROOT" && go build -o bb ./cmd/bb && go build -o bb-runner ./cmd/bb-runner) || { echo "go build 失败"; return 1; }
    cp "$REPO_ROOT/bb" "$REPO_ROOT/bb-runner" "$dest_base/"
    chmod +x "$dest_base/bb" "$dest_base/bb-runner"
  else
    echo "请先构建 bb/bb-runner 或安装 Go 后重试"
    return 1
  fi
  # dashboard 静态（仅构建产物，无需 Node 运行时）
  if [ -d "$REPO_ROOT/apps/dashboard/dist" ]; then
    cp -r "$REPO_ROOT/apps/dashboard/dist" "$dest_base/dashboard/"
  else
    (cd "$REPO_ROOT" && pnpm build:dashboard 2>/dev/null) || true
    [ -d "$REPO_ROOT/apps/dashboard/dist" ] && cp -r "$REPO_ROOT/apps/dashboard/dist" "$dest_base/dashboard/" || echo "警告: 无 dashboard dist，仅 API 可用"
  fi
  echo "$ver" > "$dest_base/VERSION"
}

install_local() {
  # 非仓库模式：从 GitHub 拉取 systemd 模板
  if [ ! -f "$TEMPLATES/systemd/bb.service.tpl" ] && [ -n "$GITHUB_REPO" ]; then
    local tpl_tmp; tpl_tmp="$(mktemp -d)"
    trap "rm -rf '$tpl_tmp'" EXIT
    fetch_templates "$tpl_tmp" && TEMPLATES="$tpl_tmp"
  fi
  # 目录规范：config/、data/db|artifacts|worktrees|uploads
  mkdir -p "$PREFIX/config" \
           "$PREFIX/data/db" \
           "$PREFIX/data/artifacts" \
           "$PREFIX/data/worktrees" \
           "$PREFIX/data/uploads"
  if [ ! -f "$PREFIX/config/bb.env" ]; then
    [ -f "$TEMPLATES/env/bullboard.env.example" ] && sed "s|{{PREFIX}}|$PREFIX|g; s|3000|$PORT|g" "$TEMPLATES/env/bullboard.env.example" > "$PREFIX/config/bb.env" || true
    echo "已生成 $PREFIX/config/bb.env（可选）。"
  fi
  rm -f "$PREFIX/current"
  ln -sf "$PREFIX/versions/$VERSION" "$PREFIX/current"

  local want_control=false want_runner=false
  [ "$COMPONENT" = "control" ] || [ "$COMPONENT" = "all" ] && want_control=true
  [ "$COMPONENT" = "runner" ] || [ "$COMPONENT" = "all" ] && want_runner=true

  # 安装 bb、bb-runner 到 /usr/local/bin（全 Go 二进制在 current/ 下）
  if [ "$(id -u)" = 0 ]; then
    [ -f "$PREFIX/current/bb" ] && cp "$PREFIX/current/bb" /usr/local/bin/bb && chmod +x /usr/local/bin/bb
    [ -f "$PREFIX/current/bb-runner" ] && cp "$PREFIX/current/bb-runner" /usr/local/bin/bb-runner && chmod +x /usr/local/bin/bb-runner
  fi
  mkdir -p "$PREFIX/bin"
  [ -f "$SCRIPT_DIR/install.sh" ] && cp "$SCRIPT_DIR/install.sh" "$PREFIX/bin/" 2>/dev/null || true

  if [ "$(id -u)" = 0 ]; then
    $want_control && sed "s|{{PREFIX}}|$PREFIX|g" "$TEMPLATES/systemd/bb.service.tpl" > /etc/systemd/system/bb.service
    $want_runner && sed "s|{{PREFIX}}|$PREFIX|g" "$TEMPLATES/systemd/bb-runner.service.tpl" > /etc/systemd/system/bb-runner.service
    ($want_control || $want_runner) && systemctl daemon-reload
    $want_control && systemctl enable --now bb
    $want_runner && systemctl enable --now bb-runner
  else
    echo "未以 root 运行，跳过 systemd。请手动："
    echo "  sudo sed \"s|{{PREFIX}}|$PREFIX|g\" $TEMPLATES/systemd/bb.service.tpl | sudo tee /etc/systemd/system/bb.service"
    echo "  sudo sed \"s|{{PREFIX}}|$PREFIX|g\" $TEMPLATES/systemd/bb-runner.service.tpl | sudo tee /etc/systemd/system/bb-runner.service"
    echo "  sudo systemctl daemon-reload && sudo systemctl enable --now bb bb-runner"
  fi
}

install_docker() {
  mkdir -p "$PREFIX/config" "$PREFIX/data/db" "$PREFIX/data/artifacts" "$PREFIX/data/worktrees" "$PREFIX/data/uploads"
  mkdir -p "$PREFIX/docker"
  [ -f "$REPO_ROOT/infra/docker/docker-compose.yml" ] && cp "$REPO_ROOT/infra/docker/docker-compose.yml" "$PREFIX/docker/"
  cat > "$PREFIX/docker/.env" <<EOF
IMAGE_TAG=${VERSION}
PORT=${PORT}
PREFIX=${PREFIX}
EOF
  echo "Docker 模式：请到 $PREFIX/docker 执行 docker compose up -d"
}

uninstall_local() {
  [ "$(id -u)" = 0 ] && systemctl stop bb bb-runner 2>/dev/null || true
  [ "$(id -u)" = 0 ] && systemctl disable bb bb-runner 2>/dev/null || true
  [ "$(id -u)" = 0 ] && rm -f /etc/systemd/system/bb.service /etc/systemd/system/bb-runner.service && systemctl daemon-reload || true
  rm -f "$PREFIX/current"
  if [ "$PURGE_DATA" = "true" ]; then
    rm -rf "$PREFIX/data" "$PREFIX/versions" "$PREFIX/config"
    echo "已删除 data/、versions/、config/"
  else
    echo "已卸载服务，data/ 与 config/ 已保留"
  fi
}

uninstall_docker() {
  [ -d "$PREFIX/docker" ] && (cd "$PREFIX/docker" && docker compose down 2>/dev/null) || true
  [ "$PURGE_DATA" = "true" ] && rm -rf "$PREFIX/data" "$PREFIX/versions" "$PREFIX/config" "$PREFIX/docker" || true
}

status_local() {
  echo "=== bb status ==="
  echo "PREFIX: $PREFIX"
  if [ -L "$PREFIX/current" ]; then
    echo "Version: $(basename "$(readlink "$PREFIX/current")")"
  else
    echo "Version: 未安装"
  fi
  echo "=== Services ==="
  [ "$(uname -s)" = "Linux" ] && systemctl is-active bb 2>/dev/null && echo "bb: active" || echo "bb: inactive"
  [ "$(uname -s)" = "Linux" ] && systemctl is-active bb-runner 2>/dev/null && echo "bb-runner: active" || echo "bb-runner: inactive"
  echo "=== Panel ==="
  echo "http://$(hostname -f 2>/dev/null || echo localhost):6666"
}

status_docker() {
  [ -d "$PREFIX/docker" ] && (cd "$PREFIX/docker" && docker compose ps 2>/dev/null) || echo "未找到 $PREFIX/docker"
}

do_version() {
  if [ -L "$PREFIX/current" ] && [ -f "$PREFIX/current/VERSION" ]; then
    cat "$PREFIX/current/VERSION"
  else
    echo "未安装"
  fi
}

# 解析参数
SUBCOMMAND="${1:-}"
shift || true
while [ $# -gt 0 ]; do
  case "$1" in
    --mode)      MODE="$2"; shift 2 ;;
    --component) COMPONENT="$2"; shift 2 ;;
    --version)  VERSION="$2"; shift 2 ;;
    --prefix)   PREFIX="$2"; shift 2 ;;
    --port)     PORT="$2"; shift 2 ;;
    --purge-data) PURGE_DATA=true; shift ;;
    --from-repo) FROM_REPO=true; shift ;;
    *) echo "未知选项: $1"; usage ;;
  esac
done

export PREFIX MODE COMPONENT VERSION PORT PURGE_DATA

case "$SUBCOMMAND" in
  install|upgrade)
    if [ "$FROM_REPO" = "true" ]; then
      [ "$VERSION" = "latest" ] && VERSION="dev"
      install_from_repo
    else
      if [ "$VERSION" = "latest" ] && [ -n "$GITHUB_REPO" ]; then
        VERSION="$(get_latest_tag)" || { echo "无法获取 latest tag"; exit 1; }
      fi
      if [ -z "$GITHUB_REPO" ]; then
        echo "未设置 GITHUB_REPO，使用 --from-repo 从当前仓库安装"
        FROM_REPO=true
        VERSION="${VERSION:-dev}"
        install_from_repo
      else
        TMP="$(mktemp -d)"
        trap 'rm -rf "$TMP"' EXIT
        download_assets "$VERSION" "$TMP" || { echo "下载失败"; exit 1; }
        mkdir -p "$PREFIX/versions/$VERSION"
        local arch; arch="$(detect_arch)"
        local tarball="bullboard-all-linux-$arch-$VERSION.tar.gz"
        tar -xzf "$TMP/$tarball" -C "$PREFIX/versions/$VERSION" || { echo "解压失败"; exit 1; }
      fi
    fi
    if [ "$MODE" = "local" ]; then install_local; else install_docker; fi
    echo ""
    status_local
    ;;
  uninstall)
    if [ "$MODE" = "local" ]; then uninstall_local; else uninstall_docker; fi
    ;;
  status)
    if [ "$MODE" = "local" ]; then status_local; else status_docker; fi
    ;;
  version) do_version ;;
  *) usage ;;
esac
