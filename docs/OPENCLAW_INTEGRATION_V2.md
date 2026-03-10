# OpenClaw Integration V2

## Integration role
OpenClaw is an external execution backend runtime.

## Adapter contract
- CreateSession
- ApplyAgentConfig
- ExecuteTask
- FetchArtifacts
- HandleExecutionResult
- ExecutePreparedDispatch (minimal Bull-Board 2.0 step-run execution loop)

## Minimal StepRun dispatch loop (phase)
Bull-Board 2.0 now supports a minimal end-to-end dispatch execution path driven by canonical workflow state:

1. `POST /api/step-runs/:id/dispatch`
2. Console validates `step_runs.status=ready` and `worker_id` is present.
3. Console builds canonical dispatch payload via `PrepareDispatchForStep`.
4. Console resolves the assigned worker's `execution_backend_id` and invokes OpenClaw adapter.
5. Console persists a `jobs` row (`request_json`, `result_json`, `external_job_ref`, `status`).
6. Console persists any returned execution artifacts into `artifacts`.
7. Console updates canonical workflow state:
   - success: `step_runs` -> completed, `workflow_runs` advances
   - failure: `step_runs` -> failed, `workflow_runs` -> failed

This phase is intentionally synchronous/minimal. Advanced async orchestration, retries, approvals, and DAG/runtime controls are deferred.

## Payload orientation
Dispatch payload must include worker, role, agent app, model profile, skills, plugins, and task metadata; OpenClaw performs runtime execution and returns results.

## Ownership split
- Bull-Board: orchestration/configuration/workflow state/source-of-truth
- OpenClaw: runtime execution/session/tool handling
