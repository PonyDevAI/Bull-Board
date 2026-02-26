import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  LayoutGrid,
  ListTodo,
  Play,
  Cpu,
  FolderOpen,
  Package,
  Bot,
  Route,
  Shield,
  FileText,
  ClipboardList,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { sidebarNavGroups, type NavItem } from "@/mocks/sidebar";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

const SIDEBAR_STORAGE_KEY = "bb-sidebar";
const WIDTH_EXPANDED = 240;
const WIDTH_COLLAPSED = 68;
/** 收起时与菜单项同一行高 */
const SIDEBAR_ROW_HEIGHT = 32;
/** 与 Topbar 高度一致 */
const SIDEBAR_HEADER_HEIGHT = 56;
/** header logo 与菜单图标统一尺寸（30px） */
const SIDEBAR_ICON_SIZE = "h-[30px] w-[30px]";

function getStoredCollapsed(): boolean {
  try {
    const v = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return v === "collapsed";
  } catch {
    return false;
  }
}

function setStoredCollapsed(collapsed: boolean) {
  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? "collapsed" : "expanded");
  } catch {}
}

const iconMap = {
  LayoutDashboard,
  LayoutGrid,
  ListTodo,
  Play,
  Cpu,
  FolderOpen,
  Package,
  Bot,
  Route,
  Shield,
  FileText,
  ClipboardList,
  Bell,
  Settings,
} as const;

function NavIcon({ name }: { name: string }) {
  const Icon = iconMap[name as keyof typeof iconMap];
  return Icon ? <Icon className="h-5 w-5 shrink-0" /> : null;
}

function Badge({ text, variant = "default" }: { text: string; variant?: NavItem["badgeVariant"] }) {
  const styles = {
    default: "bg-muted text-muted-foreground",
    success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
    warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    destructive: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  };
  return (
    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", styles[variant ?? "default"])}>
      {text}
    </span>
  );
}

export interface SidebarProps {
  collapsed: boolean;
  onCollapsedChange: (v: boolean) => void;
  isMobile?: boolean;
  onClose?: () => void;
}

export function Sidebar({ collapsed, onCollapsedChange, isMobile, onClose }: SidebarProps) {
  const location = useLocation();
  const width = collapsed ? WIDTH_COLLAPSED : WIDTH_EXPANDED;

  /** 选中/hover：如图 card，左侧绿色圆角 border + 浅色背景 + 图标变色 */
  const navItemClass = (active: boolean) =>
    cn(
      "flex items-center gap-2 rounded-lg border-l-4 px-2 py-1.5 text-sm transition-colors",
      collapsed ? "min-h-[32px] justify-center px-1.5" : "min-h-[32px]",
      "border-l-transparent text-slate-600 dark:text-slate-400",
      "hover:border-l-emerald-500 hover:bg-emerald-50/60 hover:text-slate-800 dark:hover:border-l-emerald-400 dark:hover:bg-emerald-500/10 dark:hover:text-white",
      active &&
        "border-l-emerald-500 bg-emerald-50/60 text-slate-800 dark:border-l-emerald-400 dark:bg-emerald-500/10 dark:text-white"
    );

  const handleToggleCollapse = () => {
    const next = !collapsed;
    onCollapsedChange(next);
    setStoredCollapsed(next);
  };

  return (
    <aside
      className="relative flex h-full shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
      style={{ width: isMobile ? Math.min(width, 280) : width }}
    >
      {/* 竖线顶部的圆形收起/展开按钮（仅桌面端，与顶栏对齐） */}
      {!isMobile && (
        <button
          type="button"
          onClick={handleToggleCollapse}
          className="absolute right-0 top-[28px] z-10 flex h-6 w-6 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          title={collapsed ? "展开侧栏" : "收起侧栏"}
          aria-label={collapsed ? "展开侧栏" : "收起侧栏"}
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3 shrink-0" />
          ) : (
            <ChevronLeft className="h-3 w-3 shrink-0" />
          )}
        </button>
      )}

      {/* 顶部固定 SidebarHeader：布局与菜单栏一致——收起时复用菜单项同一套 class，展开时同结构 + 文字与 badge */}
      <header
        className="flex shrink-0 border-b border-slate-200 dark:border-slate-700"
        style={{ height: SIDEBAR_HEADER_HEIGHT, minHeight: SIDEBAR_HEADER_HEIGHT }}
      >
        {collapsed ? (
          /* 收起：与 nav 同宽——右侧预留 6px 与 nav 滚动条一致，图标对齐 */
          <div className="flex h-full items-center pl-2 pr-[14px]">
            <div
              className={cn(
                "flex min-h-[32px] w-full items-center rounded-lg border-l-4 border-l-transparent px-1.5 py-1.5 text-sm",
                "justify-center"
              )}
            >
              <span className={cn("relative flex shrink-0 items-center justify-center text-foreground dark:text-slate-200", SIDEBAR_ICON_SIZE)}>
                <LayoutDashboard className="h-5 w-5" />
                <span
                  className="absolute -right-0.5 -top-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-emerald-500 text-[8px] font-medium leading-none text-white dark:bg-emerald-400 dark:text-slate-900"
                  title="通知"
                >
                  1
                </span>
              </span>
            </div>
          </div>
        ) : (
          /* 展开：与菜单项同结构——p-2 + 一行带 border-l-4 + pl-3 占位 + 图标 + gap-2 + 文字 + badge */
          <div className="flex h-full min-w-0 flex-1 items-center gap-2 pl-2 pr-2 min-h-0">
            <div className="flex shrink-0 items-center justify-start pl-3">
              <span className={cn("relative flex shrink-0 items-center justify-center text-foreground dark:text-slate-200", SIDEBAR_ICON_SIZE)}>
                <LayoutDashboard className="h-5 w-5" />
              </span>
            </div>
            <span className="min-w-0 truncate text-sm font-medium text-foreground">Bull Board</span>
            <span
              className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded bg-emerald-500 px-1.5 text-xs font-medium text-white dark:bg-emerald-400 dark:text-slate-900"
              title="通知"
            >
              1
            </span>
          </div>
        )}
        {isMobile && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="关闭"
          >
            ✕
          </button>
        )}
      </header>

      {/* 中部 SidebarNav：菜单可滚动，预留滚动条宽度与 header 一致，图标对齐 */}
      <nav className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-2 [scrollbar-gutter:stable]">
        {sidebarNavGroups.map((group, gi) => (
          <div key={gi} className="flex flex-col gap-4">
            {group.items.map((item) => {
              const active =
                item.to === "/dashboard"
                  ? location.pathname === "/dashboard"
                  : location.pathname.startsWith(item.to);
              return (
                <div key={item.to} className="relative">
                  <Link
                    to={item.to}
                    className={cn(navItemClass(active), "group relative")}
                    title={collapsed ? item.label : undefined}
                  >
                    <span
                      className={cn(
                        "relative flex shrink-0 items-center justify-center transition-colors",
                        SIDEBAR_ICON_SIZE,
                        active
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400"
                      )}
                    >
                      <NavIcon name={item.icon} />
                      {collapsed && item.badge != null && (
                        <span
                          className={cn(
                            "absolute -right-0.5 -top-0.5 flex h-3 w-3 min-w-[12px] items-center justify-center rounded-full px-0.5 text-[8px] font-medium leading-none",
                            item.badgeVariant === "success" && "bg-emerald-500 text-white dark:bg-emerald-400 dark:text-slate-900",
                            item.badgeVariant === "warning" && "bg-amber-500 text-white dark:bg-amber-400 dark:text-slate-900",
                            item.badgeVariant === "destructive" && "bg-red-500 text-white dark:bg-red-400 dark:text-slate-900",
                            (item.badgeVariant === "default" || !item.badgeVariant) && "bg-muted text-muted-foreground"
                          )}
                          title={item.badge}
                        >
                          {item.badge.length > 2 ? item.badge.slice(0, 1) : item.badge}
                        </span>
                      )}
                    </span>
                    {!collapsed && (
                      <>
                        <span className="min-w-0 flex-1 truncate whitespace-nowrap font-medium">{item.label}</span>
                        {item.badge != null && <Badge text={item.badge} variant={item.badgeVariant} />}
                      </>
                    )}
                  </Link>
                </div>
              );
            })}
          </div>
        ))}
        {/* 菜单栏底部：退出（样式同其他菜单，hover 时变红） */}
        <div className="mt-auto">
          <button
            type="button"
            className={cn(
              "group/exit flex w-full min-h-[32px] items-center gap-2 rounded-lg border-l-4 border-l-transparent px-2 py-1.5 text-sm transition-colors",
              "text-slate-600 dark:text-slate-400",
              "hover:border-l-red-500 hover:text-red-600 dark:hover:border-l-red-400 dark:hover:text-red-400",
              collapsed && "justify-center px-1.5"
            )}
            title="退出"
            aria-label="退出"
          >
            <span
              className={cn(
                "flex shrink-0 items-center justify-center transition-colors",
                SIDEBAR_ICON_SIZE,
                "text-slate-500 dark:text-slate-400 group-hover/exit:text-red-600 dark:group-hover/exit:text-red-400"
              )}
            >
              <LogOut className="h-5 w-5" />
            </span>
            {!collapsed && <span>退出</span>}
          </button>
        </div>
      </nav>

      {/* 底部固定 SidebarFooter：版本号 + 暗黑模式切换（紧凑高度） */}
      <footer
        className={cn(
          "flex shrink-0 items-center gap-2 border-t border-slate-200 px-2 py-1.5 dark:border-slate-700",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        {!collapsed && (
          <span className="truncate text-xs text-muted-foreground" title="版本">
            v0.1.0
          </span>
        )}
        <div className="flex shrink-0 items-center gap-0.5">
          <ThemeToggle compact />
          <LanguageSwitcher compact />
        </div>
      </footer>
    </aside>
  );
}

export { getStoredCollapsed, setStoredCollapsed, WIDTH_EXPANDED, WIDTH_COLLAPSED };
