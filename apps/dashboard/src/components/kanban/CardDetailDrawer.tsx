import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KanbanCard } from "@/mocks/kanban";

export interface CardDetailDrawerProps {
  card: KanbanCard | null;
  open: boolean;
  onClose: () => void;
}

export function CardDetailDrawer({ card, open, onClose }: CardDetailDrawerProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 md:bg-transparent"
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="卡片详情"
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-full max-w-md border-l border-border bg-card shadow-card flex flex-col",
          "animate-in slide-in-from-right duration-200"
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold text-foreground">卡片详情</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-global-sm p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="关闭"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {card ? (
            <>
              <div>
                <label className="text-xs font-medium text-muted-foreground">标题</label>
                <p className="mt-1 text-sm font-medium text-foreground">{card.title}</p>
              </div>
              {card.description && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">描述</label>
                  <p className="mt-1 text-sm text-foreground">{card.description}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                  状态: {card.status}
                </span>
                {card.priority && (
                  <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                    优先级: {card.priority}
                  </span>
                )}
                {card.assignee && (
                  <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                    负责人: {card.assignee}
                  </span>
                )}
              </div>
              {card.dueDate && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">截止日期</label>
                  <p className="mt-1 text-sm text-foreground">{card.dueDate}</p>
                </div>
              )}
              {card.tags && card.tags.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">标签</label>
                  <p className="mt-1 text-sm text-foreground">{card.tags.join(", ")}</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">（以上为 mock 数据，未接后端）</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">未选择卡片</p>
          )}
        </div>
      </aside>
    </>
  );
}
