import { useState, useRef, useEffect } from "react";
import { User, LogOut, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export function UserMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border-2 border-border bg-muted text-muted-foreground hover:bg-muted hover:text-foreground"
        title="用户菜单"
        aria-label="用户菜单"
        aria-expanded={open}
      >
        <User className="h-5 w-5" />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-global border border-border bg-card py-1 shadow-card"
          role="menu"
        >
          <div className="border-b border-border px-3 py-2 text-sm font-medium text-foreground">
            当前用户
          </div>
          <button
            type="button"
            className="flex w-full min-h-[44px] items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Settings className="h-4 w-4 shrink-0" />
            设置
          </button>
          <button
            type="button"
            className="flex w-full min-h-[44px] items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            退出（占位）
          </button>
        </div>
      )}
    </div>
  );
}
