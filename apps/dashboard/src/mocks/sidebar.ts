/**
 * Sidebar 导航与 Workspace 占位数据
 */

export interface NavItem {
  to: string;
  label: string;
  icon: string; // lucide icon name
  badge?: string; // e.g. "Pending" | "Failed" | count
  badgeVariant?: "default" | "success" | "warning" | "destructive";
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export interface WorkspaceOption {
  id: string;
  name: string;
  slug?: string;
}

/** 宝塔侧栏菜单：Dashboard / Kanban / Tasks / Runs | Runners / Workspaces / Artifacts | Models / Roles & Routing / Policies | Logs / Audit / Alerts | Settings */
export const sidebarNavGroups: NavGroup[] = [
  {
    items: [
      { to: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
      { to: "/kanban", label: "Kanban", icon: "LayoutGrid", badge: "3", badgeVariant: "default" },
      { to: "/dashboard/tasks", label: "Tasks", icon: "ListTodo", badge: "Pending", badgeVariant: "warning" },
      { to: "/dashboard/runs", label: "Runs", icon: "Play", badge: "12", badgeVariant: "default" },
    ],
  },
  {
    items: [
      { to: "/dashboard/runners", label: "Runners", icon: "Cpu", badge: "2", badgeVariant: "success" },
      { to: "/dashboard/workspaces", label: "Workspaces", icon: "FolderOpen" },
      { to: "/dashboard/artifacts", label: "Artifacts", icon: "Package" },
    ],
  },
  {
    items: [
      { to: "/dashboard/models", label: "Models", icon: "Bot" },
      { to: "/dashboard/roles", label: "Roles & Routing", icon: "Route" },
      { to: "/dashboard/policies", label: "Policies", icon: "Shield" },
    ],
  },
  {
    items: [
      { to: "/dashboard/logs", label: "Logs", icon: "FileText" },
      { to: "/dashboard/audit", label: "Audit", icon: "ClipboardList", badge: "Failed", badgeVariant: "destructive" },
      { to: "/dashboard/alerts", label: "Alerts", icon: "Bell", badge: "2", badgeVariant: "warning" },
    ],
  },
  {
    items: [
      { to: "/dashboard/settings", label: "Settings", icon: "Settings" },
    ],
  },
];

export const workspaceOptions: WorkspaceOption[] = [
  { id: "ws-1", name: "Default Workspace", slug: "default" },
  { id: "ws-2", name: "Staging", slug: "staging" },
  { id: "ws-3", name: "Production", slug: "prod" },
];
