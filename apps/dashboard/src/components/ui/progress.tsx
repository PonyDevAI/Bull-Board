import * as React from "react";
import { cn } from "@/lib/utils";

/** 宝塔风格：按百分比绿(<60) / 橙(60-85) / 红(>85) */
function progressBarClass(pct: number): string {
  if (pct > 85) return "bg-red-500";
  if (pct > 60) return "bg-amber-500";
  return "bg-emerald-500";
}

type ProgressProps = React.HTMLAttributes<HTMLDivElement> & {
  value?: number;
  max?: number;
  /** 为 true 时按 value 显示绿/橙/红，否则用 primary */
  variant?: "default" | "status";
};

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, variant = "status", ...props }, ref) => {
    const pct = Math.min(100, Math.max(0, max ? (value / max) * 100 : 0));
    const barClass =
      variant === "status" ? progressBarClass(pct) : "bg-primary";
    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemax={max}
        className={cn(
          "relative h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700",
          className
        )}
        {...props}
      >
        <div
          className={cn("h-full transition-all", barClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
    );
  }
);
Progress.displayName = "Progress";

export { Progress };
