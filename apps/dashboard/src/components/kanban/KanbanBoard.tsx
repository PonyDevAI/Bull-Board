import { useCallback, useState } from "react";
import { KanbanColumn } from "./KanbanColumn";
import { CardDetailDrawer } from "./CardDetailDrawer";
import type { KanbanBoard as BoardType, KanbanCard as CardType, CardStatus } from "@/mocks/kanban";

export interface KanbanBoardProps {
  board: BoardType;
  onBoardChange: (board: BoardType) => void;
}

export function KanbanBoard({ board, onBoardChange }: KanbanBoardProps) {
  const [detailCard, setDetailCard] = useState<CardType | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const moveCard = useCallback(
    (cardId: string, toColumnId: CardStatus) => {
      const card = board.cards[cardId];
      if (!card) return;
      const fromColumnId = card.status;
      if (fromColumnId === toColumnId) return;
      const next = { ...board, cards: { ...board.cards } };
      const fromCol = next.columns.find((c) => c.id === fromColumnId);
      const toCol = next.columns.find((c) => c.id === toColumnId);
      if (!fromCol || !toCol) return;
      fromCol.cardIds = fromCol.cardIds.filter((id) => id !== cardId);
      toCol.cardIds = [...toCol.cardIds, cardId];
      const cardCopy = next.cards[cardId];
      if (cardCopy) cardCopy.status = toColumnId;
      onBoardChange(next);
    },
    [board, onBoardChange]
  );

  const onCardClick = useCallback((card: CardType) => {
    setDetailCard(card);
    setDrawerOpen(true);
  }, []);

  const onAddCardPlaceholder = useCallback((columnId: CardStatus) => {
    // 占位：可后续接新建卡片弹窗
    console.log("Add card to column (placeholder)", columnId);
  }, []);

  return (
    <>
      <div className="flex gap-gap overflow-x-auto pb-page -mx-page px-page md:mx-0 md:px-0 snap-x snap-mandatory md:snap-none">
        {board.columns.map((col) => {
          const cards = col.cardIds
            .map((id) => board.cards[id])
            .filter(Boolean) as CardType[];
          return (
            <div key={col.id} className="snap-start shrink-0">
              <KanbanColumn
                column={col}
                cards={cards}
                onDragStart={() => {}}
                onDragEnd={() => {}}
                onDropInColumn={moveCard}
                onCardClick={onCardClick}
                onAddCard={onAddCardPlaceholder}
              />
            </div>
          );
        })}
      </div>

      <CardDetailDrawer
        card={detailCard}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setDetailCard(null);
        }}
      />
    </>
  );
}
