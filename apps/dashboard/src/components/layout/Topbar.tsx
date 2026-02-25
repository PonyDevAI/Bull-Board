import { useState } from "react";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { UserMenu } from "./UserMenu";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { workspaceOptions, type WorkspaceOption } from "@/mocks/sidebar";

const TOPBAR_HEIGHT = 56;

export interface TopbarProps {
  onSidebarToggle?: () => void;
}

export function Topbar({ onSidebarToggle }: TopbarProps) {
  const [workspace, setWorkspace] = useState<WorkspaceOption | null>(workspaceOptions[0] ?? null);

  return (
    <header
      className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-4"
      style={{ minHeight: TOPBAR_HEIGHT }}
    >
      {/* 左侧：WorkspaceSwitcher（下拉 + 搜索 + Manage workspaces 占位） */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <button
          type="button"
          onClick={onSidebarToggle}
          className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-global-sm text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
          aria-label="打开侧栏"
        >
          ☰
        </button>
        <WorkspaceSwitcher workspace={workspace} onWorkspaceChange={setWorkspace} />
      </div>

      {/* 右侧：UserMenu / LanguageSwitcher / ThemeToggle */}
      <div className="flex shrink-0 items-center gap-1">
        <ThemeToggle />
        <LanguageSwitcher />
        <UserMenu />
      </div>
    </header>
  );
}

export { TOPBAR_HEIGHT };
