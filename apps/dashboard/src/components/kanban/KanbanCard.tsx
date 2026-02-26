import { useRef } from "react";
import { Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KanbanCard as KanbanCardType, CardStatus } from "@/mocks/kanban";

const priorityStyles = {
  high: "border-l-emerald-500 bg-emerald-50/50 dark:border-l-emerald-500 dark:bg-emerald-500/10",
  medium: "border-l-amber-500 bg-amber-50/30 dark:border-l-amber-500 dark:bg-amber-500/10",
  low: "border-l-slate-300 bg-slate-50/50 dark:border-l-slate-500 dark:bg-slate-500/10",
} as const;

const priorityBadge = {
  high: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400",
  low: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400",
} as const;

export interface KanbanCardProps {
  card: KanbanCardType;
  columnId: CardStatus;
  onDragStart: (cardId: string, columnId: CardStatus) => void;
  onDragEnd: () => void;
  onDrop: (cardId: string, targetColumnId: CardStatus) => void;
  onClick: () => void;
}

export function KanbanCard({
  card,
  columnId,
  onDragStart,
  onDragEnd,
  onDrop,
  onClick,
}: KanbanCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({ cardId: card.id, columnId }));
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/json", JSON.stringify({ cardId: card.id, columnId }));
    onDragStart(card.id, columnId);
  };

  const handleDragEnd = () => onDragEnd();

  const priority = card.priority ?? "medium";
  const priorityKey = priority in priorityStyles ? priority : "medium";

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const data = e.dataTransfer.getData("application/json") || e.dataTransfer.getData("text/plain");
      const { cardId } = JSON.parse(data);
      if (cardId) onDrop(cardId, columnId);
    } catch {
      // ignore
    }
  };

  return (
    <div
      ref={ref}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={onClick}
      className={cn(
        "group relative min-h-[72px] cursor-grab rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all active:cursor-grabbing hover:shadow-md dark:border-slate-700 dark:bg-slate-800/80 dark:hover:shadow-lg",
        "border-l-4",
        priorityStyles[priorityKey],
        "touch-none"
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", priorityBadge[priorityKey])}>
          {priority === "high" ? "高" : priority === "low" ? "低" : "中"}
        </span>
        {card.tags && card.tags.length > 0 && (
          <div className="flex flex-wrap justify-end gap-1">
            {card.tags.slice(0, 2).map((t) => (
              <span key={t} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
      <p className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100">
        {card.title}
      </p>
      {card.description && (
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {card.description}
        </p>
      )}
      <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-2 dark:border-slate-700">
        {card.assignee && (
          <span className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
            <User className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{card.assignee}</span>
          </span>
        )}
        {card.dueDate && (
          <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-500">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            {card.dueDate}
          </span>
        )}
      </div>
    </div>
  );
}
