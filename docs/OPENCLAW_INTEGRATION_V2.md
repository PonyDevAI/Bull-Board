# OpenClaw Integration V2

## Integration role
OpenClaw is an external execution backend runtime target. Bull-Board remains control plane and source-of-truth.

## Adapter contract
- CreateSession
- ApplyAgentConfig
- ExecuteTask
- FetchArtifacts
- HandleExecutionResult
- ExecutePreparedDispatch (minimal Bull-Board 2.0 StepRun loop)

## Canonical minimal StepRun dispatch loop
Bull-Board 2.0 executes a synchronous minimal loop today:

1. `POST /api/step-runs/:id/dispatch`
2. Validate `step_runs.status=ready` and assigned `worker_id`
3. Build dispatch payload via `PrepareDispatchForStep`
4. Resolve worker `execution_backend_id` and invoke OpenClaw adapter
5. Persist `jobs` row (`request_json`, `result_json`, `external_job_ref`, `status`)
6. Persist returned `artifacts`
7. Update canonical workflow state (`step_runs` / `workflow_runs`)

This is now real execution, not preview-only behavior.

## Source-of-truth boundaries
- Bull-Board canonical truth: `workflow_runs`, `step_runs`, `jobs`, `artifacts`
- OpenClaw: runtime execution/session/tool handling only

## Task domain relationship
- Task detail and task APIs should surface canonical execution state first (workflow run, step runs, jobs, artifacts).
- Any legacy task actions or legacy run/message projections are transitional compatibility behavior, not integration truth.

## Intentionally deferred
- Async runtime lifecycle management and background reconciliation
- Retry orchestration and failure policy engines
- Approval gates
- DAG/parallel execution controls
