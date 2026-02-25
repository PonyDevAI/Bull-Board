#!/usr/bin/env bash
# Bull Board 统一安装/升级/卸载脚本
# 用法: ./install.sh <install|upgrade|uninstall|status|version> [options]
# 选项: --mode local|docker  --component control|worker|all  --version latest|vX.Y.Z  --prefix <dir>  --purge-data (仅 uninstall)
# 对外命名: dashboard(前端) / control(Control Plane) / runner(Go 执行器)

set -e

GITHUB_REPO="${GITHUB_REPO:-}"
PREFIX="${PREFIX:-/opt/bull-board}"
MODE="${MODE:-local}"
COMPONENT="${COMPONENT:-all}"
VERSION="${VERSION:-latest}"
PURGE_DATA=false

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEMPLATES="$SCRIPT_DIR/templates"

usage() {
  echo "用法: $0 <install|upgrade|uninstall|status|version> [options]"
  echo "选项:"
  echo "  --mode local|docker    部署模式（默认 local）"
  echo "  --component control|worker|all  组件（默认 all）。control=control+dashboard，worker=runner"
  echo "  --version latest|vX.Y.Z  版本（默认 latest）"
  echo "  --prefix <dir>         安装前缀（默认 /opt/bull-board）"
  echo "  --purge-data           仅 uninstall 时：同时删除 shared 数据"
  echo "  --from-repo            仅 install/upgrade：从当前仓库构建目录安装（无需下载 release）"
  exit 1
}

get_latest_tag() {
  if [ -n "$GITHUB_REPO" ]; then
    curl -sSL "https://api.github.com/repos/$GITHUB_REPO/releases/latest" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/' || true
  fi
}

download_assets() {
  local tag="$1"
  local tmpdir="$2"
  [ -n "$GITHUB_REPO" ] || { echo "GITHUB_REPO 未设置，无法下载 release"; return 1; }
  local base="https://github.com/$GITHUB_REPO/releases/download/$tag"
  (cd "$tmpdir" && curl -sSL -O "$base/bullboard-control-linux-amd64-$tag.tar.gz" -O "$base/bullboard-worker-linux-amd64-$tag.tar.gz" -O "$base/SHA256SUMS" 2>/dev/null) || return 1
  if [ -f "$tmpdir/SHA256SUMS" ]; then
    (cd "$tmpdir" && sha256sum -c SHA256SUMS) || return 1
  fi
  return 0
}

install_from_repo() {
  local dest_control="$PREFIX/releases/$VERSION/control"
  local dest_worker="$PREFIX/releases/$VERSION/worker"
  mkdir -p "$dest_control" "$dest_worker"
  # control: dist + migrations + package.json
  if [ -d "$REPO_ROOT/apps/control/dist" ]; then
    cp -r "$REPO_ROOT/apps/control/dist" "$REPO_ROOT/apps/control/migrations" "$REPO_ROOT/apps/control/package.json" "$dest_control/"
    [ -d "$REPO_ROOT/apps/control/node_modules" ] && cp -r "$REPO_ROOT/apps/control/node_modules" "$dest_control/" || true
  else
    echo "请先构建 control: pnpm build:control"
    return 1
  fi
  # dashboard 静态：nginx 会配 root；若 release 包内含 dashboard 子目录则放这里
  if [ -d "$REPO_ROOT/apps/dashboard/dist" ]; then
    mkdir -p "$dest_control/dashboard"
    cp -r "$REPO_ROOT/apps/dashboard/dist/"* "$dest_control/dashboard/"
  fi
  # worker: runner 二进制
  if [ -f "$REPO_ROOT/apps/runner/runner" ]; then
    cp "$REPO_ROOT/apps/runner/runner" "$dest_worker/"
    chmod +x "$dest_worker/runner"
  elif command -v go >/dev/null 2>&1 && [ -f "$REPO_ROOT/apps/runner/main.go" ]; then
    (cd "$REPO_ROOT/apps/runner" && go build -o runner) && cp "$REPO_ROOT/apps/runner/runner" "$dest_worker/" && chmod +x "$dest_worker/runner"
  else
    echo "请先构建 runner 或安装 Go 后重试"
    return 1
  fi
  echo "$VERSION" > "$PREFIX/releases/$VERSION/VERSION"
}

install_local() {
  mkdir -p "$PREFIX/shared/data" "$PREFIX/shared/artifacts" "$PREFIX/shared/worktrees" "$PREFIX/shared/config"
  if [ ! -f "$PREFIX/shared/config/.env" ]; then
    sed "s|{{PREFIX}}|$PREFIX|g" "$TEMPLATES/env/bullboard.env.example" > "$PREFIX/shared/config/.env"
    echo "已生成 $PREFIX/shared/config/.env，请按需修改后启动服务。"
  fi
  rm -f "$PREFIX/current"
  ln -sf "$PREFIX/releases/$VERSION" "$PREFIX/current"

  # systemd units（需 root 写入 /etc/systemd/system/）
  local want_control=false want_runner=false
  [ "$COMPONENT" = "control" ] || [ "$COMPONENT" = "all" ] && want_control=true
  [ "$COMPONENT" = "worker" ] || [ "$COMPONENT" = "all" ] && want_runner=true
  if [ "$(id -u)" = 0 ]; then
    $want_control && sed "s|{{PREFIX}}|$PREFIX|g" "$TEMPLATES/systemd/bullboard-control.service.tpl" > /etc/systemd/system/bullboard-control.service
    $want_runner && sed "s|{{PREFIX}}|$PREFIX|g" "$TEMPLATES/systemd/bullboard-runner.service.tpl" > /etc/systemd/system/bullboard-runner.service
    ($want_control || $want_runner) && systemctl daemon-reload
    $want_control && systemctl enable --now bullboard-control
    $want_runner && systemctl enable --now bullboard-runner
    # nginx 配置（写入 conf.d 或提示）
    local nginx_conf="/etc/nginx/conf.d/bullboard.conf"
    if [ -d "$(dirname "$nginx_conf")" ]; then
      sed "s|{{CONTROL_UPSTREAM}}|127.0.0.1:3000|g; s|{{WEB_ROOT}}|$PREFIX/current/control/dashboard|g" "$TEMPLATES/nginx/bullboard.conf.tpl" > "$nginx_conf"
      echo "已写入 $nginx_conf，请 reload nginx。"
    else
      echo "请将 nginx 配置从 $TEMPLATES/nginx/bullboard.conf.tpl 复制到 nginx 并替换 {{CONTROL_UPSTREAM}}、{{WEB_ROOT}}。"
    fi
  else
    echo "未以 root 运行，跳过 systemd/nginx 安装。请手动："
    echo "  sudo cp <(sed 's|{{PREFIX}}|$PREFIX|g' $TEMPLATES/systemd/bullboard-control.service.tpl) /etc/systemd/system/bullboard-control.service"
    echo "  sudo cp <(sed 's|{{PREFIX}}|$PREFIX|g' $TEMPLATES/systemd/bullboard-runner.service.tpl) /etc/systemd/system/bullboard-runner.service"
    echo "  sudo systemctl daemon-reload && sudo systemctl enable --now bullboard-control bullboard-runner"
  fi
}

install_docker() {
  mkdir -p "$PREFIX/shared/docker" "$PREFIX/shared/data" "$PREFIX/shared/artifacts" "$PREFIX/shared/worktrees" "$PREFIX/shared/config"
  cp "$REPO_ROOT/infra/docker/docker-compose.yml" "$PREFIX/shared/docker/"
  cat > "$PREFIX/shared/docker/.env" <<EOF
GITHUB_REPO_OWNER=${GITHUB_REPO_OWNER:-owner}
IMAGE_TAG=${VERSION}
CONTROL_PORT=3000
DASHBOARD_PORT=8080
EOF
  # 使用预构建镜像（IMAGE_TAG）拉取并启动；若需本地构建请从仓库根执行 docker compose -f infra/docker/docker-compose.yml ...
  if [ "$COMPONENT" = "control" ]; then
    (cd "$PREFIX/shared/docker" && docker compose --env-file .env --profile control up -d)
  elif [ "$COMPONENT" = "worker" ]; then
    (cd "$PREFIX/shared/docker" && docker compose --env-file .env --profile worker up -d)
  else
    (cd "$PREFIX/shared/docker" && docker compose --env-file .env --profile control --profile worker up -d)
  fi
}

uninstall_local() {
  [ "$(id -u)" = 0 ] && systemctl stop bullboard-control bullboard-runner 2>/dev/null || true
  [ "$(id -u)" = 0 ] && systemctl disable bullboard-control bullboard-runner 2>/dev/null || true
  [ "$(id -u)" = 0 ] && rm -f /etc/systemd/system/bullboard-control.service /etc/systemd/system/bullboard-runner.service && systemctl daemon-reload || true
  [ "$(id -u)" = 0 ] && [ -f /etc/nginx/conf.d/bullboard.conf ] && rm -f /etc/nginx/conf.d/bullboard.conf || true
  rm -f "$PREFIX/current"
  # 不删 releases 以便保留版本目录；仅 --purge-data 删 shared
  $PURGE_DATA && rm -rf "$PREFIX/shared" "$PREFIX/releases" || true
}

uninstall_docker() {
  (cd "$PREFIX/shared/docker" && docker compose --profile control --profile worker down 2>/dev/null) || true
  $PURGE_DATA && rm -rf "$PREFIX/shared" "$PREFIX/releases" || true
}

status_local() {
  echo "=== systemd ==="
  systemctl is-active bullboard-control 2>/dev/null || echo "bullboard-control: 未安装或未运行"
  systemctl is-active bullboard-runner 2>/dev/null || echo "bullboard-runner: 未安装或未运行"
  echo "=== 端口 ==="
  (curl -sS http://127.0.0.1:3000/health 2>/dev/null && echo " control:3000 OK") || echo " control:3000 未响应"
}

status_docker() {
  (cd "$PREFIX/shared/docker" && docker compose ps 2>/dev/null) || echo "未找到 $PREFIX/shared/docker 或 docker compose 未运行"
}

do_version() {
  if [ -L "$PREFIX/current" ] && [ -f "$PREFIX/current/VERSION" ]; then
    cat "$PREFIX/current/VERSION"
  else
    echo "未安装或无法读取版本"
  fi
}

# 解析参数
SUBCOMMAND="${1:-}"
shift || true
while [ $# -gt 0 ]; do
  case "$1" in
    --mode) MODE="$2"; shift 2 ;;
    --component) COMPONENT="$2"; shift 2 ;;
    --version) VERSION="$2"; shift 2 ;;
    --prefix) PREFIX="$2"; shift 2 ;;
    --purge-data) PURGE_DATA=true; shift ;;
    --from-repo) FROM_REPO=true; shift ;;
    *) echo "未知选项: $1"; usage ;;
  esac
done

export PREFIX MODE COMPONENT VERSION PURGE_DATA
FROM_REPO="${FROM_REPO:-false}"

case "$SUBCOMMAND" in
  install|upgrade)
    if [ "$VERSION" = "latest" ] && ! $FROM_REPO; then
      GITHUB_REPO="${GITHUB_REPO:-}"
      [ -z "$GITHUB_REPO" ] && echo "请设置 GITHUB_REPO（如 owner/bull-board）或使用 --from-repo 从仓库安装"; exit 1
      VERSION="$(get_latest_tag)" || { echo "无法获取 latest tag"; exit 1; }
    fi
    if $FROM_REPO; then
      VERSION="${VERSION:-dev}"
      install_from_repo
    else
      TMP="$(mktemp -d)"
      trap "rm -rf $TMP" EXIT
      download_assets "$VERSION" "$TMP" || { echo "下载或校验 release 失败"; exit 1; }
      mkdir -p "$PREFIX/releases/$VERSION"
      tar -xzf "$TMP/bullboard-control-linux-amd64-$VERSION.tar.gz" -C "$PREFIX/releases/$VERSION" 2>/dev/null || true
      tar -xzf "$TMP/bullboard-worker-linux-amd64-$VERSION.tar.gz" -C "$PREFIX/releases/$VERSION" 2>/dev/null || true
    fi
    if [ "$MODE" = "local" ]; then install_local; else install_docker; fi
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
