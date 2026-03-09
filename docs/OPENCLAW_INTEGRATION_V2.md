# OpenClaw Integration V2

## Integration role
OpenClaw is an external execution backend runtime.

## Adapter contract
- CreateSession
- ApplyAgentConfig
- ExecuteTask
- FetchArtifacts
- HandleExecutionResult

## Payload orientation
Dispatch payload must include worker, role, agent app, model profile, skills, plugins, and task metadata; OpenClaw performs runtime execution and returns results.

## Ownership split
- Bull-Board: orchestration/configuration/workflow state/source-of-truth
- OpenClaw: runtime execution/session/tool handling
