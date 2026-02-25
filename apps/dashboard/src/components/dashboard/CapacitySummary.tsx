import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function CapacitySummary({ total, used, idle, pending, running, className }: { total: number; used: number; idle: number; pending: number; running: number; className?: string }) {
  return (
    <Card className={cn("p-4", className)}>
      <CardHeader className="p-0 pb-3">
        <h3 className="text-lg font-medium text-foreground">Capacity & Queue</h3>
      </CardHeader>
      <CardContent className="p-0 space-y-2">
        <div className="flex justify-between text-sm"><span className="text-muted-foreground">总 capacity</span><span className="font-medium">{total}</span></div>
        <div className="flex justify-between text-sm"><span className="text-muted-foreground">已用</span><span className="font-medium">{used}</span></div>
        <div className="flex justify-between text-sm"><span className="text-muted-foreground">空闲</span><span className="font-medium">{idle}</span></div>
        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Pending</span><span className="font-medium">{pending}</span></div>
        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Running</span><span className="font-medium">{running}</span></div>
      </CardContent>
    </Card>
  );
}
