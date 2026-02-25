import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function RoleModelRouting(props: { routing: Array<{ role: string; primary: string; fallback: string; policy: string }>; className?: string }) {
  const { routing, className } = props;
  return (
    <Card className={cn("p-4", className)}>
      <CardHeader className="p-0 pb-3">
        <h3 className="text-lg font-medium text-foreground">Role → Model 路由</h3>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Role</th>
                <th className="pb-2 pr-4 font-medium">Primary</th>
                <th className="pb-2 pr-4 font-medium">Fallback</th>
                <th className="pb-2 font-medium">Policy</th>
              </tr>
            </thead>
            <tbody>
              {routing.map((r) => (
                <tr key={r.role} className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium text-foreground">{r.role}</td>
                  <td className="py-2 pr-4 text-foreground">{r.primary}</td>
                  <td className="py-2 pr-4 text-muted-foreground">{r.fallback}</td>
                  <td className="py-2"><span className="rounded-global-sm bg-muted px-2 py-0.5 text-xs text-muted-foreground">{r.policy}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
