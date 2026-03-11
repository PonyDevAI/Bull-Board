# Workflow System V2

## Scope (canonical workflow progression + dispatch execution)
This phase consolidates Task → WorkflowRun → StepRun → Dispatch → Job → Artifact as the primary Bull-Board 2.0 execution path.

## Design principles
- Template-driven orchestration.
- Canonical runtime truth in `workflow_runs`, `step_runs`, `jobs`, and `artifacts`.
- Deterministic worker resolution by `(workspace_id, role_id)`.
- Board is projection-only and never source-of-truth.
- Dispatch is real step execution (not preview-only).

## Canonical minimal execution loop
1. Task is created with optional `workflow_template_id`.
2. System creates one `workflow_run` for the task.
3. System creates ordered `step_runs` from `workflow_step_templates.step_order`.
4. Current StepRun is resolved to a worker by role.
5. `PrepareDispatchForStep` builds canonical dispatch payload from StepRun context.
6. `POST /api/step-runs/:id/dispatch` invokes OpenClaw via execution backend adapter.
7. Console persists `jobs` result state and any returned `artifacts`.
8. Console advances workflow state:
   - success: step completed and next step activated (or workflow completed)
   - failure: step failed and workflow failed

## Statuses
### workflow_runs.status
- `pending`: run created, no actionable step yet.
- `running`: at least one step is actionable/running.
- `completed`: all steps completed.
- `failed`: run terminated by step failure.

### step_runs.status
- `pending`: created but not yet actionable.
- `pending_unassigned`: no matching active worker resolved.
- `ready`: current actionable step with assigned worker.
- `running`: step execution started.
- `completed`: step execution finished successfully.
- `failed`: step failed.

## Progression rules
- Start is only valid from `ready`.
- Complete is only valid from `running`.
- Fail is valid from `ready` and `running`.
- Completing a step advances to next ordered step:
  - `ready` when an active worker resolves.
  - `pending_unassigned` when no active worker resolves.
- When all steps are completed, workflow run becomes `completed`.
- Any failed step marks workflow run `failed`.

## Dispatch payload contract
`GET /api/step-runs/:id/dispatch-preview` and dispatch preparation return canonical context:
- `workflow_run_id`
- `step_run_id`
- `task_id`
- `worker`
- `role`
- `agent_app`
- `execution_backend`
- `resolved_config`
- `input`

## Intentionally deferred
- Async runtime lifecycle management and polling workers.
- Retry orchestration policies.
- Approval engines and policy gates.
- DAG/parallel branch scheduling.
