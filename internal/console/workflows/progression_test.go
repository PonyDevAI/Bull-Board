package workflows

import (
	"database/sql"
	"path/filepath"
	"testing"
	"time"

	"github.com/PonyDevAI/Bull-Board/internal/common"
)

func TestWorkflowProgressionHappyPath(t *testing.T) {
	db := testDB(t)
	seedExecutionStack(t, db)
	seedWorker(t, db, "worker-planner", "planner")
	seedWorker(t, db, "worker-coder", "coder")

	svc := NewService(db)
	runID, err := svc.CreateRunFromTask("task-1", "default-workspace", seedWorkflowTemplate(t, db, "tpl-happy"), NewDBWorkerResolver(db))
	if err != nil {
		t.Fatalf("create run: %v", err)
	}

	state, err := svc.GetWorkflowRunState(runID)
	if err != nil {
		t.Fatalf("load state: %v", err)
	}
	if state.Status != "running" {
		t.Fatalf("expected running after first actionable step, got %s", state.Status)
	}
	if len(state.StepRuns) != 2 {
		t.Fatalf("expected 2 steps, got %d", len(state.StepRuns))
	}
	step1 := state.StepRuns[0]["id"].(string)
	step2 := state.StepRuns[1]["id"].(string)

	if err := svc.StartStep(step1); err != nil {
		t.Fatalf("start step1: %v", err)
	}
	if err := svc.CompleteStep(step1, map[string]any{"ok": true}); err != nil {
		t.Fatalf("complete step1: %v", err)
	}

	assertStepStatus(t, db, step1, "completed")
	assertStepStatus(t, db, step2, "ready")
	assertWorkflowStatus(t, db, runID, "running")

	if err := svc.StartStep(step2); err != nil {
		t.Fatalf("start step2: %v", err)
	}
	if err := svc.CompleteStep(step2, map[string]any{"ok": true}); err != nil {
		t.Fatalf("complete step2: %v", err)
	}

	assertWorkflowStatus(t, db, runID, "completed")
}

func TestWorkflowProgressionPendingUnassignedThenResolve(t *testing.T) {
	db := testDB(t)
	seedExecutionStack(t, db)
	seedWorker(t, db, "worker-planner", "planner")

	svc := NewService(db)
	runID, err := svc.CreateRunFromTask("task-2", "default-workspace", seedWorkflowTemplate(t, db, "tpl-unassigned"), NewDBWorkerResolver(db))
	if err != nil {
		t.Fatalf("create run: %v", err)
	}
	state, err := svc.GetWorkflowRunState(runID)
	if err != nil {
		t.Fatalf("load state: %v", err)
	}
	step1 := state.StepRuns[0]["id"].(string)
	step2 := state.StepRuns[1]["id"].(string)

	if err := svc.StartStep(step1); err != nil {
		t.Fatalf("start step1: %v", err)
	}
	if err := svc.CompleteStep(step1, map[string]any{"ok": true}); err != nil {
		t.Fatalf("complete step1: %v", err)
	}

	assertStepStatus(t, db, step2, "pending_unassigned")

	seedWorker(t, db, "worker-coder", "coder")
	if err := svc.AdvanceWorkflow(runID); err != nil {
		t.Fatalf("advance workflow: %v", err)
	}

	assertStepStatus(t, db, step2, "ready")
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

func seedWorkflowTemplate(t *testing.T, db *sql.DB, templateID string) string {
	t.Helper()
	now := time.Now().UTC().Format(time.RFC3339)
	if _, err := db.Exec(`INSERT INTO workflow_templates (id, workspace_id, name, description, config_json, created_at, updated_at) VALUES (?, 'default-workspace', 'Test Workflow', '', '{}', ?, ?)`, templateID, now, now); err != nil {
		t.Fatalf("insert workflow template: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO workflow_step_templates (id, workflow_template_id, role_id, name, step_type, step_order, config_json, created_at) VALUES (?, ?, 'planner', 'Plan', 'analysis', 1, '{}', ?)`, templateID+"-step-1", templateID, now); err != nil {
		t.Fatalf("insert step 1: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO workflow_step_templates (id, workflow_template_id, role_id, name, step_type, step_order, config_json, created_at) VALUES (?, ?, 'coder', 'Build', 'implementation', 2, '{}', ?)`, templateID+"-step-2", templateID, now); err != nil {
		t.Fatalf("insert step 2: %v", err)
	}
	return templateID
}

func assertStepStatus(t *testing.T, db *sql.DB, stepRunID, want string) {
	t.Helper()
	var got string
	if err := db.QueryRow(`SELECT status FROM step_runs WHERE id = ?`, stepRunID).Scan(&got); err != nil {
		t.Fatalf("query step status: %v", err)
	}
	if got != want {
		t.Fatalf("step %s status got %s want %s", stepRunID, got, want)
	}
}

func assertWorkflowStatus(t *testing.T, db *sql.DB, runID, want string) {
	t.Helper()
	var got string
	if err := db.QueryRow(`SELECT status FROM workflow_runs WHERE id = ?`, runID).Scan(&got); err != nil {
		t.Fatalf("query workflow status: %v", err)
	}
	if got != want {
		t.Fatalf("workflow %s status got %s want %s", runID, got, want)
	}
}
