import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Blocked = { id: string; reason: string; severity: "low" | "med" | "high" };

export function QualityRiskPanel({
  failRate24h,
  failCount24h,
  topReasons,
  blockedTasks,
  className,
}: {
  failRate24h: number;
  failCount24h: number;
  topReasons: { reason: string; count: number }[];
  blockedTasks: Blocked[];
  className?: string;
}) {
  return (
    <div className={cn("grid gap-gap md:grid-cols-2", className)}>
      <Card className="p-4">
        <CardHeader className="p-0 pb-3">
          <h3 className="text-lg font-medium text-foreground">24h 质量与失败</h3>
        </CardHeader>
        <CardContent className="p-0 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">失败率</span>
            <span className="font-medium">{failRate24h}%</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">失败数</span>
            <span className="font-medium">{failCount24h}</span>
          </div>
          <p className="text-xs font-medium text-muted-foreground pt-2">失败原因 Top</p>
          <ul className="space-y-1">
            {topReasons.map((r) => (
              <li key={r.reason} className="flex justify-between text-sm">
                <span className="text-foreground">{r.reason}</span>
                <span className="text-muted-foreground">{r.count}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card className="p-4">
        <CardHeader className="p-0 pb-3">
          <h3 className="text-lg font-medium text-foreground">阻塞任务</h3>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="space-y-2">
            {blockedTasks.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium text-foreground">{t.id}</span>
                <span className="text-muted-foreground truncate">{t.reason}</span>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-xs",
                    t.severity === "high" && "bg-destructive/10 text-destructive",
                    t.severity === "med" && "bg-amber-500/10 text-amber-700",
                    t.severity === "low" && "bg-muted text-muted-foreground"
                  )}
                >
                  {t.severity}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
