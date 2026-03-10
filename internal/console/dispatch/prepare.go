package dispatch

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/PonyDevAI/Bull-Board/internal/console/models"
)

var ErrStepRunWorkerMissing = errors.New("step run has no assigned worker")

type PreparedDispatchRequest struct {
	WorkflowRunID    string         `json:"workflow_run_id"`
	StepRunID        string         `json:"step_run_id"`
	TaskID           string         `json:"task_id"`
	Worker           map[string]any `json:"worker"`
	Role             map[string]any `json:"role"`
	AgentApp         map[string]any `json:"agent_app"`
	ExecutionBackend map[string]any `json:"execution_backend"`
	ResolvedConfig   any            `json:"resolved_config"`
	Input            any            `json:"input"`
}

func PrepareDispatchForStep(db *sql.DB, stepRunID string) (PreparedDispatchRequest, error) {
	var out PreparedDispatchRequest
	var workerID, inputJSON string
	err := db.QueryRow(`
		SELECT sr.id, sr.workflow_run_id, COALESCE(wr.task_id,''), COALESCE(sr.worker_id,''), COALESCE(sr.input_json,'{}')
		FROM step_runs sr
		JOIN workflow_runs wr ON wr.id = sr.workflow_run_id
		WHERE sr.id = ?`, stepRunID).
		Scan(&out.StepRunID, &out.WorkflowRunID, &out.TaskID, &workerID, &inputJSON)
	if err != nil {
		return out, err
	}
	if workerID == "" {
		return out, ErrStepRunWorkerMissing
	}

	var name, status, workspaceID, groupID, roleID, agentAppID, executionBackendID, configOverride string
	var maxConcurrency int
	if err := db.QueryRow(`SELECT name, status, workspace_id, group_id, role_id, agent_app_id, execution_backend_id, max_concurrency, config_override_json FROM workers WHERE id = ?`, workerID).
		Scan(&name, &status, &workspaceID, &groupID, &roleID, &agentAppID, &executionBackendID, &maxConcurrency, &configOverride); err != nil {
		return out, err
	}
	out.Worker = map[string]any{
		"id":                   workerID,
		"name":                 name,
		"status":               status,
		"workspace_id":         workspaceID,
		"group_id":             groupID,
		"role_id":              roleID,
		"agent_app_id":         agentAppID,
		"execution_backend_id": executionBackendID,
		"max_concurrency":      maxConcurrency,
		"config_override_json": configOverride,
	}

	cfg, err := models.ResolveWorkerConfig(db, workerID)
	if err != nil {
		return out, fmt.Errorf("resolve worker config: %w", err)
	}
	out.ResolvedConfig = cfg
	out.Role = asMap(cfg.Role)
	out.AgentApp = asMap(cfg.AgentApp)
	out.ExecutionBackend = asMap(cfg.ExecutionBackend)

	var input any
	if err := json.Unmarshal([]byte(inputJSON), &input); err != nil {
		input = map[string]any{}
	}
	out.Input = input
	return out, nil
}

func asMap(v any) map[string]any {
	if m, ok := v.(map[string]string); ok {
		out := map[string]any{}
		for k, value := range m {
			out[k] = value
		}
		return out
	}
	if m, ok := v.(map[string]any); ok {
		return m
	}
	return map[string]any{}
}
