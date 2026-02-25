import { useState, useRef, useEffect } from "react";
import { ChevronDown, FolderOpen, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { workspaceOptions, type WorkspaceOption } from "@/mocks/sidebar";

export interface WorkspaceSwitcherProps {
  workspace: WorkspaceOption | null;
  onWorkspaceChange: (w: WorkspaceOption) => void;
}

export function WorkspaceSwitcher({ workspace, onWorkspaceChange }: WorkspaceSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const filtered = search.trim()
    ? workspaceOptions.filter(
        (w) =>
          w.name.toLowerCase().includes(search.toLowerCase()) ||
          (w.slug && w.slug.toLowerCase().includes(search.toLowerCase()))
      )
    : workspaceOptions;

  return (
    <div className="relative flex min-w-0 flex-1 max-w-[280px]" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-[44px] w-full items-center gap-2 rounded-global-sm border border-border bg-background px-3 py-2 text-left text-sm hover:bg-muted"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate">{workspace?.name ?? "选择 Workspace"}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-full min-w-[240px] rounded-global border border-border bg-card shadow-card"
          role="listbox"
        >
          <div className="border-b border-border p-2">
            <div className="flex items-center gap-2 rounded-global-sm border border-border bg-background px-2 py-1.5">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索 workspace..."
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="max-h-[280px] overflow-y-auto py-1">
            {filtered.map((w) => (
              <button
                key={w.id}
                type="button"
                role="option"
                aria-selected={workspace?.id === w.id}
                onClick={() => {
                  onWorkspaceChange(w);
                  setOpen(false);
                  setSearch("");
                }}
                className={cn(
                  "flex w-full min-h-[44px] items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted",
                  workspace?.id === w.id && "bg-muted font-medium"
                )}
              >
                <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{w.name}</span>
              </button>
            ))}
          </div>
          <div className="border-t border-border p-1">
            <button
              type="button"
              className="flex w-full min-h-[44px] items-center gap-2 rounded-global-sm px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              title="占位"
            >
              <FolderOpen className="h-4 w-4 shrink-0" />
              Manage workspaces
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
