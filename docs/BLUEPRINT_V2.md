# Bull-Board 2.0 Blueprint

## Product goal
Bull-Board 2.0 is an AI Work OS control plane for managing workspace structure, worker fleet, execution backends, workflow orchestration, and model governance.

## Core capabilities
- Home/workspace administration
- Group/role organizational modeling
- Agent App catalog and policy definitions
- Worker lifecycle and assignment management
- Execution backend registry and health management
- Workflow template authoring and runtime orchestration
- Integration and connector management
- Dispatch pipeline to external runtime (OpenClaw)
- Artifact/job observability

## Canonical model
Group → Role → Agent App → Worker → Execution Backend → Runtime(OpenClaw)

Canonical execution chain:
Task → WorkflowRun → StepRun → Dispatch → Job → Artifact → Workflow state update

## Task canonicalization status (Phases 1-5)
- Primary execution truth is now centered on `workflow_runs`, `step_runs`, `jobs`, `artifacts`.
- Task detail/read APIs should treat canonical workflow execution entities as first-class.
- Task list/detail status now resolves from latest `workflow_runs.status` when available, with legacy task status exposed only as transitional metadata.
- Task detail canonical read model exposes `workflow_run`, `step_runs`, `jobs`, and `artifacts` as primary entities.
- Legacy sections are nested under explicit secondary structures for controlled deprecation.
- Legacy task actions (`submit`, `re-plan`, `retry`, `continue-fix`) remain only as transitional behavior and must be visually/API-labeled as secondary.
- Legacy task/run/message/job tables remain temporary compatibility storage and are not the target architecture.

## Product boundaries
- Bull-Board owns orchestration, configuration, and workflow truth.
- OpenClaw owns runtime execution/tool invocation/session execution.
