# Workflow System V2

## Scope (Minimal Workflow Engine)
This phase only covers Task → WorkflowTemplate → WorkflowRun → StepRun initialization and visibility.

## Design principles
- Template-driven orchestration.
- Runtime truth in WorkflowRun and StepRun.
- Deterministic worker resolution by `(workspace_id, role_id)`.
- Board is projection-only and never source-of-truth.

## Minimal lifecycle
1. Task is created with optional `workflow_template_id`.
2. System creates one `workflow_run` for the task.
3. System creates ordered `step_runs` from `workflow_step_templates.step_order`.
4. For each step, role is resolved from `workflow_step_templates.role_id` or `config_json.role_id`.
5. Worker resolver picks first active worker by `created_at ASC` in same workspace+role.

## Statuses
### workflow_runs.status
- `pending`: run created, not yet started.
- `running`: at least one step is actionable.
- `completed`: all steps completed.
- `failed`: run terminated by failure.

### step_runs.status
- `pending`: created but not yet actionable.
- `pending_unassigned`: no matching active worker resolved.
- `ready`: current actionable step with assigned worker.
- `running`: step execution started.
- `completed`: step execution finished successfully.
- `failed`: step failed.

## Deferred to later phases
- OpenClaw dispatch execution pipeline.
- DAG/parallel branch scheduling.
- Approval engines and policy gates.
- Load balancing and advanced worker scheduling.
