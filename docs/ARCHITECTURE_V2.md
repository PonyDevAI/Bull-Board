# Bull-Board 2.0 Architecture

## Logical diagram
Control Plane (Bull-Board Console)
- Org: homes/workspaces/groups/roles
- Agent System: agent apps, skills, plugins, model profiles
- Execution Layer: workers + execution backends + integrations
- Workflow Layer: templates, runs, step runs, boards projection
- Dispatch Layer: runtime call orchestration + result ingestion

Runtime Plane
- OpenClaw runtime as external execution backend

## Backend module map
- internal/console/org
- internal/console/roles
- internal/console/agent_apps
- internal/console/workers
- internal/console/execution_backends
- internal/console/integrations
- internal/console/workflows
- internal/console/dispatch
- internal/console/models

## API boundary
Resource APIs under `/api/*` expose control plane data. Dispatch API issues runtime execution requests through backend adapters.

## Invariants
- Person model does not exist.
- Board is projection only.
- WorkflowRun/StepRun are source of workflow truth.


## Schema/bootstrap invariants
- `db/schema_v2.sql` is the canonical source for Bull-Board 2.0 org/workforce/workflow tables.
- Go bootstrap may only define minimal system tables (`settings`, `users`, `sessions`, `api_keys`) and temporary legacy runtime tables (`legacy_tasks`, `legacy_runs`, `legacy_artifacts`, `legacy_messages`, `legacy_jobs`).
- `workspaces` canonical columns are: `id`, `home_id`, `name`, `created_at`, `updated_at`. Runtime checkout fields are isolated in `workspace_runtime_configs`.
