import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import ReactMarkdown from "react-markdown";
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
  X,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { sidebarNavGroups, type NavItem } from "@/mocks/sidebar";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import {
  getSystemVersion,
  getSystemUpdate,
  ignoreVersion,
  getUpgradePlan,
  authLogout,
  type SystemUpdate,
} from "@/api";

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
  const [currentVersion, setCurrentVersion] = useState<string>("");
  const [updateInfo, setUpdateInfo] = useState<SystemUpdate | null>(null);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [copyDone, setCopyDone] = useState(false);

  useEffect(() => {
    getSystemVersion()
      .then((v) => setCurrentVersion(v.current_version || "dev"))
      .catch(() => setCurrentVersion("—"));
  }, []);

  useEffect(() => {
    getSystemUpdate()
      .then(setUpdateInfo)
      .catch(() => setUpdateInfo(null));
  }, [updateModalOpen]);

  // 确保挂载时弹窗关闭，避免误显示蒙层
  useEffect(() => {
    setUpdateModalOpen(false);
  }, []);

  const closeUpdateModal = useCallback(() => setUpdateModalOpen(false), []);

  useEffect(() => {
    if (!updateModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeUpdateModal();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [updateModalOpen, closeUpdateModal]);

  const hasUpdate = !!updateInfo?.has_update && !!updateInfo?.latest?.version;

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
            onClick={() => {
              authLogout().then(() => {
                window.location.href = "/login";
              });
            }}
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
          <button
            type="button"
            onClick={() => setUpdateModalOpen(true)}
            className="flex min-h-[32px] min-w-[44px] items-center gap-1 rounded text-xs text-muted-foreground hover:text-foreground"
            title="版本与更新"
          >
            <span className="truncate">{currentVersion}</span>
            {hasUpdate && (
              <span className="shrink-0 rounded bg-amber-100 px-1 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/50 dark:text-amber-400">
                更新
              </span>
            )}
          </button>
        )}
        <div className="flex shrink-0 items-center gap-0.5">
          <ThemeToggle compact />
          <LanguageSwitcher compact />
        </div>
      </footer>

      {/* 版本与更新弹窗（完全按宝塔样式：绿顶栏 + 波浪 + 白底内容 + 标准按钮） */}
      {updateModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
            onClick={closeUpdateModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sidebar-update-modal-title"
          >
            <div
              className="relative z-[101] flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-card shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 宝塔风格：绿色顶栏，白字，右侧关闭 */}
              <div className="relative shrink-0 bg-primary px-4 py-3 text-primary-foreground">
                <div className="flex items-center justify-between gap-2">
                  <h2 id="sidebar-update-modal-title" className="text-base font-semibold">
                    版本更新
                  </h2>
                  <button
                    type="button"
                    onClick={closeUpdateModal}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-white/20"
                    aria-label="关闭"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {/* 波浪形底边（绿→白过渡） */}
                <div className="absolute bottom-0 left-0 right-0 h-3 overflow-hidden leading-[0]">
                  <svg viewBox="0 0 400 12" className="w-full" preserveAspectRatio="none">
                    <path
                      fill="hsl(var(--card))"
                      d="M0 12V0h400v12c-20-3-40-3-60 0s-40 3-60 0-40-3-60 0-40 3-60 0-40-3-60 0-40 3-60 0-20 3-40 0z"
                    />
                  </svg>
                </div>
              </div>

              {/* 白底内容区，标准间距 */}
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-card pt-1">
                {hasUpdate && updateInfo?.latest?.version ? (
                  <>
                    <div className="shrink-0 space-y-2 px-4 pt-4 pb-3">
                      <p className="text-base font-semibold text-foreground">发现新版本</p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span>
                          最新版本：<strong className="text-primary">{updateInfo.latest.version}</strong>
                        </span>
                        {updateInfo.latest.published_at && (
                          <span>更新时间：{updateInfo.latest.published_at.slice(0, 10)}</span>
                        )}
                      </div>
                    </div>
                    {updateInfo.latest.notes_md && (
                      <div className="min-h-0 flex-1 overflow-y-auto border-y border-border px-4 py-3">
                        <div className="prose prose-sm max-w-none dark:prose-invert prose-p:text-muted-foreground prose-li:text-muted-foreground text-sm">
                          <ReactMarkdown>{updateInfo.latest.notes_md}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 px-4 py-4">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await ignoreVersion(updateInfo!.latest!.version);
                            closeUpdateModal();
                            setUpdateInfo(null);
                            getSystemUpdate().then(setUpdateInfo);
                          } catch {
                            // ignore
                          }
                        }}
                        className="h-10 rounded-lg border border-border bg-muted px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/80"
                      >
                        忽略更新
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const plan = await getUpgradePlan(updateInfo!.latest!.version);
                            await navigator.clipboard.writeText(plan.command);
                            setCopyDone(true);
                            setTimeout(() => setCopyDone(false), 2000);
                          } catch {
                            // ignore
                          }
                        }}
                        className="h-10 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                      >
                        {copyDone ? "已复制" : "立即更新"}
                      </button>
                      {updateInfo.latest.release_url && (
                        <a
                          href={updateInfo.latest.release_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-10 items-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                        >
                          查看详情
                        </a>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex flex-col items-center gap-3 px-4 py-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-6 w-6" />
                      </div>
                      <p className="text-base font-semibold text-foreground">当前已经是最新版本</p>
                      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span>当前版本：{currentVersion}</span>
                        {updateInfo?.latest?.published_at && (
                          <span>当前发布时间：{updateInfo.latest.published_at.slice(0, 10)}</span>
                        )}
                      </div>
                    </div>
                    <div className="px-4 pb-4">
                      <button
                        type="button"
                        onClick={closeUpdateModal}
                        className="h-10 w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                      >
                        关闭
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </aside>
  );
}

export { getStoredCollapsed, setStoredCollapsed, WIDTH_EXPANDED, WIDTH_COLLAPSED };
