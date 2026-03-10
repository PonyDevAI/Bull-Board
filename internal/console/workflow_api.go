package console

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/PonyDevAI/Bull-Board/internal/common"
	"github.com/PonyDevAI/Bull-Board/internal/console/dispatch"
	"github.com/PonyDevAI/Bull-Board/internal/console/execution"
	"github.com/PonyDevAI/Bull-Board/internal/console/workflows"
)

func (s *Server) apiWorkflowRoutes(w http.ResponseWriter, r *http.Request) {
	if s.db == nil {
		writeJSONError(w, "db not configured", http.StatusServiceUnavailable)
		return
	}
	path := r.URL.Path
	if path == "/api/workflow-templates" {
		if r.Method == http.MethodGet {
			s.resourceList(w, workforceResource{Table: "workflow_templates"})
			return
		}
		if r.Method == http.MethodPost {
			s.resourceCreate(w, r, workforceResource{Table: "workflow_templates", RequiredFields: []string{"workspace_id", "name"}})
			return
		}
		http.Error(w, "", http.StatusMethodNotAllowed)
		return
	}
	if strings.HasPrefix(path, "/api/workflow-templates/") {
		rest := strings.TrimPrefix(path, "/api/workflow-templates/")
		parts := strings.SplitN(rest, "/", 2)
		id := parts[0]
		if id == "" {
			http.NotFound(w, r)
			return
		}
		if len(parts) == 1 {
			switch r.Method {
			case http.MethodGet:
				s.resourceGet(w, workforceResource{Table: "workflow_templates"}, id)
			case http.MethodPatch:
				s.resourceUpdate(w, r, workforceResource{Table: "workflow_templates"}, id)
			case http.MethodDelete:
				s.resourceDelete(w, workforceResource{Table: "workflow_templates"}, id)
			default:
				http.Error(w, "", http.StatusMethodNotAllowed)
			}
			return
		}
		if parts[1] == "steps" {
			s.handleTemplateSteps(w, r, id)
			return
		}
	}
	if strings.HasPrefix(path, "/api/workflow-runs/") {
		if r.Method != http.MethodGet {
			http.Error(w, "", http.StatusMethodNotAllowed)
			return
		}
		runID := strings.TrimPrefix(path, "/api/workflow-runs/")
		wf := workflows.NewService(s.db)
		state, err := wf.GetWorkflowRunState(runID)
		if err == sql.ErrNoRows {
			writeJSONError(w, "not found", http.StatusNotFound)
			return
		}
		if err != nil {
			writeJSONError(w, "db", http.StatusInternalServerError)
			return
		}
		writeJSON(w, map[string]any{"item": state})
		return
	}
	if strings.HasPrefix(path, "/api/step-runs/") {
		s.handleStepRunActions(w, r)
		return
	}
	if strings.HasPrefix(path, "/api/tasks/") && strings.HasSuffix(path, "/workflow") {
		if r.Method != http.MethodGet {
			http.Error(w, "", http.StatusMethodNotAllowed)
			return
		}
		taskID := strings.TrimSuffix(strings.TrimPrefix(path, "/api/tasks/"), "/workflow")
		taskID = strings.TrimSuffix(taskID, "/")
		s.getTaskWorkflow(w, taskID)
		return
	}
	http.NotFound(w, r)
}

func (s *Server) handleStepRunActions(w http.ResponseWriter, r *http.Request) {
	rest := strings.TrimPrefix(r.URL.Path, "/api/step-runs/")
	parts := strings.SplitN(rest, "/", 2)
	if len(parts) != 2 || strings.TrimSpace(parts[0]) == "" {
		http.NotFound(w, r)
		return
	}
	stepRunID := parts[0]
	action := parts[1]
	wf := workflows.NewService(s.db)

	switch action {
	case "start":
		if r.Method != http.MethodPost {
			http.Error(w, "", http.StatusMethodNotAllowed)
			return
		}
		if err := wf.StartStep(stepRunID); err != nil {
			s.writeStepActionError(w, err)
			return
		}
		writeJSON(w, map[string]any{"ok": true})
	case "complete":
		if r.Method != http.MethodPost {
			http.Error(w, "", http.StatusMethodNotAllowed)
			return
		}
		var body struct {
			Output any `json:"output"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeJSONError(w, "invalid body", http.StatusBadRequest)
			return
		}
		if err := wf.CompleteStep(stepRunID, body.Output); err != nil {
			s.writeStepActionError(w, err)
			return
		}
		writeJSON(w, map[string]any{"ok": true})
	case "fail":
		if r.Method != http.MethodPost {
			http.Error(w, "", http.StatusMethodNotAllowed)
			return
		}
		var body struct {
			ErrorInfo any `json:"errorInfo"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeJSONError(w, "invalid body", http.StatusBadRequest)
			return
		}
		if err := wf.FailStep(stepRunID, body.ErrorInfo); err != nil {
			s.writeStepActionError(w, err)
			return
		}
		writeJSON(w, map[string]any{"ok": true})
	case "dispatch-preview":
		if r.Method != http.MethodGet {
			http.Error(w, "", http.StatusMethodNotAllowed)
			return
		}
		payload, err := dispatch.PrepareDispatchForStep(s.db, stepRunID)
		if err == dispatch.ErrStepRunWorkerMissing {
			writeJSONError(w, "step has no assigned worker", http.StatusConflict)
			return
		}
		if err == sql.ErrNoRows {
			writeJSONError(w, "not found", http.StatusNotFound)
			return
		}
		if err != nil {
			writeJSONError(w, "dispatch preview failed", http.StatusInternalServerError)
			return
		}
		writeJSON(w, map[string]any{"item": payload})
	case "dispatch":
		if r.Method != http.MethodPost {
			http.Error(w, "", http.StatusMethodNotAllowed)
			return
		}
		execSvc := execution.NewService(s.db)
		result, err := execSvc.DispatchStepRun(r.Context(), stepRunID)
		if err != nil {
			if err == sql.ErrNoRows || err == workflows.ErrStepRunNotFound {
				writeJSONError(w, "not found", http.StatusNotFound)
				return
			}
			if err == dispatch.ErrStepRunWorkerMissing || err == execution.ErrStepNotDispatchable || strings.Contains(err.Error(), execution.ErrStepNotDispatchable.Error()) {
				writeJSONError(w, err.Error(), http.StatusConflict)
				return
			}
			writeJSONError(w, "dispatch failed", http.StatusInternalServerError)
			return
		}
		writeJSON(w, map[string]any{"item": result})
	default:
		http.NotFound(w, r)
	}
}

func (s *Server) writeStepActionError(w http.ResponseWriter, err error) {
	if err == workflows.ErrStepRunNotFound || err == sql.ErrNoRows {
		writeJSONError(w, "not found", http.StatusNotFound)
		return
	}
	if strings.Contains(err.Error(), workflows.ErrInvalidStepTransition.Error()) {
		writeJSONError(w, err.Error(), http.StatusConflict)
		return
	}
	writeJSONError(w, "db", http.StatusInternalServerError)
}

func (s *Server) handleTemplateSteps(w http.ResponseWriter, r *http.Request, templateID string) {
	if r.Method == http.MethodGet {
		rows, err := s.db.Query(`SELECT * FROM workflow_step_templates WHERE workflow_template_id = ? ORDER BY step_order ASC, created_at ASC`, templateID)
		if err != nil {
			writeJSONError(w, "db", http.StatusInternalServerError)
			return
		}
		defer rows.Close()
		items, err := scanRows(rows)
		if err != nil {
			writeJSONError(w, "db", http.StatusInternalServerError)
			return
		}
		writeJSON(w, map[string]any{"items": items})
		return
	}
	if r.Method == http.MethodPost {
		payload := map[string]any{}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeJSONError(w, "invalid body", http.StatusBadRequest)
			return
		}
		if strings.TrimSpace(asString(payload["name"])) == "" || strings.TrimSpace(asString(payload["step_type"])) == "" {
			writeJSONError(w, "name and step_type required", http.StatusBadRequest)
			return
		}
		if _, ok := payload["step_order"]; !ok {
			writeJSONError(w, "step_order required", http.StatusBadRequest)
			return
		}
		now := time.Now().UTC().Format(time.RFC3339)
		payload["id"] = common.UUID()
		payload["workflow_template_id"] = templateID
		payload["created_at"] = now
		if _, ok := payload["config_json"]; !ok {
			payload["config_json"] = "{}"
		}
		columns := make([]string, 0, len(payload))
		values := make([]any, 0, len(payload))
		marks := make([]string, 0, len(payload))
		for k, v := range payload {
			columns = append(columns, k)
			values = append(values, v)
			marks = append(marks, "?")
		}
		if _, err := s.db.Exec("INSERT INTO workflow_step_templates ("+strings.Join(columns, ",")+") VALUES ("+strings.Join(marks, ",")+")", values...); err != nil {
			writeJSONError(w, "db", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusCreated)
		writeJSON(w, map[string]any{"item": payload})
		return
	}
	http.Error(w, "", http.StatusMethodNotAllowed)
}

func (s *Server) getTaskWorkflow(w http.ResponseWriter, taskID string) {
	var runID string
	err := s.db.QueryRow(`SELECT id FROM workflow_runs WHERE task_id = ? ORDER BY created_at DESC LIMIT 1`, taskID).Scan(&runID)
	if err == sql.ErrNoRows {
		writeJSON(w, map[string]any{"workflow_run": nil, "step_runs": []any{}})
		return
	}
	if err != nil {
		writeJSONError(w, "db", http.StatusInternalServerError)
		return
	}
	wf := workflows.NewService(s.db)
	state, err := wf.GetWorkflowRunState(runID)
	if err != nil {
		writeJSONError(w, "db", http.StatusInternalServerError)
		return
	}
	current := map[string]any(nil)
	for _, sr := range state.StepRuns {
		st, _ := sr["status"].(string)
		if st == "running" || st == "ready" || st == "pending_unassigned" {
			current = sr
			break
		}
	}
	writeJSON(w, map[string]any{"workflow_run": state, "step_runs": state.StepRuns, "current_step": current})
}
