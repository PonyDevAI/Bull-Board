import { useEffect, useState } from "react";
import type { WorkforceResource } from "@/api";

type Props = {
  title: string;
  fields: string[];
  list: () => Promise<WorkforceResource[]>;
  create: (body: Record<string, any>) => Promise<WorkforceResource>;
};

export function WorkforceResourcePage({ title, fields, list, create }: Props) {
  const [items, setItems] = useState<WorkforceResource[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    list().then(setItems).catch(() => setItems([]));
  }, [list]);

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="grid gap-2 md:grid-cols-3">
        {fields.map((f) => (
          <input key={f} className="rounded border px-3 py-2" placeholder={f} value={form[f] ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, [f]: e.target.value }))} />
        ))}
      </div>
      <button
        className="rounded bg-blue-600 px-4 py-2 text-white"
        onClick={async () => {
          await create(form);
          setForm({});
          setItems(await list());
        }}
      >
        Create
      </button>
      <div className="rounded border">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>{["id", ...fields].map((h) => <th key={h} className="border-b px-2 py-1 text-left">{h}</th>)}</tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>{["id", ...fields].map((h) => <td key={h} className="border-b px-2 py-1">{String(item[h] ?? "")}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
