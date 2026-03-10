# Workflow System V2

## Scope (Workflow progression + dispatch preparation)
This phase covers Task → WorkflowTemplate → WorkflowRun → StepRun initialization, progression status transitions, and dispatch request preparation.

## Design principles
- Template-driven orchestration.
- Runtime truth in WorkflowRun and StepRun.
- Deterministic worker resolution by `(workspace_id, role_id)`.
- Board is projection-only and never source-of-truth.
- Dispatch preview is payload preparation only (no runtime execution in this phase).

## Lifecycle
1. Task is created with optional `workflow_template_id`.
2. System creates one `workflow_run` for the task.
3. System creates ordered `step_runs` from `workflow_step_templates.step_order`.
4. For each step, role is resolved from `workflow_step_templates.role_id` or `config_json.role_id`.
5. Worker resolver picks first active worker by `created_at ASC` in same workspace+role.
6. Workflow progression APIs move step runs through start/complete/fail transitions.
7. On completion, the next ordered step is activated and worker is resolved again.
8. Dispatch preview returns canonical payload from current step state.

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

## Dispatch preview contract
`GET /api/step-runs/:id/dispatch-preview` returns a canonical payload:
- `workflow_run_id`
- `step_run_id`
- `task_id`
- `worker`
- `role`
- `agent_app`
- `execution_backend`
- `resolved_config`
- `input`

## Deferred to later phases
- OpenClaw runtime execution invocation.
- Job lifecycle management for external runtime states.
- DAG/parallel branch scheduling.
- Approval engines and policy gates.
- Retry orchestration policies.
