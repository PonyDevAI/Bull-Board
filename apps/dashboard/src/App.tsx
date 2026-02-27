import { Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getWorkspaces, authMe, authLogout, type Workspace } from "@/api";
import { Workspaces } from "@/pages/Workspaces";
import { Board } from "@/pages/Board";
import { TaskDetail } from "@/pages/TaskDetail";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardHome } from "@/pages/DashboardHome";
import { KanbanPage } from "@/pages/KanbanPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { LogsPage } from "@/pages/LogsPage";
import { LoginPage } from "@/pages/LoginPage";

function Home() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">大脑指挥室</h2>
      <p className="text-slate-600 dark:text-slate-400">Bull Board 看板控制台 v0.1</p>
      <div className="flex flex-wrap gap-2">
        <Link to="/board" className="min-h-[44px] min-w-[44px] rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500">
          任务中心
        </Link>
        <Link to="/workspaces" className="min-h-[44px] min-w-[44px] rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
          数据管理
        </Link>
      </div>
    </div>
  );
}

function Sidebar({
  workspaces,
  onClose,
  isMobile,
}: {
  workspaces: Workspace[];
  onClose?: () => void;
  isMobile?: boolean;
}) {
  const location = useLocation();

  useEffect(() => {
    if (isMobile && onClose) onClose();
  }, [location.pathname, location.search, isMobile, onClose]);

  const nav = [
    { to: "/board", label: "任务中心", sub: "Tasks", icon: "trashcan" },
    { to: "/logs", label: "系统日志", sub: "Logs", icon: "doc" },
  ];

  const content = (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 p-4 dark:border-slate-700">
        <span className="flex items-center gap-2">
          <span className="text-lg text-slate-400 dark:text-slate-500">⚙</span>
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">大脑指挥室 (Console)</span>
        </span>
        {isMobile && (
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="关闭菜单"
          >
            ✕
          </button>
        )}
      </div>
      <nav className="flex flex-col gap-0.5 p-2">
        {nav.map(({ to, label, sub, icon }) => {
          const active = to === "/board" ? location.pathname.startsWith("/board") || location.pathname.startsWith("/tasks") : location.pathname === to;
          if (to === "/logs") {
            return (
              <div
                key={to}
                className="flex cursor-not-allowed items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-slate-400 min-h-[44px] dark:text-slate-500"
                title="敬请期待"
              >
                <span className="text-slate-300 dark:text-slate-500">{icon === "doc" ? "📄" : "🗑"}</span>
                <span>{label}</span>
                <span className="ml-auto text-xs">({sub})</span>
              </div>
            );
          }
          return (
            <Link
              key={to}
              to={to}
              className={`flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2.5 text-sm ${
                active ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              <span className={active ? "text-blue-500 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"}>{icon === "trashcan" ? "🗑" : "📄"}</span>
              <span className="font-medium">{label}</span>
              <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">({sub})</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-4 flex flex-1 flex-col overflow-auto border-t border-slate-100 p-3 dark:border-slate-700">
        <p className="mb-2 px-1 text-xs font-medium text-slate-500 dark:text-slate-400">客户端列表</p>
        {(workspaces ?? []).length === 0 ? (
          <p className="px-1 text-xs text-slate-400 dark:text-slate-500">暂无 Workspace</p>
        ) : (
          (workspaces ?? []).map((w) => (
            <Link
              key={w.id}
              to={"/board?workspace_id=" + w.id}
              className="mb-2 flex min-h-[44px] items-center justify-between rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <span className="flex items-center gap-2 truncate">
                <span className="text-slate-400 dark:text-slate-500">🖥</span>
                <span className="truncate">{w.name}</span>
              </span>
              <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400">
                空闲
              </span>
            </Link>
          ))
        )}
      </div>
    </>
  );

  if (isMobile) {
    return (
      <aside className="fixed inset-y-0 left-0 z-50 flex w-[min(85vw,280px)] flex-col border-r border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
        {content}
      </aside>
    );
  }

  return (
    <aside className="hidden h-full w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex dark:border-slate-700 dark:bg-slate-900">
      {content}
    </aside>
  );
}

export default function App() {
  const location = useLocation();
  const [authStatus, setAuthStatus] = useState<"pending" | "ok" | null>("pending");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    authMe()
      .then((u) => setAuthStatus(u ? "ok" : null))
      .catch(() => setAuthStatus(null));
  }, []);

  useEffect(() => {
    getWorkspaces().then(setWorkspaces).catch(() => {});
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = () => setIsMobile(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const showDrawer = isMobile && sidebarOpen;

  if (location.pathname === "/login") {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage onLoginSuccess={() => setAuthStatus("ok")} />} />
      </Routes>
    );
  }
  if (authStatus === "pending") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-900">
        <span className="text-slate-500 dark:text-slate-400">加载中…</span>
      </div>
    );
  }
  if (authStatus === null) {
    const returnTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={"/login?returnTo=" + returnTo} replace />;
  }

  // Dashboard 布局：/dashboard、/settings、/kanban 共用 AppShell + Sidebar
  if (
    location.pathname === "/" ||
    location.pathname.startsWith("/dashboard") ||
    location.pathname.startsWith("/settings") ||
    location.pathname === "/kanban"
  ) {
    return (
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<AppShell />}>
          <Route index element={<DashboardHome />} />
          <Route path="tasks" element={<div className="text-muted-foreground p-4">Tasks 占位</div>} />
          <Route path="backlog" element={<div className="text-muted-foreground p-4">Backlog 占位</div>} />
          <Route path="runs" element={<div className="text-muted-foreground p-4">Runs 占位</div>} />
          <Route path="runners" element={<div className="text-muted-foreground p-4">Runners 占位</div>} />
          <Route path="workspaces" element={<div className="text-muted-foreground p-4">Workspaces 占位</div>} />
          <Route path="artifacts" element={<div className="text-muted-foreground p-4">Artifacts 占位</div>} />
          <Route path="models" element={<div className="text-muted-foreground p-4">Models 占位</div>} />
          <Route path="roles" element={<div className="text-muted-foreground p-4">Roles & Routing 占位</div>} />
          <Route path="policies" element={<div className="text-muted-foreground p-4">Policies 占位</div>} />
          <Route path="logs" element={<LogsPage />} />
          <Route path="audit" element={<div className="text-muted-foreground p-4">Audit 占位</div>} />
          <Route path="alerts" element={<div className="text-muted-foreground p-4">Alerts 占位</div>} />
        </Route>
        <Route path="/settings" element={<AppShell />}>
          <Route index element={<SettingsPage />} />
        </Route>
        <Route path="/kanban" element={<AppShell />}>
          <Route index element={<KanbanPage />} />
        </Route>
      </Routes>
    );
  }

  return (
    <div className="flex h-screen bg-white dark:bg-slate-900">
      {/* 桌面侧栏 */}
      <Sidebar workspaces={workspaces} isMobile={false} />

      {/* 移动端抽屉 */}
      {showDrawer && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
          <Sidebar
            workspaces={workspaces}
            onClose={() => setSidebarOpen(false)}
            isMobile
          />
        </>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3 md:px-6 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex min-h-[44px] min-w-[44px] items-center gap-2 md:min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 md:hidden dark:text-slate-400 dark:hover:bg-slate-800"
              aria-label="打开菜单"
            >
              ☰
            </button>
            <span className="truncate text-base font-bold text-slate-900 md:text-xl dark:text-slate-100">Bull Board 监控中心</span>
            <span className="hidden text-slate-400 dark:text-slate-500 md:inline">🌙</span>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="hidden items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-600 sm:flex md:px-3 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <span className="truncate max-w-[120px] md:max-w-none">Bull Board (S端)</span>
              <span className="text-slate-400 dark:text-slate-500">▾</span>
            </div>
            <button type="button" className="min-h-[44px] min-w-[44px] rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800" title="刷新">
              <span className="text-lg">🔄</span>
            </button>
            <button
              type="button"
              onClick={() => authLogout().then(() => { window.location.href = "/login"; })}
              className="min-h-[44px] rounded-lg px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              退出
            </button>
            <div className="flex h-6 w-10 items-center rounded-full bg-slate-200 min-h-[44px] min-w-[44px] justify-center md:min-h-0 md:min-w-0 md:justify-start dark:bg-slate-700">
              <div className="ml-1 h-4 w-4 rounded-full bg-white shadow dark:bg-slate-300" />
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-white p-page dark:bg-slate-900">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/workspaces" element={<Workspaces />} />
            <Route path="/board" element={<Board />} />
            <Route path="/tasks/:id" element={<TaskDetail />} />
            <Route path="/logs" element={<Navigate to="/dashboard/logs" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
