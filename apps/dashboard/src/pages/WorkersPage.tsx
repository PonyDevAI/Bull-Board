import { useEffect, useState } from "react";
import { getWorkers, getPersons, type Worker, type Person } from "@/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const DEPTS = [
  { id: "plan", label: "规划 (plan)" },
  { id: "exec", label: "执行 (exec)" },
];

function workerStatusBadge(w: Worker) {
  if (w.current_job_id) return { text: "忙碌", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-400" };
  if (w.person_last_heartbeat) {
    const t = new Date(w.person_last_heartbeat).getTime();
    const age = (Date.now() - t) / 1000;
    if (age < 120) return { text: "在线", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" };
  }
  return { text: "离线", className: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400" };
}

export function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState<string>("");

  const load = () => {
    setLoading(true);
    Promise.all([
      getWorkers(deptFilter ? { dept: deptFilter } : undefined),
      getPersons(),
    ])
      .then(([w, r]) => {
        setWorkers(w);
        setPersons(r);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [deptFilter]);

  const byDept = DEPTS.map((d) => ({
    ...d,
    list: workers.filter((w) => w.dept_id === d.id),
  }));

  return (
    <div className="space-y-block">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h2 className="text-lg font-semibold text-foreground">Workers（派单对象）</h2>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">部门:</span>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="h-8 rounded border border-border bg-background px-3 text-sm outline-none caret-primary focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="">全部</option>
            {DEPTS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
          <Button variant="outline" size="sm" className="h-8 px-3" onClick={load}>
            刷新
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground py-4">加载中…</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            共 {workers.length} 个 Worker，{persons.length} 个 Person（执行器）
          </p>
          {byDept.map(({ id, label, list }) => (
            <Card key={id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{label}</CardTitle>
              </CardHeader>
              <CardContent>
                {list.length === 0 ? (
                  <p className="text-sm text-muted-foreground">暂无 Worker</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[320px] text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="py-3 text-left font-medium text-foreground">Worker / Agent</th>
                          <th className="py-3 text-left font-medium text-foreground">Person（执行器）</th>
                          <th className="py-3 text-left font-medium text-foreground">状态</th>
                          <th className="py-3 text-left font-medium text-foreground">当前 Job</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((w) => {
                          const badge = workerStatusBadge(w);
                          return (
                            <tr key={w.id} className="border-b border-border/60">
                              <td className="py-3">
                                <span className="font-medium text-foreground">{w.agent_name ?? w.agent_id}</span>
                                <span className="ml-1 text-xs text-muted-foreground">({w.id})</span>
                              </td>
                              <td className="py-3 text-muted-foreground">{w.person_name ?? w.person_id}</td>
                              <td className="py-3">
                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                                  {badge.text}
                                </span>
                              </td>
                              <td className="py-3 text-muted-foreground">
                                {w.current_job_id ? (
                                  <span className="truncate max-w-[120px] md:max-w-[200px] inline-block" title={w.current_job_id}>
                                    {w.current_job_id}
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
