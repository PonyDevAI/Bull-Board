import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getTasks, createTask, getWorkspaces, type Task, type Workspace } from "@/api";
import { useSSE } from "@/useSSE";

const COLS = ["plan", "pending", "in_progress", "review", "testing", "done", "failed"] as const;

export function Board() {
  const [params] = useSearchParams();
  const workspaceId = params.get("workspace_id") ?? "";
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskWs, setNewTaskWs] = useState("");

  const load = () => {
    const q: { workspace_id?: string } = {};
    if (workspaceId) q.workspace_id = workspaceId;
    getTasks(q).then(setTasks).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [workspaceId]);

  useEffect(() => {
    getWorkspaces().then(setWorkspaces);
  }, []);

  useSSE(() => load(), () => load());

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskWs || !newTaskTitle.trim()) return;
    await createTask({ workspaceId: newTaskWs, title: newTaskTitle.trim() });
    setNewTaskOpen(false);
    setNewTaskTitle("");
    setNewTaskWs(workspaceId || "");
    load();
  };

  const byStatus = (status: string) => tasks.filter((t) => t.status === status);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link to="/workspaces">
          <Button variant="outline">Workspaces</Button>
        </Link>
        <h2 className="text-lg font-semibold">看板</h2>
        <Button onClick={() => setNewTaskOpen(true)}>新建 Task</Button>
      </div>
      {newTaskOpen && (
        <Card className="p-4">
          <form onSubmit={handleCreateTask} className="space-y-2">
            <select
              className="w-full rounded border px-2 py-1"
              value={newTaskWs}
              onChange={(e) => setNewTaskWs(e.target.value)}
              required
            >
              <option value="">选择 Workspace</option>
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
            <input
              className="w-full rounded border px-2 py-1"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Task 标题"
              required
            />
            <div className="flex gap-2">
              <Button type="submit">创建</Button>
              <Button type="button" variant="outline" onClick={() => setNewTaskOpen(false)}>取消</Button>
            </div>
          </form>
        </Card>
      )}
      {loading ? (
        <p className="text-slate-500">加载中...</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLS.map((status) => (
            <div key={status} className="min-w-[200px] rounded-lg border bg-slate-50/50 p-2">
              <h3 className="mb-2 text-sm font-medium capitalize text-slate-600">
                {status.replace("_", " ")}
              </h3>
              <div className="space-y-2">
                {byStatus(status).map((t) => (
                  <Link to={"/tasks/" + t.id}>
                  <Card key={t.id} className="cursor-pointer transition hover:shadow">
                    <CardContent className="p-3">
                      <p className="font-medium text-slate-800">{t.title}</p>
                      <p className="text-xs text-slate-500">{t.workspaceName ?? t.workspaceId}</p>
                    </CardContent>
                  </Card>
                </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
