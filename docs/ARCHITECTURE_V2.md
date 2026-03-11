# Bull-Board 2.0 Architecture

## Logical diagram
Control Plane (Bull-Board Console)
- Org: homes/workspaces/groups/roles
- Agent System: agent apps, skills, plugins, model profiles
- Execution Layer: workers + execution backends + integrations
- Workflow Layer: templates, runs, step runs, boards projection
- Dispatch Layer: step-run dispatch orchestration + result ingestion

Runtime Plane
- OpenClaw runtime as external execution backend

## Canonical execution chain
Group → Role → Agent App → Worker → Execution Backend → Runtime(OpenClaw)

Task execution is consolidated to:
Task → WorkflowRun → StepRun → Dispatch → Job → Artifact → Workflow state update

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
Resource APIs under `/api/*` expose control plane data. Dispatch APIs execute step-runs through execution backend adapters.

## Invariants
- Person model does not exist.
- Board is projection only.
- Canonical execution truth lives in `workflow_runs`, `step_runs`, `jobs`, `artifacts`.
- Bull-Board is system-of-record; OpenClaw is never source-of-truth.

## Deferred orchestration scope
The following remain intentionally out of scope in this consolidation pass:
- async runtime lifecycle management
- retry orchestration
- approvals
- DAG/parallel/distributed orchestration

## Schema/bootstrap invariants
- `db/schema_v2.sql` is the canonical source for Bull-Board 2.0 org/workforce/workflow tables.
- Go bootstrap may only define minimal system tables (`settings`, `users`, `sessions`, `api_keys`) and temporary legacy runtime tables (`legacy_tasks`, `legacy_runs`, `legacy_artifacts`, `legacy_messages`, `legacy_jobs`).
- `workspaces` canonical columns are: `id`, `home_id`, `name`, `created_at`, `updated_at`. Runtime checkout fields are isolated in `workspace_runtime_configs`.
