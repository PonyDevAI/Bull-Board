import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, LogOut, Settings } from "lucide-react";
import { authLogout } from "@/api";

export function UserMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const handleLogout = () => {
    setOpen(false);
    authLogout().then(() => navigate("/login", { replace: true }));
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
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
          <Link
            to="/settings"
            className="flex w-full min-h-[44px] items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => setOpen(false)}
          >
            <Settings className="h-4 w-4 shrink-0" />
            设置
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full min-h-[44px] items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            退出
          </button>
        </div>
      )}
    </div>
  );
}
