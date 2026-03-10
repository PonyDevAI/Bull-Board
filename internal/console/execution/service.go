package execution

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/PonyDevAI/Bull-Board/internal/common"
	"github.com/PonyDevAI/Bull-Board/internal/console/dispatch"
	"github.com/PonyDevAI/Bull-Board/internal/console/workflows"
	"github.com/PonyDevAI/Bull-Board/internal/integrations/openclaw"
)

var ErrStepNotDispatchable = errors.New("step run is not dispatchable")

type DispatchResult struct {
	StepRunID       string                 `json:"step_run_id"`
	JobID           string                 `json:"job_id"`
	JobStatus       string                 `json:"job_status"`
	ExternalJobRef  string                 `json:"external_job_ref,omitempty"`
	ExecutionStatus string                 `json:"execution_status"`
	Output          any                    `json:"output,omitempty"`
	Response        map[string]any         `json:"response,omitempty"`
	Artifacts       []openclaw.JobArtifact `json:"artifacts,omitempty"`
}

type Service struct {
	db      *sql.DB
	adapter *openclaw.Adapter
}

func NewService(db *sql.DB) *Service {
	return &Service{db: db, adapter: openclaw.NewAdapter()}
}

func (s *Service) DispatchStepRun(ctx context.Context, stepRunID string) (DispatchResult, error) {
	out := DispatchResult{StepRunID: stepRunID}
	wf := workflows.NewService(s.db)

	if err := ensureDispatchable(s.db, stepRunID); err != nil {
		return out, err
	}
	if err := wf.StartStep(stepRunID); err != nil {
		if errors.Is(err, workflows.ErrStepRunNotFound) {
			return out, err
		}
		return out, fmt.Errorf("%w: %v", ErrStepNotDispatchable, err)
	}

	prepared, err := dispatch.PrepareDispatchForStep(s.db, stepRunID)
	if err != nil {
		return out, err
	}

	backendID := asString(prepared.Worker["execution_backend_id"])
	if backendID == "" {
		return out, fmt.Errorf("%w: worker execution backend missing", ErrStepNotDispatchable)
	}

	jobID, err := s.createJob(stepRunID, backendID, prepared)
	if err != nil {
		return out, err
	}
	out.JobID = jobID

	execResult, execErr := s.adapter.ExecutePreparedDispatch(ctx, openclaw.PreparedDispatchRequest{
		WorkflowRunID:    prepared.WorkflowRunID,
		StepRunID:        prepared.StepRunID,
		TaskID:           prepared.TaskID,
		Worker:           prepared.Worker,
		Role:             prepared.Role,
		AgentApp:         prepared.AgentApp,
		ExecutionBackend: prepared.ExecutionBackend,
		ResolvedConfig:   prepared.ResolvedConfig,
		Input:            prepared.Input,
	})
	if execErr != nil {
		execResult = openclaw.ExecutionResult{
			Status:   "failed",
			Output:   map[string]any{"error": execErr.Error()},
			Response: map[string]any{"error": execErr.Error()},
		}
	}

	jobStatus := "failed"
	if execResult.Status == "succeeded" {
		jobStatus = "succeeded"
	}
	if err := s.completeJob(jobID, jobStatus, execResult); err != nil {
		return out, err
	}
	if err := s.insertArtifacts(jobID, stepRunID, execResult.Artifacts); err != nil {
		return out, err
	}

	if execResult.Status == "succeeded" {
		if err := wf.CompleteStep(stepRunID, execResult.Output); err != nil {
			return out, err
		}
	} else {
		if err := wf.FailStep(stepRunID, execResult.Output); err != nil {
			return out, err
		}
	}

	out.JobStatus = jobStatus
	out.ExternalJobRef = execResult.ExternalJobRef
	out.ExecutionStatus = execResult.Status
	out.Output = execResult.Output
	out.Response = execResult.Response
	out.Artifacts = execResult.Artifacts
	return out, nil
}

func ensureDispatchable(db *sql.DB, stepRunID string) error {
	var status string
	var workerID sql.NullString
	if err := db.QueryRow(`SELECT status, worker_id FROM step_runs WHERE id = ?`, stepRunID).Scan(&status, &workerID); err != nil {
		return err
	}
	if status != "ready" || !workerID.Valid || workerID.String == "" {
		return fmt.Errorf("%w: status=%s worker_assigned=%t", ErrStepNotDispatchable, status, workerID.Valid && workerID.String != "")
	}
	return nil
}

func (s *Service) createJob(stepRunID, backendID string, payload dispatch.PreparedDispatchRequest) (string, error) {
	requestJSON, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	now := time.Now().UTC().Format(time.RFC3339)
	jobID := common.UUID()
	_, err = s.db.Exec(`INSERT INTO jobs (id, step_run_id, execution_backend_id, status, request_json, result_json, created_at, updated_at) VALUES (?, ?, ?, 'running', ?, '{}', ?, ?)`, jobID, stepRunID, backendID, string(requestJSON), now, now)
	return jobID, err
}

func (s *Service) completeJob(jobID, status string, result openclaw.ExecutionResult) error {
	resultJSON, err := json.Marshal(result)
	if err != nil {
		return err
	}
	now := time.Now().UTC().Format(time.RFC3339)
	_, err = s.db.Exec(`UPDATE jobs SET external_job_ref = NULLIF(?, ''), status=?, result_json=?, updated_at=? WHERE id=?`, result.ExternalJobRef, status, string(resultJSON), now, jobID)
	return err
}

func (s *Service) insertArtifacts(jobID, stepRunID string, artifacts []openclaw.JobArtifact) error {
	for _, artifact := range artifacts {
		metadataJSON, err := json.Marshal(artifact.Metadata)
		if err != nil {
			return err
		}
		_, err = s.db.Exec(`INSERT INTO artifacts (id, job_id, step_run_id, kind, uri, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`, common.UUID(), jobID, stepRunID, artifact.Kind, artifact.URI, string(metadataJSON), time.Now().UTC().Format(time.RFC3339))
		if err != nil {
			return err
		}
	}
	return nil
}

func asString(v any) string {
	s, _ := v.(string)
	return s
}
