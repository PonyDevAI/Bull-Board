# Bull Board Dashboard UI 规范（宝塔风格）

## 1. 设计 Tokens（Design Tokens）

### 1.1 圆角
- **全局默认**：`--radius: 12px`（对应 Tailwind `rounded-global`）
- 小圆角：`--radius-sm: 8px`（`rounded-global-sm`）
- 大圆角：`--radius-lg: 16px`（`rounded-global-lg`）

### 1.2 色板（HSL 变量）
| Token | 用途 |
|-------|------|
| `--background` | 页面背景（浅灰白 0 0% 98%） |
| `--foreground` | 主文字 |
| `--card` | 卡片底色（白 0 0% 100%） |
| `--card-foreground` | 卡片内文字 |
| `--primary` | 主色（深灰 222 47% 11%） |
| `--primary-foreground` | 主色上的文字 |
| `--secondary` | 次要背景/按钮 |
| `--secondary-foreground` | 次要上的文字 |
| `--muted` | 弱化背景 |
| `--muted-foreground` | 次级文字（说明、辅助） |
| `--destructive` | 危险/错误 |
| `--destructive-foreground` | 危险上的文字 |
| `--border` | 边框（214 32% 91%） |
| `--ring` | 焦点环 |

### 1.3 卡片
- **边框**：浅色 `--card-border`（与 `--border` 一致）
- **阴影**：轻阴影 `--card-shadow`（0 1px 3px / 0 1px 2px）
- **底色**：白 `--card`
- 全站 Card 组件统一使用以上 tokens，不单独写一套阴影/边框。

### 1.4 间距
- **页面容器**：`p-6`（对应 `--page-container-padding`）
- **栅格间距**：`gap-4`（`--grid-gap`）
- **卡片内边距**：`p-4`（`--card-padding`）

### 1.5 字号与层级
- **Page title**：`text-xl` 或 `text-2xl`
- **KPI 数字**：`text-2xl` ~ `text-3xl`
- **次级文字**：`text-sm text-muted-foreground`
- **说明/辅助**：`text-xs text-muted-foreground`

---

## 2. Layout 规则

- **Sidebar 宽度**：`--sidebar-width: 240px`（固定）
- **Topbar 高度**：`--topbar-height: 56px`
- **页面容器**：主内容区使用 `p-6`，栅格使用 `gap-4`
- **主内容区**：在 AppShell 的 `<main>` 内，可滚动，背景为页面背景（浅灰白）

---

## 3. 组件规范

### 3.1 Card
- 默认：`rounded-global border border-border bg-card shadow-card`
- 内容区：`p-4`（CardHeader/CardContent 统一 p-4）
- 不要在各页面单独写一套 card 阴影/边框，一律用 `Card` 组件。

### 3.2 Table
- 表头：`text-sm font-medium text-muted-foreground`
- 单元格：`text-sm`，边框用 `border-border`
- 行悬停：`hover:bg-muted/50`（可选）

### 3.3 Badge
- 变体：default / secondary / destructive / outline
- 默认大小：`text-xs`，padding 适中（如 px-2 py-0.5）
- 状态区分：online=green、offline=muted、warning=amber、error=destructive

### 3.4 Button
- 默认大小：`h-10 px-4`（与现有 shadcn Button 一致）
- 变体：default（主色）、outline、ghost、destructive
- 次要操作优先用 outline 或 ghost

---

## 4. 图标

- 统一使用 **lucide-react**，不混用其他图标库。
- 与文字同排时，图标与文字间距 `gap-2`。

---

## 5. 文件与 Tokens 引用

- Tokens 定义：`src/styles/globals.css`
- Tailwind 扩展：`tailwind.config.js`（colors、borderRadius、boxShadow、sidebar/topbar 尺寸）
- 页面背景：`body` 使用 `bg-background`（index.css）
