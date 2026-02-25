# PR-02：首页组件拆分 + mocks + /dashboard 页面完成

## 目标

- 首页 Row1~Row6 完整布局，全部使用 mock 数据
- 可复用组件放入 src/components/dashboard/
- mock 数据放入 src/mocks/dashboard.ts
- 统一 Card 样式、gap-4、p-6，图标 lucide-react

## 修改文件清单

| 文件 | 说明 |
|------|------|
| `apps/dashboard/src/mocks/dashboard.ts` | 新增，kpis/disks/pipeline/runners/capacity/routing/quality/activity |
| `apps/dashboard/src/components/ui/progress.tsx` | 新增，进度条（value/max） |
| `apps/dashboard/src/components/dashboard/StatCard.tsx` | 新增，KPI 卡（负载/CPU/内存/磁盘） |
| `apps/dashboard/src/components/dashboard/DiskUsageRings.tsx` | 新增，分区列表 + Progress + >85% warning |
| `apps/dashboard/src/components/dashboard/PipelineOverview.tsx` | 新增，状态数量 + WIP 预警 + 平均/95p 耗时 |
| `apps/dashboard/src/components/dashboard/RunnerHealthPanel.tsx` | 新增，Runner 列表（status/capacity/heartbeat/error） |
| `apps/dashboard/src/components/dashboard/CapacitySummary.tsx` | 新增，总 capacity、已用、空闲、Pending、Running |
| `apps/dashboard/src/components/dashboard/RoleModelRouting.tsx` | 新增，Role→Model 表格（primary/fallback/policy） |
| `apps/dashboard/src/components/dashboard/QualityRiskPanel.tsx` | 新增，24h 失败率/原因 Top + 阻塞任务（severity badge） |
| `apps/dashboard/src/components/dashboard/ActivityFeed.tsx` | 新增，最近事件列表（时间/类型/描述/ref） |
| `apps/dashboard/src/pages/DashboardHome.tsx` | 重写，Row1~Row6 布局，引入上述组件与 mocks |
| `apps/dashboard/src/components/dashboard/PipelineOverview.tsx` | 修复未使用变量（inProgress/review） |

## 验证步骤

```bash
cd apps/dashboard
pnpm install
pnpm dev
```

- 浏览器打开 http://localhost:5173/dashboard
- 预期：左侧 Sidebar + 顶部 Topbar，主内容区依次呈现：
  - **Row1**：4 个 KPI 卡（负载 1.2、CPU 42%、内存 68%、磁盘 55%），右侧/下方为磁盘分区（8 个分区，>85% 显示 warning）
  - **Row2**：Pipeline 概览（Plan/Draft～Failed 数量，In Progress/Review 超阈值标 WIP），平均耗时 12m、95p 28m
  - **Row3**：左 Runner Health（runner-1/2 online、runner-3 offline + lastError），右 Capacity & Queue（12/3/9、Pending 8、Running 3）
  - **Row4**：Role → Model 路由表（Planner/Implementer/Reviewer/Tester/Docs/Ops，primary/fallback/policy）
  - **Row5**：24h 失败率 2.1%、失败数 4、原因 Top 3；阻塞任务 T-101/T-098/T-095（high/med/low badge）
  - **Row6**：Activity Feed 10 条（task created、status changed、runner online/offline、config changed、tls changed 等）

## 预期界面说明

- 页面背景浅灰白，卡片白底、浅边框、轻阴影、圆角 12px
- 所有数据来自 mock，无后端请求
- Row1~Row6 完整呈现，信息密度适中，符合“宝塔风格 + Bull Board 业务”要求
