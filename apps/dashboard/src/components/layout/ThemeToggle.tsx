import { useState, useRef, useEffect } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme, type ThemeValue } from "@/hooks/useTheme";

const OPTIONS: { value: ThemeValue; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "light", label: "浅色", Icon: Sun },
  { value: "dark", label: "深色", Icon: Moon },
  { value: "system", label: "跟随系统", Icon: Monitor },
];

export function ThemeToggle() {
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

  const ResolvedIcon = resolved === "dark" ? Moon : Sun;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-global-sm text-muted-foreground hover:bg-muted hover:text-foreground"
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
