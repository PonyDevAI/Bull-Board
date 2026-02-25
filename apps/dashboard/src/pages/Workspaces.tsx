import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getWorkspaces, createWorkspace, type Workspace } from "@/api";

export function Workspaces() {
  const [list, setList] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [name, setName] = useState("");
  const [repoPath, setRepoPath] = useState("");

  const load = () => getWorkspaces().then(setList).finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !repoPath.trim()) return;
    await createWorkspace({ name: name.trim(), repoPath: repoPath.trim() });
    setDialog(false);
    setName("");
    setRepoPath("");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:gap-1">
        <h1 className="text-lg font-semibold text-slate-800 md:text-xl">数据管理</h1>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 md:text-sm">Data Management</span>
          <Link to="/board">
            <Button variant="outline" size="sm" className="min-h-[44px] min-w-[44px]">任务控制中心</Button>
          </Link>
          <Button size="sm" className="min-h-[44px] min-w-[44px]" onClick={() => setDialog(true)}>新增 Workspace</Button>
        </div>
      </div>
      {loading ? (
        <p className="text-slate-500">加载中...</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {list.map((w) => (
            <Card key={w.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base truncate">{w.name}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600">
                <p className="break-all">{w.repoPath}</p>
                <Link to={"/board?workspace_id=" + w.id}>
                  <Button variant="outline" size="sm" className="mt-2 min-h-[44px] min-w-[44px]">
                    看板
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {dialog && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 md:items-center md:p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-auto md:max-h-none rounded-t-xl md:rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>新增 Workspace（计划）</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setDialog(false)}>
                关闭
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-3">
                <div>
                  <label className="text-sm font-medium">名称</label>
                  <input
                    className="mt-1 w-full rounded border px-2 py-1"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="my-repo"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">repo_path</label>
                  <input
                    className="mt-1 w-full rounded border px-2 py-1"
                    value={repoPath}
                    onChange={(e) => setRepoPath(e.target.value)}
                    placeholder="/path/to/repo"
                  />
                </div>
                <Button type="submit">创建</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
