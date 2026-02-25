import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getTasks, createTask, getWorkspaces, type Task, type Workspace } from "@/api";
import { useSSE } from "@/useSSE";

const COLUMNS = [
  { key: "pending", label: "待处理", labelEn: "Pending", statuses: ["plan", "pending"], dotColor: "bg-orange-500" },
  { key: "in_progress", label: "进行中", labelEn: "In Progress", statuses: ["in_progress", "review", "testing"], dotColor: "bg-blue-500" },
  { key: "done", label: "已完成", labelEn: "Completed", statuses: ["done"], dotColor: "bg-emerald-500" },
  { key: "failed", label: "失败", labelEn: "Failed", statuses: ["failed"], dotColor: "bg-red-500" },
] as const;

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
    getTasks(q)
      .then((data) => setTasks(Array.isArray(data) ? data : []))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [workspaceId]);

  useEffect(() => {
    getWorkspaces()
      .then((data) => setWorkspaces(Array.isArray(data) ? data : []))
      .catch(() => setWorkspaces([]));
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

  const tasksForColumn = (statuses: readonly string[]) =>
    (tasks ?? []).filter((t) => statuses.includes(t.status));

  return (
    <div className="space-y-4">
      {/* 主标题 + 副标题 */}
      <div>
        <h1 className="text-lg font-bold text-slate-800 md:text-xl">任务控制中心 (Task Center)</h1>
        <p className="mt-0.5 text-xs text-slate-500 md:text-sm">实时监控与管理任务队列</p>
      </div>

      {/* 绿色子栏：移动端纵向堆叠，桌面端横排 */}
      <div className="flex flex-col gap-3 rounded-lg bg-emerald-600 px-4 py-3 text-white md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 min-h-[44px]">
          <span className="text-lg">🎮</span>
          <span className="text-sm font-medium truncate">任务控制中心 (Mission Control)</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <span className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-medium flex items-center gap-1 min-h-[44px] md:min-h-0">
            <span>⚙</span>
            运行中 (Running)
          </span>
          <Button
            size="sm"
            className="min-h-[44px] min-w-[44px] bg-white text-emerald-700 hover:bg-emerald-50 md:min-h-0 md:min-w-0"
          >
            <span className="mr-1">▶</span>
            整体开始 (Start All)
          </Button>
          <Button
            size="sm"
            className="min-h-[44px] min-w-[44px] bg-red-500 text-white hover:bg-red-600 md:min-h-0 md:min-w-0"
          >
            <span className="mr-1">■</span>
            整体停止 (Stop All)
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="min-h-[44px] min-w-[44px] border-white/30 bg-white/20 text-white hover:bg-white/30 md:min-h-0 md:min-w-0 md:ml-2"
            onClick={() => setNewTaskOpen(true)}
          >
            新增计划
          </Button>
        </div>
      </div>

      {/* 新建 Task 弹层：移动端全宽 */}
      {newTaskOpen && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm w-full max-w-md">
          <form onSubmit={handleCreateTask} className="space-y-3">
            <select
              className="w-full min-h-[44px] rounded border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              value={newTaskWs}
              onChange={(e) => setNewTaskWs(e.target.value)}
              required
            >
              <option value="">选择 Workspace</option>
              {(workspaces ?? []).map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
            <input
              className="w-full min-h-[44px] rounded border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Task 标题"
              required
            />
            <div className="flex gap-2">
              <Button type="submit" size="sm" className="min-h-[44px] min-w-[44px]">创建</Button>
              <Button type="button" variant="outline" size="sm" className="min-h-[44px] min-w-[44px]" onClick={() => setNewTaskOpen(false)}>取消</Button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p className="text-slate-500">加载中...</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory md:snap-none">
          {COLUMNS.map((col) => {
            const colTasks = tasksForColumn(col.statuses);
            return (
              <div
                key={col.key}
                className="flex min-w-[260px] max-w-[260px] md:min-w-[280px] md:max-w-none flex-col shrink-0 snap-start rounded-lg border border-slate-200 bg-slate-50/50"
              >
                {/* 列头：色点 + 标题 + 数量 */}
                <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-2.5 min-h-[44px]">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${col.dotColor}`} />
                  <span className="text-sm font-medium text-slate-700 truncate">
                    {col.label} ({col.labelEn})
                  </span>
                  <span className="ml-auto text-sm font-medium text-slate-600">{colTasks.length}</span>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto p-2 min-h-[120px] overflow-x-hidden">
                  {colTasks.length === 0 && col.key === "failed" ? (
                    <p className="py-6 text-center text-sm text-slate-400">无任务</p>
                  ) : (
                    colTasks.map((t) => (
                      <div
                        key={t.id}
                        className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow min-h-[44px]"
                      >
                        <Link to={"/tasks/" + t.id} className="block">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-medium text-slate-500">Step {(t.planRound || 0) + (t.fixRound || 0)}</span>
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600 truncate max-w-[100px] md:max-w-none">
                              {t.workspaceName ?? "task"}
                            </span>
                          </div>
                          <p className="mt-1.5 line-clamp-2 text-sm font-semibold text-slate-800">{t.title}</p>
                          <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                            {t.description || t.title}
                          </p>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-xs text-slate-400">Step {(t.planRound || 0) + (t.fixRound || 0)}</span>
                            <div className="flex items-center gap-1">
                              <span className="rounded p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-blue-500 hover:bg-blue-50 cursor-pointer md:p-1 md:min-h-0 md:min-w-0" title="详情">ℹ</span>
                              <button type="button" className="rounded p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-red-500 hover:bg-red-50 md:p-1 md:min-h-0 md:min-w-0" title="停止" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                                ✕
                              </button>
                            </div>
                          </div>
                        </Link>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
