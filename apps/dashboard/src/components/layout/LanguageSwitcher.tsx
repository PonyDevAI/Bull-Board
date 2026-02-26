import { useState, useRef, useEffect } from "react";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale, type LocaleValue } from "@/hooks/useLocale";

const OPTIONS: { value: LocaleValue; label: string }[] = [
  { value: "zh-CN", label: "简体中文" },
  { value: "en", label: "English" },
];

export function LanguageSwitcher({ compact }: { compact?: boolean } = {}) {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const current = OPTIONS.find((o) => o.value === locale);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
          compact
            ? "h-8 w-8 rounded-md"
            : "min-h-[44px] min-w-[44px] sm:min-w-0 sm:px-2"
        )}
        title="语言"
        aria-label="语言"
        aria-expanded={open}
      >
        <Globe className="h-4 w-4 shrink-0" />
        {!compact && (
          <>
            <span className="ml-1.5 hidden text-sm sm:inline">{current?.label ?? locale}</span>
            <span className="ml-1.5 text-sm sm:hidden">{locale === "zh-CN" ? "中" : "En"}</span>
          </>
        )}
      </button>
      {open && (
        <div
          className={cn(
            "absolute right-0 z-50 min-w-[120px] rounded-global border border-border bg-card py-1 shadow-card",
            compact ? "bottom-full mb-1" : "top-full mt-1"
          )}
          role="menu"
        >
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="menuitemradio"
              aria-checked={locale === opt.value}
              onClick={() => {
                setLocale(opt.value);
                setOpen(false);
              }}
              className={cn(
                "flex w-full min-h-[44px] items-center px-3 py-2 text-sm hover:bg-muted",
                locale === opt.value && "bg-muted font-medium"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
