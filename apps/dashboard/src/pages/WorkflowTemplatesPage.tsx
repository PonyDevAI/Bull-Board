import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { createWorkflowTemplate, createWorkflowTemplateStep, getWorkflowTemplates, getWorkflowTemplateSteps, getWorkspaces, type WorkflowTemplate, type WorkflowStep, type Workspace } from "@/api";

export function WorkflowTemplatesPage() {
  const [items, setItems] = useState<WorkflowTemplate[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [name, setName] = useState("");
  const [workspaceID, setWorkspaceID] = useState("");

  const load = async () => {
    const data = await getWorkflowTemplates();
    setItems(data.items ?? []);
  };
  useEffect(() => { load(); getWorkspaces().then(setWorkspaces).catch(() => {}); }, []);
  useEffect(() => { if (selected) getWorkflowTemplateSteps(selected).then((d) => setSteps(d.items ?? [])); }, [selected]);

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-lg font-semibold">Workflow Templates</h1>
      <div className="rounded border p-3 space-y-2">
        <h2 className="font-medium">Create Template</h2>
        <div className="flex gap-2">
          <select value={workspaceID} onChange={(e) => setWorkspaceID(e.target.value)} className="rounded border px-2 py-1">
            <option value="">Workspace</option>
            {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name" className="rounded border px-2 py-1" />
          <Button size="sm" onClick={async () => { if (!workspaceID || !name) return; await createWorkflowTemplate({ workspace_id: workspaceID, name, config_json: "{}" }); setName(""); await load(); }}>Create</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded border p-3 space-y-2">
          <h2 className="font-medium">Templates</h2>
          {items.map((t) => (
            <button key={t.id} onClick={() => setSelected(t.id)} className={`w-full text-left rounded border p-2 ${selected === t.id ? "bg-slate-100" : ""}`}>
              <div className="font-medium">{t.name}</div>
              <div className="text-xs text-slate-500">{t.id}</div>
            </button>
          ))}
        </div>
        <div className="rounded border p-3 space-y-2">
          <h2 className="font-medium">Steps</h2>
          {selected && <Button size="sm" onClick={async () => { await createWorkflowTemplateStep(selected, { name: `Step ${steps.length + 1}`, step_type: "task", step_order: steps.length + 1, config_json: "{}" }); const d = await getWorkflowTemplateSteps(selected); setSteps(d.items ?? []); }}>Add Step</Button>}
          {steps.map((s) => (
            <div key={s.id} className="rounded border p-2 text-sm">
              #{s.step_order} {s.name} · {s.step_type} · role={s.role_id || "from config_json"}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
