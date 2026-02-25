import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KanbanBoard } from "@/mocks/kanban";

export interface BoardTabsProps {
  boards: KanbanBoard[];
  activeId: string;
  onSelect: (id: string) => void;
  onNewBoard: () => void;
}

export function BoardTabs({
  boards,
  activeId,
  onSelect,
  onNewBoard,
}: BoardTabsProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
      <div className="flex shrink-0 gap-1 min-w-0">
        {boards.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => onSelect(b.id)}
            className={cn(
              "shrink-0 rounded-global-sm px-4 py-2 text-sm font-medium transition-colors min-h-[44px] md:min-h-0",
              activeId === b.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            )}
          >
            {b.name}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onNewBoard}
        className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-global-sm border border-dashed border-border text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="新建 Board"
        title="新建 Board（占位）"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
