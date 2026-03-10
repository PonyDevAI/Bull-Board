package execution

import (
	"context"
	"database/sql"
	"path/filepath"
	"testing"
	"time"

	"github.com/PonyDevAI/Bull-Board/internal/common"
	"github.com/PonyDevAI/Bull-Board/internal/console/workflows"
)

func TestDispatchStepRunSuccessPersistsJobArtifactsAndAdvances(t *testing.T) {
	db := testDB(t)
	seedExecutionStack(t, db)
	seedWorker(t, db, "worker-exec", "planner")
	runID, stepID := seedWorkflowRun(t, db)

	svc := NewService(db)
	result, err := svc.DispatchStepRun(context.Background(), stepID)
	if err != nil {
		t.Fatalf("dispatch step run: %v", err)
	}
	if result.JobID == "" || result.ExecutionStatus != "succeeded" {
		t.Fatalf("unexpected dispatch result: %+v", result)
	}

	var stepStatus string
	if err := db.QueryRow(`SELECT status FROM step_runs WHERE id = ?`, stepID).Scan(&stepStatus); err != nil {
		t.Fatalf("read step status: %v", err)
	}
	if stepStatus != "completed" {
		t.Fatalf("expected step completed, got %s", stepStatus)
	}

	var workflowStatus string
	if err := db.QueryRow(`SELECT status FROM workflow_runs WHERE id = ?`, runID).Scan(&workflowStatus); err != nil {
		t.Fatalf("read workflow status: %v", err)
	}
	if workflowStatus != "completed" {
		t.Fatalf("expected workflow completed, got %s", workflowStatus)
	}

	var jobStatus, externalRef string
	if err := db.QueryRow(`SELECT status, COALESCE(external_job_ref, '') FROM jobs WHERE id = ?`, result.JobID).Scan(&jobStatus, &externalRef); err != nil {
		t.Fatalf("read job: %v", err)
	}
	if jobStatus != "succeeded" || externalRef == "" {
		t.Fatalf("expected succeeded job with external ref, got status=%s ref=%s", jobStatus, externalRef)
	}

	var artifactCount int
	if err := db.QueryRow(`SELECT COUNT(*) FROM artifacts WHERE job_id = ?`, result.JobID).Scan(&artifactCount); err != nil {
		t.Fatalf("read artifacts: %v", err)
	}
	if artifactCount == 0 {
		t.Fatalf("expected at least one artifact")
	}
}

func TestDispatchStepRunRequiresReadyState(t *testing.T) {
	db := testDB(t)
	seedExecutionStack(t, db)
	seedWorker(t, db, "worker-exec", "planner")
	_, stepID := seedWorkflowRun(t, db)
	if _, err := db.Exec(`UPDATE step_runs SET status='running' WHERE id = ?`, stepID); err != nil {
		t.Fatalf("update step status: %v", err)
	}

	svc := NewService(db)
	_, err := svc.DispatchStepRun(context.Background(), stepID)
	if err == nil {
		t.Fatalf("expected non-dispatchable error")
	}
}

func testDB(t *testing.T) *sql.DB {
	t.Helper()
	t.Setenv("SQLITE_PATH", filepath.Join(t.TempDir(), "bb.sqlite"))
	db, _, err := common.OpenDB("")
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	return db
}

func seedExecutionStack(t *testing.T, db *sql.DB) {
	t.Helper()
	now := time.Now().UTC().Format(time.RFC3339)
	if _, err := db.Exec(`INSERT INTO model_profiles (id, home_id, name, provider, model_name, created_at, updated_at) VALUES ('model-default','default','Default Model','openai','gpt-5.2',?,?)`, now, now); err != nil {
		t.Fatalf("insert model profile: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO agent_apps (id, home_id, name, default_model_profile_id, system_prompt, skill_policy_json, plugin_policy_json, tool_policy_json, created_at, updated_at) VALUES ('app-default','default','Default App','model-default','system','{}','{}','{}',?,?)`, now, now); err != nil {
		t.Fatalf("insert agent app: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO execution_backends (id, home_id, connector_code, name, type, endpoint_url, status, created_at, updated_at) VALUES ('backend-default','default','openclaw','OpenClaw Backend','openclaw','http://openclaw.local','online',?,?)`, now, now); err != nil {
		t.Fatalf("insert execution backend: %v", err)
	}
}

func seedWorker(t *testing.T, db *sql.DB, workerID, roleID string) {
	t.Helper()
	now := time.Now().UTC().Format(time.RFC3339)
	if _, err := db.Exec(`INSERT INTO workers (id, home_id, workspace_id, group_id, role_id, agent_app_id, execution_backend_id, name, status, max_concurrency, config_override_json, created_at, updated_at) VALUES (?, 'default', 'default-workspace', 'default-group', ?, 'app-default', 'backend-default', ?, 'active', 1, '{}', ?, ?)`, workerID, roleID, workerID, now, now); err != nil {
		t.Fatalf("insert worker: %v", err)
	}
}

func seedWorkflowRun(t *testing.T, db *sql.DB) (string, string) {
	t.Helper()
	now := time.Now().UTC().Format(time.RFC3339)
	if _, err := db.Exec(`INSERT INTO workflow_templates (id, workspace_id, name, description, config_json, created_at, updated_at) VALUES ('tpl-dispatch', 'default-workspace', 'Dispatch Workflow', '', '{}', ?, ?)`, now, now); err != nil {
		t.Fatalf("insert workflow template: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO workflow_step_templates (id, workflow_template_id, role_id, name, step_type, step_order, config_json, created_at) VALUES ('tpl-dispatch-step', 'tpl-dispatch', 'planner', 'Plan', 'analysis', 1, '{}', ?)`, now); err != nil {
		t.Fatalf("insert step template: %v", err)
	}
	svc := workflows.NewService(db)
	runID, err := svc.CreateRunFromTask("task-dispatch", "default-workspace", "tpl-dispatch", workflows.NewDBWorkerResolver(db))
	if err != nil {
		t.Fatalf("create run: %v", err)
	}
	state, err := svc.GetWorkflowRunState(runID)
	if err != nil {
		t.Fatalf("workflow state: %v", err)
	}
	return runID, state.StepRuns[0]["id"].(string)
}
