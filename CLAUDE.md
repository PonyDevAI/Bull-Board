# CLAUDE Implementation Contract — Bull-Board 2.0

Bull-Board 2.0 is a control plane, not a person-runner system.

## Single valid architecture
Group → Role → Agent App → Worker → Execution Backend → Runtime(OpenClaw)

## Must enforce
1. Remove and prohibit legacy Person architecture.
2. OpenClaw integration must be execution-backend adapter based.
3. Worker is assignable virtual employee.
4. Agent App is reusable AI config template.
5. Bull-Board Console stores canonical workflow/configuration truth.
6. OpenClaw returns execution results only.
7. Documentation-first changes are mandatory.
8. Model governance is centralized in Bull-Board.
9. Board is view-only over workflow/task projections.
10. No compatibility implementation for Person-era code.

## Required routes/modules orientation
- `/api/homes`, `/api/workspaces`, `/api/groups`, `/api/roles`, `/api/model-profiles`, `/api/integrations`, `/api/agent-apps`, `/api/execution-backends`, `/api/workers`, `/api/workflow-templates`, `/api/tasks`, `/api/workflow-runs`, `/api/step-runs`, `/api/dispatch`
- `internal/console/{org,roles,agent_apps,workers,execution_backends,integrations,workflows,dispatch,models}`
- `internal/integrations/openclaw`
