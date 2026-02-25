import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface StatusCount {
  status: string;
  count: number;
}

export interface PipelineOverviewProps {
  statusCounts: StatusCount[];
  avgDuration: string;
  p95Duration: string;
  wipThreshold?: number;
  reviewThreshold?: number;
  className?: string;
}

export function PipelineOverview({
  statusCounts,
  avgDuration,
  p95Duration,
  wipThreshold = 5,
  reviewThreshold = 3,
  className,
}: PipelineOverviewProps) {
  return (
    <Card className={cn("p-4", className)}>
      <CardHeader className="p-0 pb-3">
        <h3 className="text-lg font-medium text-foreground">Pipeline 概览</h3>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex flex-wrap gap-2">
          {statusCounts.map(({ status, count }) => {
            const isWip =
              (status === "In Progress" && count > wipThreshold) ||
              (status === "Review" && count > reviewThreshold);
            return (
              <div
                key={status}
                className={cn(
                  "rounded-global-sm border border-border bg-card px-3 py-2",
                  isWip && "border-destructive/50 bg-destructive/5"
                )}
              >
                <span className="text-sm font-medium text-foreground">{status}</span>
                <span className="ml-2 text-sm text-muted-foreground">× {count}</span>
                {isWip && (
                  <span className="ml-2 rounded-full bg-destructive/10 px-1.5 py-0.5 text-xs text-destructive">
                    WIP
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
          <span>平均耗时: {avgDuration}</span>
          <span>95p: {p95Duration}</span>
        </div>
      </CardContent>
    </Card>
  );
}
