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
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { sidebarNavGroups, type NavItem } from "@/mocks/sidebar";

const SIDEBAR_STORAGE_KEY = "bb-sidebar";
const WIDTH_EXPANDED = 240;
const WIDTH_COLLAPSED = 68;
/** 与 Topbar 高度一致，保证左侧 header 与右侧 topbar 对齐 */
const HEADER_HEIGHT = 56;

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
  return Icon ? <Icon className="h-4 w-4 shrink-0" /> : null;
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

  const navItemClass = (active: boolean) =>
    cn(
      "flex min-h-[44px] items-center gap-2 rounded-global-sm px-3 py-2.5 text-sm transition-colors",
      collapsed && "justify-center px-2",
      active
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    );

  const navItemActiveBar = (active: boolean) =>
    active ? (
      <span
        className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r bg-primary-foreground"
        aria-hidden
      />
    ) : null;

  return (
    <aside
      className="flex h-full shrink-0 flex-col border-r border-border bg-card"
      style={{ width: isMobile ? Math.min(width, 280) : width }}
    >
      {/* 顶部固定 SidebarHeader：与 Topbar 同高，Bull Board logo + 文案（收起时仅 logo） */}
      <header
        className="flex shrink-0 items-center gap-2 border-b border-border px-3"
        style={{ height: HEADER_HEIGHT }}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-global-sm bg-primary text-primary-foreground text-sm font-bold">
          BB
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <span className="truncate text-sm font-semibold text-foreground">Bull Board</span>
            {!isMobile && (
              <p className="truncate text-xs text-muted-foreground">任务与看板</p>
            )}
          </div>
        )}
        {isMobile && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-global-sm p-2 text-muted-foreground hover:bg-muted"
            aria-label="关闭"
          >
            ✕
          </button>
        )}
      </header>

      {/* 中部 SidebarNav：菜单可滚动 */}
      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-2">
        {sidebarNavGroups.map((group, gi) => (
          <div key={gi} className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active =
                item.to === "/dashboard"
                  ? location.pathname === "/dashboard"
                  : location.pathname.startsWith(item.to);
              return (
                <div key={item.to} className="relative">
                  {navItemActiveBar(active)}
                  <Link
                    to={item.to}
                    className={cn(navItemClass(active), "relative")}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className={active ? "text-primary-foreground" : ""}>
                      <NavIcon name={item.icon} />
                    </span>
                    {!collapsed && (
                      <>
                        <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
                        {item.badge != null && <Badge text={item.badge} variant={item.badgeVariant} />}
                      </>
                    )}
                  </Link>
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* 底部固定 SidebarFooter：收起 / 展开 按钮，样式与普通菜单一致 */}
      <footer className="shrink-0 border-t border-border p-2">
        <button
          type="button"
          onClick={() => {
            const next = !collapsed;
            onCollapsedChange(next);
            setStoredCollapsed(next);
          }}
          className={cn(
            "flex w-full min-h-[44px] items-center gap-2 rounded-global-sm px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? "展开" : "收起"}
          aria-label={collapsed ? "展开侧栏" : "收起侧栏"}
        >
          {collapsed ? (
            <PanelLeft className="h-4 w-4 shrink-0" />
          ) : (
            <PanelLeftClose className="h-4 w-4 shrink-0" />
          )}
          {!collapsed && <span className="font-medium">收起</span>}
        </button>
      </footer>
    </aside>
  );
}

export { getStoredCollapsed, setStoredCollapsed, WIDTH_EXPANDED, WIDTH_COLLAPSED };
