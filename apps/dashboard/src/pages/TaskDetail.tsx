import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getTask,
  updateTaskStatus,
  artifactDownloadUrl,
  actionSubmit,
  actionReplan,
  actionRetry,
  actionContinueFix,
  type TaskDetail,
} from "@/api";
import { useSSE } from "@/useSSE";

const STATUSES = ["plan", "pending", "in_progress", "review", "testing", "done", "failed"] as const;

export function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"messages" | "runs" | "artifacts">("messages");

  const load = () => {
    if (!id) return;
    getTask(id).then(setTask).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  useSSE(() => load(), () => id && getTask(id).then(setTask));

  const handleStatus = async (status: string) => {
    if (!id) return;
    await updateTaskStatus(id, status);
    load();
  };

  if (!id) return null;
  if (loading || !task) {
    return <p className="p-4 text-slate-500 dark:text-slate-400">加载中...</p>;
  }

  const runs = task.runs ?? [];
  const messages = task.messages ?? [];
  const artifacts = runs.flatMap((r) => (r.artifacts ?? []).map((a) => ({ ...a, runId: r.id })));

  return (
    <div className="space-y-block">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-2">
        <Link to="/board">
          <Button variant="outline" size="sm" className="min-h-[44px] min-w-[44px]">← 看板</Button>
        </Link>
        <h2 className="text-base font-semibold break-words md:text-lg">{task.title}</h2>
        <span className="rounded bg-slate-200 px-2 py-1 text-sm w-fit dark:bg-slate-600 dark:text-slate-200">{task.status}</span>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">状态</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <Button
              key={s}
              variant={task.status === s ? "default" : "outline"}
              size="sm"
              className="min-h-[44px] min-w-[44px]"
              onClick={() => handleStatus(s)}
            >
              {s.replace("_", " ")}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex gap-2">
            {(["messages", "runs", "artifacts"] as const).map((t) => (
              <Button
                key={t}
                variant={tab === t ? "default" : "outline"}
                size="sm"
                onClick={() => setTab(t)}
              >
                {t === "messages" ? "对话" : t === "runs" ? "Runs" : "Artifacts"}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {tab === "messages" && (
            <div className="space-y-2">
              {messages.length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400">暂无消息</p>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className="rounded border bg-slate-50 p-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  >
                    <span className="font-medium text-slate-600 dark:text-slate-200">
                      [{m.roundType}#{m.roundNo}] {m.author}:
                    </span>{" "}
                    <span className="whitespace-pre-wrap">{m.content}</span>
                  </div>
                ))
              )}
            </div>
          )}
          {tab === "runs" && (
            <div className="space-y-2">
              {runs.length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400">暂无 runs</p>
              ) : (
                runs.map((r) => (
                  <div key={r.id} className="rounded border border-slate-200 p-2 text-sm dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
                    <p>
                      <span className="font-medium">{r.mode}</span> — {r.status}
                      {r.errorMessage && (
                        <span className="text-red-600 dark:text-red-400"> — {r.errorMessage}</span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {r.startedAt ?? ""} ~ {r.finishedAt ?? ""}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
          {tab === "artifacts" && (
            <div className="space-y-2">
              {artifacts.length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400">暂无 artifacts</p>
              ) : (
                artifacts.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 text-sm">
                    <span>{a.type}</span>
                    <a
                      href={artifactDownloadUrl(a.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 underline dark:text-blue-400"
                    >
                      {a.uri.split("/").pop()}
                    </a>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {(task.status === "done" || task.status === "failed") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {task.status === "done" && (
              <Button onClick={async () => { await actionSubmit(id!); load(); }}>
                Submit
              </Button>
            )}
            <Button variant="outline" onClick={async () => { await actionReplan(id!); load(); }}>
              Re-plan
            </Button>
            {task.status === "failed" && (
              <>
                <Button onClick={async () => { await actionRetry(id!); load(); }}>
                  Retry
                </Button>
                <Button variant="outline" onClick={async () => { await actionContinueFix(id!); load(); }}>
                  Continue Fix
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
