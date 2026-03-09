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

## Product boundaries
- Bull-Board owns orchestration, configuration, and workflow truth.
- OpenClaw owns runtime execution/tool invocation/session execution.
