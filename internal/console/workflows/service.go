package workflows

import (
	"database/sql"
	"encoding/json"
	"errors"
	"time"

	"github.com/PonyDevAI/Bull-Board/internal/common"
)

type Service struct{ db *sql.DB }

func NewService(db *sql.DB) *Service { return &Service{db: db} }

type WorkerResolver interface {
	Resolve(workspaceID, roleID string) (string, error)
}

type DBWorkerResolver struct{ db *sql.DB }

func NewDBWorkerResolver(db *sql.DB) *DBWorkerResolver { return &DBWorkerResolver{db: db} }

func (r *DBWorkerResolver) Resolve(workspaceID, roleID string) (string, error) {
	if roleID == "" {
		return "", nil
	}
	var id string
	err := r.db.QueryRow(`SELECT id FROM workers WHERE workspace_id = ? AND role_id = ? AND status = 'active' ORDER BY created_at ASC LIMIT 1`, workspaceID, roleID).Scan(&id)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return id, err
}

type StepTemplate struct {
	ID                 string `json:"id"`
	WorkflowTemplateID string `json:"workflow_template_id"`
	RoleID             string `json:"role_id"`
	Name               string `json:"name"`
	StepType           string `json:"step_type"`
	StepOrder          int    `json:"step_order"`
	ConfigJSON         string `json:"config_json"`
}

type WorkflowRunState struct {
	ID                 string           `json:"id"`
	WorkspaceID        string           `json:"workspace_id"`
	WorkflowTemplateID string           `json:"workflow_template_id"`
	TaskID             string           `json:"task_id"`
	Status             string           `json:"status"`
	CreatedAt          string           `json:"created_at"`
	UpdatedAt          string           `json:"updated_at"`
	StepRuns           []map[string]any `json:"step_runs"`
}

func (s *Service) CreateRunFromTask(taskID, workspaceID, workflowTemplateID string, resolver WorkerResolver) (string, error) {
	if workflowTemplateID == "" {
		return "", errors.New("workflow template required")
	}
	now := time.Now().UTC().Format(time.RFC3339)
	runID := common.UUID()
	tx, err := s.db.Begin()
	if err != nil {
		return "", err
	}
	defer tx.Rollback()
	if _, err = tx.Exec(`INSERT INTO workflow_runs (id, workspace_id, workflow_template_id, task_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'pending', ?, ?)`, runID, workspaceID, workflowTemplateID, taskID, now, now); err != nil {
		return "", err
	}
	rows, err := tx.Query(`SELECT id, role_id, config_json FROM workflow_step_templates WHERE workflow_template_id = ? ORDER BY step_order ASC, created_at ASC`, workflowTemplateID)
	if err != nil {
		return "", err
	}
	defer rows.Close()
	idx := 0
	for rows.Next() {
		var stepID string
		var roleID sql.NullString
		var cfg string
		if err := rows.Scan(&stepID, &roleID, &cfg); err != nil {
			return "", err
		}
		resolvedRole := roleID.String
		if resolvedRole == "" {
			var c map[string]any
			_ = json.Unmarshal([]byte(cfg), &c)
			if r, ok := c["role_id"].(string); ok {
				resolvedRole = r
			}
		}
		workerID := ""
		if resolver != nil {
			workerID, err = resolver.Resolve(workspaceID, resolvedRole)
			if err != nil {
				return "", err
			}
		}
		status := "pending_unassigned"
		if workerID != "" {
			if idx == 0 {
				status = "ready"
			} else {
				status = "pending"
			}
		}
		if idx == 0 && workerID == "" {
			status = "pending_unassigned"
		}
		_, err = tx.Exec(`INSERT INTO step_runs (id, workflow_run_id, workflow_step_template_id, worker_id, status, input_json, output_json, created_at, updated_at) VALUES (?, ?, ?, NULLIF(?, ''), ?, '{}', '{}', ?, ?)`, common.UUID(), runID, stepID, workerID, status, now, now)
		if err != nil {
			return "", err
		}
		idx++
	}
	if idx > 0 {
		_, err = tx.Exec(`UPDATE workflow_runs SET status = 'running', updated_at = ? WHERE id = ?`, now, runID)
		if err != nil {
			return "", err
		}
	}
	if err := tx.Commit(); err != nil {
		return "", err
	}
	return runID, nil
}

func (s *Service) GetWorkflowRunState(runID string) (WorkflowRunState, error) {
	var out WorkflowRunState
	if err := s.db.QueryRow(`SELECT id, workspace_id, workflow_template_id, COALESCE(task_id,''), status, created_at, updated_at FROM workflow_runs WHERE id = ?`, runID).
		Scan(&out.ID, &out.WorkspaceID, &out.WorkflowTemplateID, &out.TaskID, &out.Status, &out.CreatedAt, &out.UpdatedAt); err != nil {
		return out, err
	}
	rows, err := s.db.Query(`SELECT sr.id, sr.workflow_step_template_id, sr.worker_id, sr.status, sr.created_at, wst.name, wst.step_order FROM step_runs sr LEFT JOIN workflow_step_templates wst ON sr.workflow_step_template_id = wst.id WHERE sr.workflow_run_id = ? ORDER BY wst.step_order ASC, sr.created_at ASC`, runID)
	if err != nil {
		return out, err
	}
	defer rows.Close()
	for rows.Next() {
		var id, tplID, status, createdAt string
		var workerID sql.NullString
		var stepName sql.NullString
		var order sql.NullInt64
		if err := rows.Scan(&id, &tplID, &workerID, &status, &createdAt, &stepName, &order); err != nil {
			return out, err
		}
		m := map[string]any{"id": id, "workflow_step_template_id": tplID, "status": status, "created_at": createdAt, "worker_id": ""}
		if workerID.Valid {
			m["worker_id"] = workerID.String
		}
		if stepName.Valid {
			m["name"] = stepName.String
		}
		if order.Valid {
			m["step_order"] = order.Int64
		}
		out.StepRuns = append(out.StepRuns, m)
	}
	return out, nil
}

func (s *Service) GetWorkflowRunStateForTask(taskID string) (WorkflowRunState, error) {
	var runID string
	if err := s.db.QueryRow(`SELECT id FROM workflow_runs WHERE task_id = ? ORDER BY created_at DESC LIMIT 1`, taskID).Scan(&runID); err != nil {
		return WorkflowRunState{}, err
	}
	return s.GetWorkflowRunState(runID)
}
