import { useRef } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { KanbanCard } from "./KanbanCard";
import type { KanbanColumn as ColumnType, KanbanCard as CardType, CardStatus } from "@/mocks/kanban";

export interface KanbanColumnProps {
  column: ColumnType;
  cards: CardType[];
  onDragStart: (cardId: string, columnId: CardStatus) => void;
  onDragEnd: () => void;
  onDropInColumn: (cardId: string, targetColumnId: CardStatus) => void;
  onCardClick: (card: CardType) => void;
  onAddCard: (columnId: CardStatus) => void;
}

export function KanbanColumn({
  column,
  cards,
  onDragStart,
  onDragEnd,
  onDropInColumn,
  onCardClick,
  onAddCard,
}: KanbanColumnProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const data = e.dataTransfer.getData("application/json") || e.dataTransfer.getData("text/plain");
      const { cardId } = JSON.parse(data);
      if (cardId) onDropInColumn(cardId, column.id);
    } catch {
      // ignore
    }
  };

  return (
    <div
      ref={ref}
      className="flex w-[280px] shrink-0 flex-col rounded-global border border-border bg-muted/30"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* 列头：标题 + 数量 badge */}
      <div className="flex items-center justify-between gap-2 border-b border-border bg-card px-3 py-2.5 rounded-t-global min-h-[44px]">
        <span className="text-sm font-medium text-foreground truncate">
          {column.title}
        </span>
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {cards.length}
        </span>
      </div>

      {/* 卡片列表 */}
      <div className="flex-1 space-y-2 overflow-y-auto p-2 min-h-[120px] overflow-x-hidden">
        {cards.map((card) => (
          <KanbanCard
            key={card.id}
            card={card}
            columnId={column.id}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDrop={onDropInColumn}
            onClick={() => onCardClick(card)}
          />
        ))}
      </div>

      {/* 列底：快速新建卡片（占位） */}
      <button
        type="button"
        onClick={() => onAddCard(column.id)}
        className="flex min-h-[44px] items-center justify-center gap-2 border-t border-border py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground rounded-b-global transition-colors"
      >
        <Plus className="h-4 w-4" />
        <span>添加卡片</span>
      </button>
    </div>
  );
}
