# Workflow System V2

## Design principles
- Template-driven orchestration.
- Runtime truth in WorkflowRun and StepRun.
- Deterministic dispatch inputs derived from canonical entities.

## Execution path
1. Task enters a workflow template.
2. WorkflowRun and StepRun records are created.
3. Dispatch resolves worker, agent app, model profile, and execution backend.
4. Backend adapter executes runtime task.
5. StepRun/job/artifact state is updated from execution results.

## Board semantics
Board columns and cards are derived projections and never authoritative state.
