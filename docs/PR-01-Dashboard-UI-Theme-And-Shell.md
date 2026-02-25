# PR-01：Dashboard UI 主题 tokens + AppShell（布局骨架）

## 目标

- 统一主题 tokens（圆角 12px、卡片浅边框+轻阴影、页面浅灰白背景、间距与字号）
- 新增 docs/UI_GUIDE.md（色板、圆角、阴影、间距、Layout、组件规范）
- 新增 AppShell（左侧 Sidebar 240px + Topbar + main），Sidebar 菜单：Dashboard / Tasks / Runners / Models / Logs / Settings
- 路由 /dashboard 使用 AppShell 包裹，默认首页为占位页

## 修改文件清单

| 文件 | 说明 |
|------|------|
| `apps/dashboard/src/styles/globals.css` | 新增，设计 tokens（--radius、色板、card、sidebar/topbar、间距） |
| `apps/dashboard/src/index.css` | 引入 globals.css，body 使用 bg-background |
| `apps/dashboard/tailwind.config.js` | 扩展 borderRadius、colors、boxShadow、sidebar/topbar 尺寸 |
| `apps/dashboard/src/components/ui/card.tsx` | 统一 Card 样式：rounded-global、border-border、bg-card、shadow-card；CardHeader/CardContent p-4 |
| `apps/dashboard/docs/UI_GUIDE.md` | 新增，色板、圆角、阴影、间距、字号、Layout、Card/Table/Badge/Button 规范 |
| `apps/dashboard/src/components/layout/AppShell.tsx` | 新增，Sidebar（240px）+ Topbar + Outlet，nav 使用 lucide-react 图标 |
| `apps/dashboard/src/pages/DashboardHome.tsx` | 新增，/dashboard 首页占位（PR-02 补充 Row1~Row6） |
| `apps/dashboard/src/App.tsx` | 当 path 以 /dashboard 开头时仅渲染 AppShell + 子路由；子路由 index=DashboardHome，tasks/runners/models/logs/settings=占位 |
| `apps/dashboard/package.json` | 新增依赖 lucide-react |

## 验证步骤

```bash
cd apps/dashboard
pnpm install
pnpm dev
```

- 浏览器打开 http://localhost:5173/dashboard
- 预期：左侧 240px Sidebar（Bull Board + Dashboard / Tasks / Runners / Models / Logs / Settings），顶部 Topbar（通知/用户/帮助图标），主内容区为 “Dashboard” 标题与占位说明；页面背景为浅灰白，主内容区 p-6

## 预期界面说明

- **Sidebar**：固定宽度 240px，白底+右边框；当前页 “Dashboard” 高亮（主色背景）；其余为 muted 文字，悬停有背景
- **Topbar**：右对齐，三个图标（Bell / User / HelpCircle）
- **主内容**：p-6，标题 “Dashboard”，副文案说明占位
- **整体**：无原有“大脑指挥室”侧栏，仅 AppShell 布局
