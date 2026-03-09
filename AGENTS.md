# Bull-Board 2.0 Agent Rules (Canonical)

Bull-Board 2.0 is an **AI Work OS Control Plane**. This repository must implement only the 2.0 architecture:

**Group → Role → Agent App → Worker → Execution Backend → Runtime(OpenClaw)**

## Mandatory architecture constraints
1. Legacy Person-based architecture is removed and must never be reintroduced.
2. OpenClaw is only an Execution Backend runtime target, never a Person.
3. Worker is the assignable virtual employee.
4. Agent App is the reusable AI agent configuration template.
5. Bull-Board is the Control Plane and system-of-record.
6. OpenClaw is an external runtime, not source of truth.
7. Docs must be updated before implementation.
8. Schema/API/architecture changes must preserve the canonical 2.0 model.
9. No compatibility layer for Person-era schemas, APIs, or runtime.
10. Backend stack is Go + SQLite + bb CLI + install.sh deployment.
11. Frontend stack is React + Vite + TypeScript + TailwindCSS.
12. Board is view-only; truth comes from WorkflowRun / StepRun.
13. Model configuration is centrally governed and dispatched to execution backends.
14. Generated code/docs/APIs must align with Bull-Board 2.0 naming.
15. Remove instructions/content that conflict with Bull-Board 2.0.

## Implementation policy
- Prefer explicit domain modules under `internal/console/*` for org, roles, agent apps, workers, execution backends, integrations, workflows, dispatch, and models.
- Route shape should use `/api/*` resources aligned to 2.0 nouns.
- Remove `/api/person*` and person runtime flows.
- Avoid introducing migration bridges from legacy Person structures.
