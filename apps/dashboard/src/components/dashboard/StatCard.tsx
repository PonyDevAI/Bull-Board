import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type StatCardProps = {
  value: number | string;
  label: string;
  unit?: string;
  progress?: number;
  className?: string;
};

export function StatCard(p: StatCardProps) {
  const { value, label, unit = "", progress, className } = p;
  return (
    <Card className={cn("p-4", className)}>
      <CardHeader className="p-0 pb-2">
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex items-end justify-between gap-2">
          <span className="text-2xl font-semibold tabular-nums text-foreground">
            {value}
            {unit}
          </span>
          {progress != null && (
            <div className="w-12 shrink-0">
              <Progress value={progress} variant="status" className="h-2" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
