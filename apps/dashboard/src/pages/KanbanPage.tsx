import { useState, useCallback } from "react";
import { Filter, ArrowUpDown, LayoutGrid } from "lucide-react";
import { BoardTabs } from "@/components/kanban/BoardTabs";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import {
  kanbanBoards,
  type KanbanBoard as BoardType,
} from "@/mocks/kanban";

export function KanbanPage() {
  const [boards] = useState<BoardType[]>(() =>
    kanbanBoards.map((b) => JSON.parse(JSON.stringify(b)))
  );
  const [activeBoardId, setActiveBoardId] = useState(boards[0]?.id ?? "board-1");
  const [boardState, setBoardState] = useState<Record<string, BoardType>>(() => {
    const m: Record<string, BoardType> = {};
    boards.forEach((b) => {
      m[b.id] = b;
    });
    return m;
  });

  const activeBoard = boardState[activeBoardId] ?? boards[0];

  const handleBoardChange = useCallback((next: BoardType) => {
    setBoardState((prev) => ({ ...prev, [next.id]: next }));
  }, []);

  const handleNewBoard = useCallback(() => {
    // 占位：新建 board
    console.log("New board (placeholder)");
  }, []);

  return (
    <div className="space-y-block">
      <BoardTabs
        boards={Object.values(boardState)}
        activeId={activeBoardId}
        onSelect={setActiveBoardId}
        onNewBoard={handleNewBoard}
      />

      {/* Filter / Sort / Card Config 按钮（占位） */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="flex min-h-[44px] items-center gap-2 rounded-global-sm border border-border bg-card px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          title="Filter（占位）"
        >
          <Filter className="h-4 w-4" />
          <span>Filter</span>
        </button>
        <button
          type="button"
          className="flex min-h-[44px] items-center gap-2 rounded-global-sm border border-border bg-card px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          title="Sort（占位）"
        >
          <ArrowUpDown className="h-4 w-4" />
          <span>Sort</span>
        </button>
        <button
          type="button"
          className="flex min-h-[44px] items-center gap-2 rounded-global-sm border border-border bg-card px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          title="Card Config（占位）"
        >
          <LayoutGrid className="h-4 w-4" />
          <span>Card Config</span>
        </button>
      </div>

      {/* Columns + 拖拽 + 列头数量 badge + 列底 “+” 快速新建 */}
      {activeBoard && (
        <KanbanBoard board={activeBoard} onBoardChange={handleBoardChange} />
      )}
    </div>
  );
}
