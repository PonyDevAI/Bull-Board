# 迁移说明：Runner 已全面改名为 Person

**执行器已全面改名为 Person**，旧名 **Runner** / **runner** / **bb-runner** 不再兼容。升级时请按下列映射替换。

---

## 旧名 → 新名 映射

| 类别 | 旧名 | 新名 |
|------|------|------|
| **二进制** | bb-runner | **bb-person** |
| **进程/服务名** | bb-runner.service, bullboard-runner | **bb-person.service**, **bullboard-person** |
| **API 路径** | /api/runners, /api/runner | **/api/persons**, **/api/person** |
| **请求/响应字段** | runner_id | **person_id** |
| **环境变量** | RUNNER_ID | **PERSON_ID** |
| **DB 表** | runners | **persons** |
| **DB 列** | runner_id（如 workers.runner_id） | **person_id**（workers.person_id） |
| **Release 压缩包** | bullboard-runner-linux-*.tar.gz | **bullboard-person-linux-*.tar.gz** |
| **Docker 镜像/服务** | bullboard-runner, runner | **bullboard-person**, **person** |

---

## 升级步骤

1. **停止旧服务**（若已安装）  
   `systemctl stop bb-runner` 或 `systemctl stop bullboard-runner`

2. **替换二进制**  
   - 从新版本 release 下载 **bullboard-person-linux-*.tar.gz**，解压得到 **bb-person**。  
   - 或从源码构建：`go build -o bb-person ./cmd/bb-person`  
   - 安装到 PATH：`cp bb-person /usr/local/bin/bb-person`（或按 install.sh 流程）

3. **更新 systemd unit**  
   - 删除旧 unit：`rm /etc/systemd/system/bb-runner.service`（或 bullboard-runner.service）  
   - 使用新模板安装 **bb-person.service**（见 `infra/deploy/templates/systemd/bb-person.service.tpl`）  
   - `systemctl daemon-reload && systemctl enable --now bb-person`

4. **环境变量**  
   将 `RUNNER_ID` 改为 **PERSON_ID**（若在 env 或 compose 中配置）。

5. **API 调用端**  
   若有脚本或客户端直接调用 Console API，将 `/api/runners`、`/api/runner` 改为 **/api/persons**、**/api/person**；请求/响应中的 **runner_id** 改为 **person_id**。

6. **数据库迁移**（若自维护 DB）  
   - 表 `runners` 重命名或迁移为 **persons**；列 `runner_id` 改为 **person_id**（如 workers 表）。  
   - 具体迁移脚本见项目 release 或 `internal/common/db.go` 中的迁移逻辑。

---

## 参考

- 全量改动清单与实施顺序：**docs/MASTER_PLAN_RUNNER_TO_PERSON_AND_CONSOLE.md**
- 命名规范：**docs/NAMING.md**
- 架构说明：**docs/ARCHITECTURE.md**
