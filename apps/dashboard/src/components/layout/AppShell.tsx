import { Outlet, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { Sidebar, getStoredCollapsed } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(getStoredCollapsed);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = () => setIsMobile(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* 桌面侧栏：h-full 使 Sidebar 占满高度，中间 Nav 才能 overflow-y-auto 滚动 */}
      <div className="hidden h-full md:block">
        <Sidebar
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />
      </div>

      {/* 移动端抽屉 */}
      {isMobile && sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
          <div className="fixed inset-y-0 left-0 z-50 w-[min(85vw,280px)] md:hidden">
            <Sidebar
              collapsed={false}
              onCollapsedChange={() => {}}
              isMobile
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </>
      )}

      {/* Main：顶部固定 Topbar + 下方 MainContent 可滚动 */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar onSidebarToggle={() => setSidebarOpen(true)} />
        <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
