import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type Runner = { name: string; status: string; used: number; total: number; lastHeartbeat: string; lastError: string };

export function RunnerHealthPanel(p: { runners: Runner[]; className?: string }) {
  const { runners, className } = p;
  return (
    <Card className={cn("p-4", className)}>
      <CardHeader className="p-0 pb-3">
        <h3 className="text-lg font-medium text-foreground">Runner Health</h3>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-inner">
          {runners.map((r) => (
            <div key={r.name} className="rounded-global-sm border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">{r.name}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-xs", r.status === "online" ? "bg-green-500/10 text-green-700" : "bg-muted text-muted-foreground")}>{r.status}</span>
              </div>
              <Progress value={(r.used / r.total) * 100} className="mt-2 h-1.5" />
              <p className="mt-1 text-xs text-muted-foreground">{r.used}/{r.total} · {r.lastHeartbeat}</p>
              {r.lastError && <p className="mt-0.5 truncate text-xs text-destructive">{r.lastError}</p>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
