import { useState } from "react";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { workspaceOptions, type WorkspaceOption } from "@/mocks/sidebar";

const TOPBAR_HEIGHT = 56;

export interface TopbarProps {
  onSidebarToggle?: () => void;
}

export function Topbar({ onSidebarToggle }: TopbarProps) {
  const [workspace, setWorkspace] = useState<WorkspaceOption | null>(workspaceOptions[0] ?? null);

  return (
    <header
      className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
      style={{ minHeight: TOPBAR_HEIGHT }}
    >
      {/* 左侧：仅移动端显示汉堡菜单 */}
      <div className="flex shrink-0 items-center md:w-0 md:overflow-hidden">
        <button
          type="button"
          onClick={onSidebarToggle}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 md:hidden"
          aria-label="打开侧栏"
        >
          ☰
        </button>
      </div>

      {/* 右侧：仅 Workspace 选择 */}
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-sm font-medium shadow-sm dark:bg-emerald-500">
          {workspace?.name?.charAt(0) ?? "B"}
        </div>
        <WorkspaceSwitcher workspace={workspace} onWorkspaceChange={setWorkspace} />
      </div>
    </header>
  );
}

export { TOPBAR_HEIGHT };
