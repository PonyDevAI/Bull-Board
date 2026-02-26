import { useState, useRef, useEffect } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme, type ThemeValue } from "@/hooks/useTheme";

const OPTIONS: { value: ThemeValue; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "light", label: "浅色", Icon: Sun },
  { value: "dark", label: "深色", Icon: Moon },
  { value: "system", label: "跟随系统", Icon: Monitor },
];

export function ThemeToggle({ compact }: { compact?: boolean }) {
  const { theme, setTheme, resolved } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  /** 紧凑模式：单图标 toggle，点击在太阳/月亮间切换显示 */
  if (compact) {
    const isDark = resolved === "dark";
    return (
      <button
        type="button"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        title={isDark ? "切换到浅色" : "切换到深色"}
        aria-label={isDark ? "浅色" : "深色"}
        aria-pressed={isDark}
      >
        {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </button>
    );
  }

  const ResolvedIcon = resolved === "dark" ? Moon : Sun;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        title="主题"
        aria-label="主题"
        aria-expanded={open}
      >
        <ResolvedIcon className="h-4 w-4" />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1 min-w-[140px] rounded-global border border-border bg-card py-1 shadow-card"
          role="menu"
        >
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="menuitemradio"
              aria-checked={theme === opt.value}
              onClick={() => {
                setTheme(opt.value);
                setOpen(false);
              }}
              className={cn(
                "flex w-full min-h-[44px] items-center gap-2 px-3 py-2 text-sm hover:bg-muted",
                theme === opt.value && "bg-muted font-medium"
              )}
            >
              <opt.Icon className="h-4 w-4 shrink-0" />
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
