import { useRef } from "react";
import { cn } from "@/lib/utils";
import type { KanbanCard as KanbanCardType, CardStatus } from "@/mocks/kanban";

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

  const handleDragEnd = () => {
    onDragEnd();
  };

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
        "rounded-global border border-border bg-card p-3 shadow-card cursor-grab active:cursor-grabbing",
        "min-h-[44px] transition-shadow hover:shadow-md",
        "touch-none"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground truncate">
          {card.priority ?? "—"}
        </span>
        {card.assignee && (
          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            {card.assignee}
          </span>
        )}
      </div>
      <p className="mt-1 line-clamp-2 text-sm font-medium text-foreground">
        {card.title}
      </p>
      {card.description && (
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
          {card.description}
        </p>
      )}
    </div>
  );
}
