# PR-R2：部署体系全量重命名

部署相关工件与文档统一为 **dashboard / control / runner**，与 PR-R1 一并完成。

## 检查清单（已满足）

- **Systemd**：bullboard-control.service、bullboard-runner.service；WorkingDirectory current/control、current/worker
- **Docker**：compose services control/dashboard/runner；镜像 bullboard-control、bullboard-dashboard、bullboard-runner；profiles control、worker
- **Dockerfiles**：COPY apps/control、apps/dashboard、apps/runner（R1 已改）
- **Nginx 模板**：control_backend、{{CONTROL_UPSTREAM}}、{{WEB_ROOT}}；/api/ 为 HTTP 路径保留
- **install.sh**：子命令与选项、输出均使用 control/worker/dashboard
- **docs/DEPLOY.md**：全文 control/dashboard/runner，源码目录 apps/control、apps/dashboard、apps/runner

## 验证

- Local：`./infra/deploy/install.sh install --from-repo --prefix /tmp/bb --component control` 后检查 releases 与 current
- Docker：`docker compose -f infra/docker/docker-compose.yml --profile control config` 检查 services 与 images 命名
