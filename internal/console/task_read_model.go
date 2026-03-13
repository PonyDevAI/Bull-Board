package console

import (
	"database/sql"

	"github.com/PonyDevAI/Bull-Board/internal/console/workflows"
)

// taskCanonicalReadModel aggregates canonical execution truth for task detail.
// Canonical source-of-truth: workflow_runs -> step_runs -> jobs -> artifacts.
type taskCanonicalReadModel struct {
	WorkflowRun        *workflows.WorkflowRunState
	CurrentStep        map[string]any
	CanonicalJobs      []map[string]any
	CanonicalArtifacts []map[string]any
}

func (s *Server) loadTaskCanonicalReadModel(taskID string) taskCanonicalReadModel {
	out := taskCanonicalReadModel{
		CanonicalJobs:      make([]map[string]any, 0),
		CanonicalArtifacts: make([]map[string]any, 0),
	}
	wfRun, err := workflows.NewService(s.db).GetWorkflowRunStateForTask(taskID)
	if err != nil {
		return out
	}
	out.WorkflowRun = &wfRun
	for _, sr := range wfRun.StepRuns {
		if st, _ := sr["status"].(string); st == "running" || st == "ready" || st == "pending_unassigned" {
			out.CurrentStep = sr
			break
		}
	}

	jobRows, err := s.db.Query(`SELECT j.id, j.step_run_id, j.status, COALESCE(j.external_job_ref, ''), COALESCE(j.execution_backend_id, ''), j.created_at, j.updated_at,
		COALESCE(wst.name, ''), COALESCE(wst.step_order, 0)
		FROM jobs j
		JOIN step_runs sr ON sr.id = j.step_run_id
		JOIN workflow_runs wr ON wr.id = sr.workflow_run_id
		LEFT JOIN workflow_step_templates wst ON wst.id = sr.workflow_step_template_id
		WHERE wr.task_id = ?
		ORDER BY j.created_at DESC`, taskID)
	if err == nil && jobRows != nil {
		defer jobRows.Close()
		for jobRows.Next() {
			var jobID, stepRunID, jobStatus, externalRef, backendID, createdAt, updatedAt, stepName string
			var stepOrder int
			if err := jobRows.Scan(&jobID, &stepRunID, &jobStatus, &externalRef, &backendID, &createdAt, &updatedAt, &stepName, &stepOrder); err != nil {
				continue
			}
			out.CanonicalJobs = append(out.CanonicalJobs, map[string]any{
				"id":                 jobID,
				"stepRunId":          stepRunID,
				"status":             jobStatus,
				"externalJobRef":     externalRef,
				"executionBackendId": backendID,
				"createdAt":          createdAt,
				"updatedAt":          updatedAt,
				"stepRunName":        stepName,
				"stepRunOrder":       stepOrder,
			})
		}
	}

	artifactRows, err := s.db.Query(`SELECT a.id, a.job_id, COALESCE(a.step_run_id, ''), a.kind, a.uri, a.metadata_json, a.created_at
		FROM artifacts a
		JOIN jobs j ON j.id = a.job_id
		JOIN step_runs sr ON sr.id = j.step_run_id
		JOIN workflow_runs wr ON wr.id = sr.workflow_run_id
		WHERE wr.task_id = ?
		ORDER BY a.created_at DESC`, taskID)
	if err == nil && artifactRows != nil {
		defer artifactRows.Close()
		for artifactRows.Next() {
			var artifactID, jobID, stepRunID, kind, uri, metadataJSON, createdAt string
			if err := artifactRows.Scan(&artifactID, &jobID, &stepRunID, &kind, &uri, &metadataJSON, &createdAt); err != nil {
				continue
			}
			out.CanonicalArtifacts = append(out.CanonicalArtifacts, map[string]any{
				"id":           artifactID,
				"jobId":        jobID,
				"stepRunId":    stepRunID,
				"kind":         kind,
				"uri":          uri,
				"metadataJson": metadataJSON,
				"createdAt":    createdAt,
			})
		}
	}
	return out
}

// legacyTaskDetailSections remains temporary and explicitly secondary until deletion.
type legacyTaskDetailSections struct {
	Runs     []map[string]any
	Messages []map[string]any
}

func (s *Server) loadTaskLegacySections(taskID string) legacyTaskDetailSections {
	out := legacyTaskDetailSections{Runs: make([]map[string]any, 0), Messages: make([]map[string]any, 0)}

	runs, err := s.db.Query(`SELECT id, task_id, mode, status, error_kind, error_message, started_at, finished_at FROM legacy_runs WHERE task_id = ? ORDER BY started_at DESC`, taskID)
	if err == nil && runs != nil {
		defer runs.Close()
		for runs.Next() {
			var rid, tid, mode, st, errKind, errMsg, started, finished sql.NullString
			runs.Scan(&rid, &tid, &mode, &st, &errKind, &errMsg, &started, &finished)
			m := map[string]any{"id": rid.String, "taskId": tid.String, "mode": mode.String, "status": st.String}
			if errKind.Valid {
				m["errorKind"] = errKind.String
			}
			if errMsg.Valid {
				m["errorMessage"] = errMsg.String
			}
			if started.Valid {
				m["startedAt"] = started.String
			}
			if finished.Valid {
				m["finishedAt"] = finished.String
			}
			var awID string
			s.db.QueryRow(`SELECT assigned_worker_id FROM legacy_jobs WHERE run_id = ? LIMIT 1`, rid.String).Scan(&awID)
			if awID != "" {
				m["assignedWorkerId"] = awID
			}
			var artList []map[string]any
			arts, _ := s.db.Query(`SELECT id, run_id, type, uri, created_at FROM legacy_artifacts WHERE run_id = ?`, rid.String)
			if arts != nil {
				for arts.Next() {
					var aid, runId, typ, uri, cat string
					arts.Scan(&aid, &runId, &typ, &uri, &cat)
					artList = append(artList, map[string]any{"id": aid, "runId": runId, "type": typ, "uri": uri, "createdAt": cat})
				}
				arts.Close()
			}
			m["artifacts"] = artList
			out.Runs = append(out.Runs, m)
		}
	}

	msgs, err2 := s.db.Query(`SELECT id, task_id, round_type, round_no, author, content, created_at FROM legacy_messages WHERE task_id = ? ORDER BY id ASC`, taskID)
	if err2 == nil && msgs != nil {
		defer msgs.Close()
		for msgs.Next() {
			var mid, tid, roundType, author, content, cat string
			var roundNo int
			msgs.Scan(&mid, &tid, &roundType, &roundNo, &author, &content, &cat)
			out.Messages = append(out.Messages, map[string]any{"id": mid, "taskId": tid, "roundType": roundType, "roundNo": roundNo, "author": author, "content": content, "createdAt": cat})
		}
	}

	return out
}
