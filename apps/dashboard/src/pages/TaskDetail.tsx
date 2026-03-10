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
  startStepRun,
  completeStepRun,
  failStepRun,
  getStepRunDispatchPreview,
  type TaskDetail,
} from "@/api";
import { useSSE } from "@/useSSE";

const STATUSES = ["plan", "pending", "in_progress", "review", "testing", "done", "failed"] as const;

export function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"messages" | "runs" | "artifacts">("messages");
  const [dispatchPreview, setDispatchPreview] = useState<Record<string, unknown> | null>(null);
  const [workflowErr, setWorkflowErr] = useState<string>("");

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

  const currentStep = task?.currentStep;

  const startCurrentStep = async () => {
    if (!currentStep?.id) return;
    setWorkflowErr("");
    await startStepRun(currentStep.id);
    load();
  };

  const completeCurrentStep = async () => {
    if (!currentStep?.id) return;
    setWorkflowErr("");
    await completeStepRun(currentStep.id, { completed_by: "operator", note: "step completed manually" });
    load();
  };

  const failCurrentStep = async () => {
    if (!currentStep?.id) return;
    setWorkflowErr("");
    await failStepRun(currentStep.id, { failed_by: "operator", reason: "step failed manually" });
    load();
  };

  const previewDispatch = async () => {
    if (!currentStep?.id) return;
    setWorkflowErr("");
    try {
      const data = await getStepRunDispatchPreview(currentStep.id);
      setDispatchPreview(data.item);
    } catch (e) {
      setDispatchPreview(null);
      setWorkflowErr(e instanceof Error ? e.message : "dispatch preview failed");
    }
  };

  if (!id) return null;
  if (loading || !task) {
    return <p className="p-4 text-slate-500 dark:text-slate-400">加载中…</p>;
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
          <CardTitle className="text-base">Workflow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!task.workflowRun ? (
            <p className="text-slate-500 dark:text-slate-400">未绑定 Workflow</p>
          ) : (
            <>
              <p className="text-sm">Run: <span className="font-medium">{task.workflowRun.id}</span> · {task.workflowRun.status}</p>
              {(task.stepRuns ?? []).map((sr) => {
                const isCurrent = task.currentStep?.id === sr.id;
                return (
                  <div key={sr.id} className={`rounded border p-2 text-sm dark:border-slate-600 ${isCurrent ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30" : ""}`}>
                    <div className="font-medium">#{sr.step_order ?? "-"} {sr.name ?? sr.id}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">status={sr.status} · worker={sr.worker_id || "unassigned"}</div>
                    {isCurrent && <div className="mt-1 text-xs text-blue-700 dark:text-blue-300">Current actionable step</div>}
                  </div>
                );
              })}
              {task.currentStep && <p className="text-xs text-blue-600 dark:text-blue-400">Current step: {task.currentStep.name ?? task.currentStep.id}</p>}

              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={startCurrentStep} disabled={!currentStep || currentStep.status !== "ready"}>Start Step</Button>
                <Button size="sm" variant="outline" onClick={completeCurrentStep} disabled={!currentStep || currentStep.status !== "running"}>Complete Step</Button>
                <Button size="sm" variant="outline" onClick={failCurrentStep} disabled={!currentStep || (currentStep.status !== "ready" && currentStep.status !== "running")}>Fail Step</Button>
                <Button size="sm" variant="outline" onClick={previewDispatch} disabled={!currentStep}>Preview Dispatch</Button>
              </div>
              {workflowErr && <p className="text-xs text-red-600 dark:text-red-400">{workflowErr}</p>}
              {dispatchPreview && (
                <div className="rounded border p-2 dark:border-slate-600">
                  <p className="mb-2 text-sm font-medium">Dispatch Preview</p>
                  <pre className="max-h-80 overflow-auto rounded bg-slate-100 p-2 text-xs dark:bg-slate-900">{JSON.stringify(dispatchPreview, null, 2)}</pre>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

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
                <p className="text-slate-500 dark:text-slate-400">暂无 Runs</p>
              ) : (
                runs.map((r) => (
                  <div key={r.id} className="rounded border border-slate-200 p-2 text-sm dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
                    <p>
                      <span className="font-medium">{r.mode}</span> — {r.status}
                      {r.errorMessage && (
                        <span className="text-red-600 dark:text-red-400"> — {r.errorMessage}</span>
                      )}
                    </p>
                    {r.assignedWorkerId && (
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        指派: <span className="font-medium">{r.assignedWorkerId}</span>
                      </p>
                    )}
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
