import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface DiskItem {
  label: string;
  used: number;
  total: number;
  percent: number;
}

export interface DiskUsageRingsProps {
  disks: DiskItem[];
  className?: string;
}

function formatBytes(n: number) {
  if (n >= 1e12) return (n / 1e12).toFixed(1) + " TB";
  if (n >= 1e9) return (n / 1e9).toFixed(1) + " GB";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + " MB";
  return (n / 1e3).toFixed(0) + " KB";
}

export function DiskUsageRings({ disks, className }: DiskUsageRingsProps) {
  return (
    <Card className={cn("p-4", className)}>
      <CardHeader className="p-0 pb-3">
        <h3 className="text-sm font-medium text-foreground">磁盘分区</h3>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {disks.map((d) => (
            <div key={d.label} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">{d.label}</span>
                {d.percent > 85 && (
                  <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-xs text-destructive">
                    warning
                  </span>
                )}
              </div>
              <Progress value={d.percent} variant="status" className="h-1.5" />
              <p className="text-xs text-muted-foreground">
                {formatBytes(d.used)} / {formatBytes(d.total)}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
