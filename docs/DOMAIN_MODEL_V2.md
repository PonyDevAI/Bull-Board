# Bull-Board 2.0 Domain Model

## Organizational hierarchy
- Home: top-level tenant boundary.
- Workspace: project/business boundary inside a home.
- Group: organizational team unit.
- Role: functional role inside a group.

## Agent and execution entities
- Agent App: reusable AI behavior/config template.
- Worker: virtual employee bound to Role + Agent App + Execution Backend.
- Execution Backend: executable runtime target and connector configuration.
- Integration Instance: credentialed connector endpoint instance.
- Model Profile: centrally governed model/provider setup.

## Workflow entities
- WorkflowTemplate / WorkflowStepTemplate: reusable process blueprint.
- WorkflowRun / StepRun: runtime execution truth.
- Task: work item tracked in workflow context.
- Board: view/projection over tasks/runs.
- Job / Artifact: execution output and produced assets.
