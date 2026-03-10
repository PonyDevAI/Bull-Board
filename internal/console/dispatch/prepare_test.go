package dispatch

import (
	"database/sql"
	"path/filepath"
	"testing"
	"time"

	"github.com/PonyDevAI/Bull-Board/internal/common"
	"github.com/PonyDevAI/Bull-Board/internal/console/workflows"
)

func TestPrepareDispatchForStep(t *testing.T) {
	db := testDB(t)
	seedExecutionStack(t, db)
	seedWorker(t, db, "worker-planner", "planner")

	svc := workflows.NewService(db)
	tplID := seedWorkflowTemplate(t, db, "tpl-dispatch")
	runID, err := svc.CreateRunFromTask("task-dispatch", "default-workspace", tplID, workflows.NewDBWorkerResolver(db))
	if err != nil {
		t.Fatalf("create run: %v", err)
	}
	state, err := svc.GetWorkflowRunState(runID)
	if err != nil {
		t.Fatalf("get run state: %v", err)
	}
	stepID := state.StepRuns[0]["id"].(string)

	payload, err := PrepareDispatchForStep(db, stepID)
	if err != nil {
		t.Fatalf("prepare dispatch: %v", err)
	}
	if payload.WorkflowRunID != runID || payload.StepRunID != stepID || payload.TaskID != "task-dispatch" {
		t.Fatalf("unexpected identifiers in payload: %+v", payload)
	}
	if payload.Worker["id"] == "" || payload.Role["id"] == "" || payload.AgentApp["id"] == "" || payload.ExecutionBackend["id"] == "" {
		t.Fatalf("expected worker/role/app/backend in payload, got %+v", payload)
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

func seedWorkflowTemplate(t *testing.T, db *sql.DB, templateID string) string {
	t.Helper()
	now := time.Now().UTC().Format(time.RFC3339)
	if _, err := db.Exec(`INSERT INTO workflow_templates (id, workspace_id, name, description, config_json, created_at, updated_at) VALUES (?, 'default-workspace', 'Dispatch Workflow', '', '{}', ?, ?)`, templateID, now, now); err != nil {
		t.Fatalf("insert workflow template: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO workflow_step_templates (id, workflow_template_id, role_id, name, step_type, step_order, config_json, created_at) VALUES (?, ?, 'planner', 'Plan', 'analysis', 1, '{}', ?)`, templateID+"-step-1", templateID, now); err != nil {
		t.Fatalf("insert step 1: %v", err)
	}
	return templateID
}
