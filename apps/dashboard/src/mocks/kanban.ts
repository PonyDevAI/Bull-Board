/**
 * Kanban 看板 mock 数据：boards、columns、cards
 */

export type CardStatus =
  | "draft"
  | "review"
  | "ready"
  | "dev"
  | "testing"
  | "done";

export interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  status: CardStatus;
  priority?: "low" | "medium" | "high";
  assignee?: string;
  dueDate?: string;
  tags?: string[];
  createdAt: string;
}

export interface KanbanColumn {
  id: CardStatus;
  title: string;
  order: number;
  cardIds: string[];
}

export interface KanbanBoard {
  id: string;
  name: string;
  columns: KanbanColumn[];
  cards: Record<string, KanbanCard>;
}

const defaultCards: KanbanCard[] = [
  {
    id: "c1",
    title: "设计 API 规范",
    description: "定义 REST 接口与鉴权方式",
    status: "draft",
    priority: "high",
    assignee: "Alice",
    dueDate: "2025-03-01",
    tags: ["api", "doc"],
    createdAt: "2025-02-20T10:00:00Z",
  },
  {
    id: "c2",
    title: "实现任务队列",
    description: "Bull/BullMQ 集成与 worker",
    status: "review",
    priority: "high",
    assignee: "Bob",
    dueDate: "2025-03-05",
    tags: ["backend"],
    createdAt: "2025-02-21T09:00:00Z",
  },
  {
    id: "c3",
    title: "Dashboard 首页",
    description: "统计卡片与图表",
    status: "ready",
    priority: "medium",
    assignee: "Carol",
    tags: ["frontend"],
    createdAt: "2025-02-22T14:00:00Z",
  },
  {
    id: "c4",
    title: "Runner 健康检查",
    description: "心跳与离线告警",
    status: "dev",
    priority: "high",
    assignee: "Bob",
    dueDate: "2025-03-10",
    tags: ["runner"],
    createdAt: "2025-02-23T11:00:00Z",
  },
  {
    id: "c5",
    title: "E2E 测试套件",
    description: "Playwright 核心流程",
    status: "testing",
    priority: "medium",
    assignee: "Carol",
    tags: ["qa"],
    createdAt: "2025-02-24T08:00:00Z",
  },
  {
    id: "c6",
    title: "发布 v0.1.0",
    description: "打包与 release 流程",
    status: "done",
    priority: "high",
    assignee: "Alice",
    createdAt: "2025-02-18T16:00:00Z",
  },
];

const defaultColumnIds: CardStatus[] = [
  "draft",
  "review",
  "ready",
  "dev",
  "testing",
  "done",
];

const columnTitles: Record<CardStatus, string> = {
  draft: "Draft",
  review: "Review",
  ready: "Ready",
  dev: "Dev",
  testing: "Testing",
  done: "Done",
};

function buildBoard(
  id: string,
  name: string,
  cards: KanbanCard[],
  columnOrder: CardStatus[] = defaultColumnIds
): KanbanBoard {
  const cardsById: Record<string, KanbanCard> = {};
  const columnCardIds: Record<CardStatus, string[]> = {
    draft: [],
    review: [],
    ready: [],
    dev: [],
    testing: [],
    done: [],
  };
  cards.forEach((c) => {
    cardsById[c.id] = c;
    columnCardIds[c.status].push(c.id);
  });
  const columns: KanbanColumn[] = columnOrder.map((id, order) => ({
    id,
    title: columnTitles[id],
    order,
    cardIds: columnCardIds[id] ?? [],
  }));
  return { id, name, columns, cards: cardsById };
}

export const defaultKanbanBoard = buildBoard(
  "board-1",
  "Default Board",
  defaultCards
);

export const kanbanBoards: KanbanBoard[] = [
  defaultKanbanBoard,
  buildBoard("board-2", "Sprint 2025-03", [
    ...defaultCards.slice(0, 3).map((c) => ({ ...c, id: c.id + "-s2", status: "draft" as CardStatus })),
  ]),
  buildBoard("board-3", "Backlog", []),
];

export function getInitialBoard(): KanbanBoard {
  return JSON.parse(JSON.stringify(defaultKanbanBoard));
}
