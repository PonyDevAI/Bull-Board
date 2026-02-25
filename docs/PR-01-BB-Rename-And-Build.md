# PR-01：全量重命名与工程结构统一（bb 宝塔式改造）

## 目标

- 目录统一：apps/control、apps/dashboard、apps/runner（无遗留 apps/api、apps/web、apps/runner-go）
- 根脚本：`pnpm -w dev` / `pnpm -w build` 可跑
- 全局搜索旧路径 0 hits

## 修改文件清单

- `package.json`：新增根脚本 `"build": "pnpm build:control && pnpm build:dashboard"`
- `docs/PR-R1-Full-Rename-Dirs-And-Scripts.md`：去除遗留字符串 apps/api、apps/web、apps/runner-go，仅保留对 control/dashboard/runner 的表述

（目录重命名与其余引用已在历史提交中完成，本次仅补根 build 与文档清理。）

## 验证步骤（可复制运行）

```bash
cd /path/to/bull-borad

# 1. 安装依赖
pnpm install
# 预期：Scope: all 4 workspace projects；Done in ...；无报错

# 2. 根 build
pnpm run build
# 预期：build:control 与 build:dashboard 均成功；最后一行含 "✓ built in ..."

# 3. 开发启动（至少能起 control + dashboard）
pnpm run dev
# 预期：无报错；control 监听 3000，dashboard 监听 5173（开发模式端口）
# 可选：另终端 curl -s http://localhost:3000/health 返回 {"ok":true,...}
```

## 预期输出

- `pnpm install`：Lockfile is up to date 或 Packages: +N；Done in ...ms
- `pnpm run build`：@bullboard/control build 与 @bullboard/dashboard build 成功；vite built in ...ms
- `pnpm run dev`：两进程启动，无 ELIFECYCLE

## 风险与回滚

- 风险：无；仅增加根 build 脚本与文档措辞调整。
- 回滚：`git revert` 本 PR 提交；或从 package.json 删除 `"build"` 行，恢复 PR-R1 文档中旧路径描述（不推荐）。
