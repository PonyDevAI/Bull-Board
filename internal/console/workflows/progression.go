package workflows

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"
)

var (
	ErrStepRunNotFound       = errors.New("step run not found")
	ErrInvalidStepTransition = errors.New("invalid step status transition")
)

type stepRunRow struct {
	ID          string
	WorkflowRun string
	Status      string
}

func (s *Service) StartStep(stepRunID string) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	sr, err := loadStepRun(tx, stepRunID)
	if err != nil {
		return err
	}
	if sr.Status != "ready" {
		return fmt.Errorf("%w: start requires ready status", ErrInvalidStepTransition)
	}
	now := time.Now().UTC().Format(time.RFC3339)
	if _, err := tx.Exec(`UPDATE step_runs SET status='running', started_at=?, updated_at=? WHERE id=?`, now, now, stepRunID); err != nil {
		return err
	}
	if _, err := tx.Exec(`UPDATE workflow_runs SET status='running', started_at=COALESCE(started_at, ?), updated_at=? WHERE id=?`, now, now, sr.WorkflowRun); err != nil {
		return err
	}
	return tx.Commit()
}

func (s *Service) CompleteStep(stepRunID string, output any) error {
	outputJSON, err := marshalJSONOrEmpty(output)
	if err != nil {
		return err
	}
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	sr, err := loadStepRun(tx, stepRunID)
	if err != nil {
		return err
	}
	if sr.Status != "running" {
		return fmt.Errorf("%w: complete requires running status", ErrInvalidStepTransition)
	}
	now := time.Now().UTC().Format(time.RFC3339)
	if _, err := tx.Exec(`UPDATE step_runs SET status='completed', output_json=?, finished_at=?, updated_at=? WHERE id=?`, outputJSON, now, now, stepRunID); err != nil {
		return err
	}
	if err := s.advanceWorkflowTx(tx, sr.WorkflowRun, now); err != nil {
		return err
	}
	return tx.Commit()
}

func (s *Service) FailStep(stepRunID string, errorInfo any) error {
	errorJSON, err := marshalJSONOrEmpty(errorInfo)
	if err != nil {
		return err
	}
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	sr, err := loadStepRun(tx, stepRunID)
	if err != nil {
		return err
	}
	if sr.Status != "ready" && sr.Status != "running" {
		return fmt.Errorf("%w: fail requires ready or running status", ErrInvalidStepTransition)
	}
	now := time.Now().UTC().Format(time.RFC3339)
	if _, err := tx.Exec(`UPDATE step_runs SET status='failed', output_json=?, finished_at=?, updated_at=? WHERE id=?`, errorJSON, now, now, stepRunID); err != nil {
		return err
	}
	if _, err := tx.Exec(`UPDATE workflow_runs SET status='failed', finished_at=?, updated_at=? WHERE id=?`, now, now, sr.WorkflowRun); err != nil {
		return err
	}
	return tx.Commit()
}

func (s *Service) AdvanceWorkflow(workflowRunID string) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	now := time.Now().UTC().Format(time.RFC3339)
	if err := s.advanceWorkflowTx(tx, workflowRunID, now); err != nil {
		return err
	}
	return tx.Commit()
}

func (s *Service) advanceWorkflowTx(tx *sql.Tx, workflowRunID, now string) error {
	var workspaceID string
	if err := tx.QueryRow(`SELECT workspace_id FROM workflow_runs WHERE id=?`, workflowRunID).Scan(&workspaceID); err != nil {
		return err
	}
	rows, err := tx.Query(`
		SELECT sr.id, sr.status, COALESCE(wst.role_id,''), COALESCE(wst.step_order,0), sr.created_at
		FROM step_runs sr
		LEFT JOIN workflow_step_templates wst ON wst.id = sr.workflow_step_template_id
		WHERE sr.workflow_run_id = ?
		ORDER BY wst.step_order ASC, sr.created_at ASC`, workflowRunID)
	if err != nil {
		return err
	}
	defer rows.Close()

	type stepState struct{ id, status, roleID string }
	var steps []stepState
	for rows.Next() {
		var st stepState
		var order int
		var created string
		if err := rows.Scan(&st.id, &st.status, &st.roleID, &order, &created); err != nil {
			return err
		}
		steps = append(steps, st)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	if len(steps) == 0 {
		_, err := tx.Exec(`UPDATE workflow_runs SET status='completed', finished_at=?, updated_at=? WHERE id=?`, now, now, workflowRunID)
		return err
	}
	allCompleted := true
	for _, st := range steps {
		if st.status == "failed" {
			_, err := tx.Exec(`UPDATE workflow_runs SET status='failed', finished_at=?, updated_at=? WHERE id=?`, now, now, workflowRunID)
			return err
		}
		if st.status != "completed" {
			allCompleted = false
		}
	}
	if allCompleted {
		_, err := tx.Exec(`UPDATE workflow_runs SET status='completed', finished_at=?, updated_at=? WHERE id=?`, now, now, workflowRunID)
		return err
	}

	for _, st := range steps {
		if st.status == "running" || st.status == "ready" {
			_, err := tx.Exec(`UPDATE workflow_runs SET status='running', started_at=COALESCE(started_at, ?), finished_at=NULL, updated_at=? WHERE id=?`, now, now, workflowRunID)
			return err
		}
		if st.status == "pending" || st.status == "pending_unassigned" {
			workerID := ""
			if st.roleID != "" {
				workerID, err = NewDBWorkerResolver(s.db).Resolve(workspaceID, st.roleID)
				if err != nil {
					return err
				}
			}
			nextStatus := "pending_unassigned"
			if workerID != "" {
				nextStatus = "ready"
			}
			if _, err := tx.Exec(`UPDATE step_runs SET worker_id=NULLIF(?, ''), status=?, updated_at=? WHERE id=?`, workerID, nextStatus, now, st.id); err != nil {
				return err
			}
			_, err = tx.Exec(`UPDATE workflow_runs SET status='running', started_at=COALESCE(started_at, ?), finished_at=NULL, updated_at=? WHERE id=?`, now, now, workflowRunID)
			return err
		}
	}
	_, err = tx.Exec(`UPDATE workflow_runs SET status='running', started_at=COALESCE(started_at, ?), finished_at=NULL, updated_at=? WHERE id=?`, now, now, workflowRunID)
	return err
}

func loadStepRun(tx *sql.Tx, stepRunID string) (stepRunRow, error) {
	out := stepRunRow{}
	err := tx.QueryRow(`SELECT id, workflow_run_id, status FROM step_runs WHERE id=?`, stepRunID).Scan(&out.ID, &out.WorkflowRun, &out.Status)
	if err == sql.ErrNoRows {
		return out, ErrStepRunNotFound
	}
	return out, err
}

func marshalJSONOrEmpty(v any) (string, error) {
	if v == nil {
		return "{}", nil
	}
	b, err := json.Marshal(v)
	if err != nil {
		return "", err
	}
	if string(b) == "null" {
		return "{}", nil
	}
	return string(b), nil
}
