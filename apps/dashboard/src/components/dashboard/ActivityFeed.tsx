import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface ActivityItem {
  time: string;
  type: string;
  desc: string;
  ref: string;
}

export interface ActivityFeedProps {
  items: ActivityItem[];
  className?: string;
}

export function ActivityFeed({ items, className }: ActivityFeedProps) {
  return (
    <Card className={cn("p-4", className)}>
      <CardHeader className="p-0 pb-3">
        <h3 className="text-lg font-medium text-foreground">Activity / Audit</h3>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="space-y-2">
          {items.map((a, i) => (
            <li key={i} className="flex flex-wrap items-baseline gap-2 border-b border-border/50 pb-2 text-sm last:border-0 last:pb-0">
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{a.time}</span>
              <span className="rounded-global-sm bg-muted px-1.5 py-0.5 text-xs font-medium text-foreground">
                {a.type}
              </span>
              <span className="text-foreground">{a.desc}</span>
              {a.ref && (
                <span className="text-xs text-muted-foreground">{a.ref}</span>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
