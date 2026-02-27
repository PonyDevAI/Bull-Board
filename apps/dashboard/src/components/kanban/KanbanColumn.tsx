import { useRef } from "react";
import { Plus } from "lucide-react";
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
      className="flex w-[300px] shrink-0 flex-col rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/50"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* 列头：标题 + 数量 badge（宝塔风格） */}
      <div className="flex items-center justify-between gap-2 rounded-t-xl border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800/80">
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          {column.title}
        </span>
        <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-emerald-100 px-2 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400">
          {cards.length}
        </span>
      </div>

      {/* 卡片列表 */}
      <div className="flex-1 space-y-3 overflow-y-auto overflow-x-hidden p-3 min-h-[160px]">
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

      {/* 列底：添加卡片（宝塔风格） */}
      <button
        type="button"
        onClick={() => onAddCard(column.id)}
        className="flex min-h-[44px] items-center justify-center gap-2 rounded-b-xl border-t border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-white hover:text-emerald-600 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-emerald-400"
      >
        <Plus className="h-4 w-4 shrink-0" />
        <span>添加卡片</span>
      </button>
    </div>
  );
}
