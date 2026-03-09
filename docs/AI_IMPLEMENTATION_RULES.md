# Bull-Board 2.0 AI Implementation Rules

This file is the unified governance baseline for Cursor, Codex, and Claude Code.

## Canonical architecture (only valid model)
Group → Role → Agent App → Worker → Execution Backend → Runtime(OpenClaw)

## Global rules
1. Legacy Person model is fully removed and prohibited.
2. OpenClaw is only an Execution Backend runtime target.
3. Worker is the assignable virtual employee.
4. Agent App is the reusable AI configuration template.
5. Bull-Board is control plane and system-of-record.
6. OpenClaw is external runtime, never source of truth.
7. Documentation updates are required before implementation.
8. Any schema/API refactor must preserve 2.0 canonical model.
9. No compatibility layer for legacy Person architecture.
10. Backend stack remains Go + SQLite + bb CLI + install.sh.
11. Frontend stack remains React + Vite + TypeScript + TailwindCSS.
12. Board is only a view; truth is WorkflowRun / StepRun.
13. Model config governance is centralized and dispatched.
14. All generated code/docs/APIs use Bull-Board 2.0 naming.
15. Remove conflicting outdated instructions.

## Dispatch model
Resolve Worker → Resolve Agent App → Resolve Model Profile → Merge configuration → Resolve Execution Backend → Execute via adapter → Update step/job/artifact state.

## Anti-patterns (forbidden)
- `/api/person`, `/api/person/pull`, `/api/person/report`, `/api/persons/register`, `/api/persons/heartbeat`
- `internal/person`
- `cmd/bb-person`
- any pull-worker runtime protocol as control-plane core
