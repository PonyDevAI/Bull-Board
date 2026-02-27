package control

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/PonyDevAI/Bull-Board/internal/common"
)

// apiWorkspaces 处理 GET/POST /api/workspaces、GET /api/workspaces/:id
func (s *Server) apiWorkspaces(w http.ResponseWriter, r *http.Request) {
	if s.db == nil {
		http.Error(w, `{"error":"db not configured"}`, http.StatusServiceUnavailable)
		return
	}
	path := r.URL.Path
	if path == "/api/workspaces" {
		if r.Method == http.MethodGet {
			s.listWorkspaces(w)
			return
		}
		if r.Method == http.MethodPost {
			s.createWorkspace(w, r)
			return
		}
		http.Error(w, "", http.StatusMethodNotAllowed)
		return
	}
	if strings.HasPrefix(path, "/api/workspaces/") {
		id := strings.TrimPrefix(path, "/api/workspaces/")
		if id == "" || strings.Contains(id, "/") {
			http.NotFound(w, r)
			return
		}
		if r.Method == http.MethodGet {
			s.getWorkspace(w, id)
			return
		}
		http.Error(w, "", http.StatusMethodNotAllowed)
		return
	}
	http.NotFound(w, r)
}

func (s *Server) listWorkspaces(w http.ResponseWriter) {
	rows, err := s.db.Query(`SELECT id, name, repo_path, default_branch, created_at FROM workspaces ORDER BY created_at DESC`)
	if err != nil {
		writeJSONError(w, "db", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	var list []map[string]any
	for rows.Next() {
		var id, name, repoPath, defaultBranch, createdAt string
		if err := rows.Scan(&id, &name, &repoPath, &defaultBranch, &createdAt); err != nil {
			continue
		}
		list = append(list, map[string]any{
			"id": id, "name": name, "repoPath": repoPath, "defaultBranch": defaultBranch, "createdAt": createdAt,
		})
	}
	writeJSON(w, list)
}

func (s *Server) getWorkspace(w http.ResponseWriter, id string) {
	var name, repoPath, defaultBranch, createdAt string
	err := s.db.QueryRow(`SELECT name, repo_path, default_branch, created_at FROM workspaces WHERE id = ?`, id).
		Scan(&name, &repoPath, &defaultBranch, &createdAt)
	if err == sql.ErrNoRows {
		writeJSONError(w, "Not found", http.StatusNotFound)
		return
	}
	if err != nil {
		writeJSONError(w, "db", http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]any{"id": id, "name": name, "repoPath": repoPath, "defaultBranch": defaultBranch, "createdAt": createdAt})
}

func (s *Server) createWorkspace(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name         string `json:"name"`
		RepoPath     string `json:"repoPath"`
		DefaultBranch string `json:"defaultBranch"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Name == "" || body.RepoPath == "" {
		writeJSONError(w, "name and repoPath required", http.StatusBadRequest)
		return
	}
	if body.DefaultBranch == "" {
		body.DefaultBranch = "main"
	}
	id := common.UUID()
	now := time.Now().UTC().Format(time.RFC3339)
	_, err := s.db.Exec(`INSERT INTO workspaces (id, name, repo_path, default_branch, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
		id, body.Name, body.RepoPath, body.DefaultBranch, now, now)
	if err != nil {
		writeJSONError(w, "db", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
	writeJSON(w, map[string]any{"id": id, "name": body.Name, "repoPath": body.RepoPath, "defaultBranch": body.DefaultBranch, "createdAt": now})
}

// apiTasks 处理 /api/tasks、/api/tasks/:id、status、messages、runs、enqueue、actions/*
func (s *Server) apiTasks(w http.ResponseWriter, r *http.Request) {
	if s.db == nil {
		http.Error(w, `{"error":"db not configured"}`, http.StatusServiceUnavailable)
		return
	}
	path := r.URL.Path
	if path == "/api/tasks" {
		if r.Method == http.MethodGet {
			s.listTasks(w, r)
			return
		}
		if r.Method == http.MethodPost {
			s.createTask(w, r)
			return
		}
		http.Error(w, "", http.StatusMethodNotAllowed)
		return
	}
	if !strings.HasPrefix(path, "/api/tasks/") {
		http.NotFound(w, r)
		return
	}
	rest := strings.TrimPrefix(path, "/api/tasks/")
	parts := strings.SplitN(rest, "/", 2)
	taskID := parts[0]
	if taskID == "" {
		http.NotFound(w, r)
		return
	}
	if len(parts) == 1 {
		if r.Method == http.MethodGet {
			s.getTask(w, taskID)
			return
		}
		http.Error(w, "", http.StatusMethodNotAllowed)
		return
	}
	sub := parts[1]
	switch sub {
	case "status":
		if r.Method == http.MethodPost {
			s.updateTaskStatus(w, r, taskID)
			return
		}
	case "messages":
		if r.Method == http.MethodGet {
			s.listMessages(w, taskID)
			return
		}
		if r.Method == http.MethodPost {
			s.createMessage(w, r, taskID)
			return
		}
	case "runs":
		if r.Method == http.MethodGet {
			s.listRuns(w, taskID)
			return
		}
	case "enqueue":
		if r.Method == http.MethodPost {
			s.enqueueTask(w, r, taskID)
			return
		}
	case "actions/submit":
		if r.Method == http.MethodPost {
			s.actionSubmit(w, taskID)
			return
		}
	case "actions/replan":
		if r.Method == http.MethodPost {
			s.actionReplan(w, taskID)
			return
		}
	case "actions/retry":
		if r.Method == http.MethodPost {
			s.actionRetry(w, taskID)
			return
		}
	case "actions/continue-fix":
		if r.Method == http.MethodPost {
			s.actionContinueFix(w, taskID)
			return
		}
	}
	http.NotFound(w, r)
}

func (s *Server) listTasks(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	workspaceID := q.Get("workspace_id")
	status := q.Get("status")
	sqlStr := `SELECT t.id, t.workspace_id, t.title, t.description, t.status, t.plan_round, t.fix_round, t.submit_state, t.created_at, t.updated_at, w.name as workspace_name
		FROM tasks t LEFT JOIN workspaces w ON t.workspace_id = w.id WHERE 1=1`
	args := []any{}
	if workspaceID != "" {
		sqlStr += ` AND t.workspace_id = ?`
		args = append(args, workspaceID)
	}
	if status != "" {
		sqlStr += ` AND t.status = ?`
		args = append(args, status)
	}
	sqlStr += ` ORDER BY t.updated_at DESC`
	var rows *sql.Rows
	var err error
	if len(args) > 0 {
		rows, err = s.db.Query(sqlStr, args...)
	} else {
		rows, err = s.db.Query(sqlStr)
	}
	if err != nil {
		writeJSONError(w, "db", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	var list []map[string]any
	for rows.Next() {
		var id, workspaceId, title, desc, st, submitState, createdAt, updatedAt string
		var planRound, fixRound int
		var workspaceName sql.NullString
		if err := rows.Scan(&id, &workspaceId, &title, &desc, &st, &planRound, &fixRound, &submitState, &createdAt, &updatedAt, &workspaceName); err != nil {
			continue
		}
		m := map[string]any{
			"id": id, "workspaceId": workspaceId, "title": title, "description": desc, "status": st,
			"planRound": planRound, "fixRound": fixRound, "submitState": submitState, "createdAt": createdAt, "updatedAt": updatedAt,
		}
		if workspaceName.Valid {
			m["workspaceName"] = workspaceName.String
		}
		list = append(list, m)
	}
	writeJSON(w, list)
}

func (s *Server) getTask(w http.ResponseWriter, id string) {
	var workspaceId, title, desc, status, submitState, createdAt, updatedAt string
	var planRound, fixRound int
	err := s.db.QueryRow(`SELECT workspace_id, title, description, status, plan_round, fix_round, submit_state, created_at, updated_at FROM tasks WHERE id = ?`, id).
		Scan(&workspaceId, &title, &desc, &status, &planRound, &fixRound, &submitState, &createdAt, &updatedAt)
	if err == sql.ErrNoRows {
		writeJSONError(w, "Not found", http.StatusNotFound)
		return
	}
	if err != nil {
		writeJSONError(w, "db", http.StatusInternalServerError)
		return
	}
	task := map[string]any{
		"id": id, "workspaceId": workspaceId, "title": title, "description": desc, "status": status,
		"planRound": planRound, "fixRound": fixRound, "submitState": submitState, "createdAt": createdAt, "updatedAt": updatedAt,
	}
	var wsName, wsRepo, wsBranch string
	if err := s.db.QueryRow(`SELECT name, repo_path, default_branch FROM workspaces WHERE id = ?`, workspaceId).
		Scan(&wsName, &wsRepo, &wsBranch); err == nil {
		task["workspace"] = map[string]any{"id": workspaceId, "name": wsName, "repoPath": wsRepo, "defaultBranch": wsBranch}
	}
	runs, err := s.db.Query(`SELECT id, task_id, mode, status, error_kind, error_message, started_at, finished_at FROM runs WHERE task_id = ? ORDER BY started_at DESC`, id)
	runList := []map[string]any{}
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
			var artList []map[string]any
			arts, _ := s.db.Query(`SELECT id, run_id, type, uri, created_at FROM artifacts WHERE run_id = ?`, rid.String)
			if arts != nil {
				for arts.Next() {
					var aid, runId, typ, uri, cat string
					arts.Scan(&aid, &runId, &typ, &uri, &cat)
					artList = append(artList, map[string]any{"id": aid, "runId": runId, "type": typ, "uri": uri, "createdAt": cat})
				}
				arts.Close()
			}
			m["artifacts"] = artList
			runList = append(runList, m)
		}
	}
	task["runs"] = runList
	msgs, err2 := s.db.Query(`SELECT id, task_id, round_type, round_no, author, content, created_at FROM messages WHERE task_id = ? ORDER BY id ASC`, id)
	msgList := []map[string]any{}
	if err2 == nil && msgs != nil {
		defer msgs.Close()
		for msgs.Next() {
			var mid, tid, roundType, author, content, cat string
			var roundNo int
			msgs.Scan(&mid, &tid, &roundType, &roundNo, &author, &content, &cat)
			msgList = append(msgList, map[string]any{"id": mid, "taskId": tid, "roundType": roundType, "roundNo": roundNo, "author": author, "content": content, "createdAt": cat})
		}
	}
	task["messages"] = msgList
	writeJSON(w, task)
}

func (s *Server) createTask(w http.ResponseWriter, r *http.Request) {
	var body struct {
		WorkspaceId string `json:"workspaceId"`
		Title       string `json:"title"`
		Description string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.WorkspaceId == "" || body.Title == "" {
		writeJSONError(w, "workspaceId and title required", http.StatusBadRequest)
		return
	}
	id := common.UUID()
	now := time.Now().UTC().Format(time.RFC3339)
	_, err := s.db.Exec(`INSERT INTO tasks (id, workspace_id, title, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
		id, body.WorkspaceId, body.Title, body.Description, now, now)
	if err != nil {
		writeJSONError(w, "db", http.StatusInternalServerError)
		return
	}
	var status, submitState string
	var planRound, fixRound int
	s.db.QueryRow(`SELECT status, plan_round, fix_round, submit_state FROM tasks WHERE id = ?`, id).Scan(&status, &planRound, &fixRound, &submitState)
	w.WriteHeader(http.StatusCreated)
	writeJSON(w, map[string]any{"id": id, "workspaceId": body.WorkspaceId, "title": body.Title, "description": body.Description, "status": status, "planRound": planRound, "fixRound": fixRound, "submitState": submitState, "createdAt": now, "updatedAt": now})
}

func (s *Server) updateTaskStatus(w http.ResponseWriter, r *http.Request, taskID string) {
	var body struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Status == "" {
		writeJSONError(w, "status required", http.StatusBadRequest)
		return
	}
	now := time.Now().UTC().Format(time.RFC3339)
	res, err := s.db.Exec(`UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?`, body.Status, now, taskID)
	if err != nil {
		writeJSONError(w, "db", http.StatusInternalServerError)
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		writeJSONError(w, "Not found", http.StatusNotFound)
		return
	}
	var workspaceId, title, desc, status, submitState, createdAt, updatedAt string
	var planRound, fixRound int
	s.db.QueryRow(`SELECT workspace_id, title, description, status, plan_round, fix_round, submit_state, created_at, updated_at FROM tasks WHERE id = ?`, taskID).
		Scan(&workspaceId, &title, &desc, &status, &planRound, &fixRound, &submitState, &createdAt, &updatedAt)
	writeJSON(w, map[string]any{"id": taskID, "workspaceId": workspaceId, "title": title, "description": desc, "status": status, "planRound": planRound, "fixRound": fixRound, "submitState": submitState, "createdAt": createdAt, "updatedAt": updatedAt})
}

func (s *Server) listMessages(w http.ResponseWriter, taskID string) {
	rows, err := s.db.Query(`SELECT id, task_id, round_type, round_no, author, content, created_at FROM messages WHERE task_id = ? ORDER BY id ASC`, taskID)
	if err != nil {
		writeJSONError(w, "db", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	var list []map[string]any
	for rows.Next() {
		var id, tid, roundType, author, content, createdAt string
		var roundNo int
		rows.Scan(&id, &tid, &roundType, &roundNo, &author, &content, &createdAt)
		list = append(list, map[string]any{"id": id, "taskId": tid, "roundType": roundType, "roundNo": roundNo, "author": author, "content": content, "createdAt": createdAt})
	}
	writeJSON(w, list)
}

func (s *Server) createMessage(w http.ResponseWriter, r *http.Request, taskID string) {
	var body struct {
		RoundType string `json:"roundType"`
		RoundNo   int    `json:"roundNo"`
		Author    string `json:"author"`
		Content   string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSONError(w, "roundType, roundNo, author, content required", http.StatusBadRequest)
		return
	}
	var n int
	if err := s.db.QueryRow(`SELECT 1 FROM tasks WHERE id = ?`, taskID).Scan(&n); err == sql.ErrNoRows {
		writeJSONError(w, "Task not found", http.StatusNotFound)
		return
	}
	id := common.UUID()
	now := time.Now().UTC().Format(time.RFC3339)
	_, err := s.db.Exec(`INSERT INTO messages (id, task_id, round_type, round_no, author, content, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
		id, taskID, body.RoundType, body.RoundNo, body.Author, body.Content, now)
	if err != nil {
		writeJSONError(w, "db", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
	writeJSON(w, map[string]any{"id": id, "taskId": taskID, "roundType": body.RoundType, "roundNo": body.RoundNo, "author": body.Author, "content": body.Content, "createdAt": now})
}

func (s *Server) listRuns(w http.ResponseWriter, taskID string) {
	rows, err := s.db.Query(`SELECT id, task_id, mode, status, worktree_path, branch_name, error_kind, error_message, started_at, finished_at, created_at FROM runs WHERE task_id = ? ORDER BY started_at DESC`, taskID)
	if err != nil {
		writeJSONError(w, "db", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	var list []map[string]any
	for rows.Next() {
		var id, tid, mode, status string
		var worktreePath, branchName, errKind, errMsg, started, finished, createdAt sql.NullString
		rows.Scan(&id, &tid, &mode, &status, &worktreePath, &branchName, &errKind, &errMsg, &started, &finished, &createdAt)
		m := map[string]any{"id": id, "taskId": tid, "mode": mode, "status": status}
		if worktreePath.Valid {
			m["worktreePath"] = worktreePath.String
		}
		if branchName.Valid {
			m["branchName"] = branchName.String
		}
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
		if createdAt.Valid {
			m["createdAt"] = createdAt.String
		}
		var artList []map[string]any
		arts, _ := s.db.Query(`SELECT id, run_id, type, uri, created_at FROM artifacts WHERE run_id = ?`, id)
		if arts != nil {
			for arts.Next() {
				var aid, runId, typ, uri, cat string
				arts.Scan(&aid, &runId, &typ, &uri, &cat)
				artList = append(artList, map[string]any{"id": aid, "runId": runId, "type": typ, "uri": uri, "createdAt": cat})
			}
			arts.Close()
		}
		m["artifacts"] = artList
		list = append(list, m)
	}
	writeJSON(w, list)
}

func (s *Server) enqueueTask(w http.ResponseWriter, r *http.Request, taskID string) {
	var taskWorkspace string
	if err := s.db.QueryRow(`SELECT workspace_id FROM tasks WHERE id = ?`, taskID).Scan(&taskWorkspace); err == sql.ErrNoRows {
		writeJSONError(w, "Not found", http.StatusNotFound)
		return
	}
	var body struct {
		Mode    string         `json:"mode"`
		Payload map[string]any `json:"payload"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Mode == "" || body.Payload == nil {
		writeJSONError(w, "mode and payload required", http.StatusBadRequest)
		return
	}
	if body.Mode != "CODE_CHANGE" && body.Mode != "VERIFY" && body.Mode != "SUBMIT" {
		writeJSONError(w, "invalid mode", http.StatusBadRequest)
		return
	}
	runId, jobId := s.enqueue(runEnqueueParams{TaskID: taskID, WorkspaceID: taskWorkspace, Mode: body.Mode, Payload: body.Payload})
	w.WriteHeader(http.StatusCreated)
	writeJSON(w, map[string]any{"runId": runId, "jobId": jobId})
}

type runEnqueueParams struct {
	TaskID      string
	WorkspaceID string
	Mode        string
	Payload     map[string]any
}

func (s *Server) enqueue(p runEnqueueParams) (runId, jobId string) {
	runId = common.UUID()
	jobId = common.UUID()
	now := time.Now().UTC().Format(time.RFC3339)
	payloadJSON, _ := json.Marshal(p.Payload)
	s.db.Exec(`INSERT INTO runs (id, task_id, mode, status, created_at, updated_at) VALUES (?, ?, ?, 'queued', ?, ?)`, runId, p.TaskID, p.Mode, now, now)
	s.db.Exec(`INSERT INTO jobs (id, run_id, task_id, workspace_id, mode, payload_json, status, available_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'queued', ?, ?, ?)`,
		jobId, runId, p.TaskID, p.WorkspaceID, p.Mode, string(payloadJSON), now, now, now)
	return runId, jobId
}

func (s *Server) actionSubmit(w http.ResponseWriter, taskID string) {
	var taskTitle, workspaceId, repoPath, defaultBranch string
	err := s.db.QueryRow(`SELECT t.title, t.workspace_id, w.repo_path, w.default_branch FROM tasks t JOIN workspaces w ON t.workspace_id = w.id WHERE t.id = ?`, taskID).
		Scan(&taskTitle, &workspaceId, &repoPath, &defaultBranch)
	if err == sql.ErrNoRows {
		writeJSONError(w, "Not found", http.StatusNotFound)
		return
	}
	if defaultBranch == "" {
		defaultBranch = "main"
	}
	var branch string
	s.db.QueryRow(`SELECT branch_name FROM runs WHERE task_id = ? ORDER BY created_at DESC LIMIT 1`, taskID).Scan(&branch)
	if branch == "" {
		branch = "bb/task-" + taskID + "-submit"
	}
	payload := map[string]any{
		"workspace":       map[string]any{"repo_path": repoPath, "base_branch": defaultBranch},
		"workdir_strategy": "git_worktree",
		"branch":         branch,
		"submit":         map[string]any{"actions": []string{"commit", "push"}, "commit_message": "BullBoard: " + taskTitle, "remote": "origin"},
	}
	runId, jobId := s.enqueue(runEnqueueParams{TaskID: taskID, WorkspaceID: workspaceId, Mode: "SUBMIT", Payload: payload})
	w.WriteHeader(http.StatusCreated)
	writeJSON(w, map[string]any{"runId": runId, "jobId": jobId})
}

func (s *Server) actionReplan(w http.ResponseWriter, taskID string) {
	var planRound int
	if err := s.db.QueryRow(`SELECT plan_round FROM tasks WHERE id = ?`, taskID).Scan(&planRound); err == sql.ErrNoRows {
		writeJSONError(w, "Not found", http.StatusNotFound)
		return
	}
	newRound := planRound + 1
	now := time.Now().UTC().Format(time.RFC3339)
	s.db.Exec(`UPDATE tasks SET status = 'plan', plan_round = ?, updated_at = ? WHERE id = ?`, newRound, now, taskID)
	s.db.Exec(`INSERT INTO messages (id, task_id, round_type, round_no, author, content, created_at) VALUES (?, ?, 'plan', ?, 'system', ?, ?)`,
		common.UUID(), taskID, newRound, "Re-plan: Round #"+fmt.Sprint(newRound), now)
	var id, status string
	var pr int
	s.db.QueryRow(`SELECT id, status, plan_round FROM tasks WHERE id = ?`, taskID).Scan(&id, &status, &pr)
	writeJSON(w, map[string]any{"id": id, "status": status, "planRound": pr})
}

func (s *Server) actionRetry(w http.ResponseWriter, taskID string) {
	var taskId, workspaceId string
	if err := s.db.QueryRow(`SELECT id, workspace_id FROM tasks WHERE id = ?`, taskID).Scan(&taskId, &workspaceId); err == sql.ErrNoRows {
		writeJSONError(w, "Not found", http.StatusNotFound)
		return
	}
	var payloadJSON string
	var mode string
	err := s.db.QueryRow(`SELECT j.payload_json, j.mode FROM jobs j JOIN runs r ON j.run_id = r.id WHERE r.task_id = ? ORDER BY j.created_at DESC LIMIT 1`, taskID).Scan(&payloadJSON, &mode)
	if err == sql.ErrNoRows {
		writeJSONError(w, "no run to retry", http.StatusBadRequest)
		return
	}
	var payload map[string]any
	json.Unmarshal([]byte(payloadJSON), &payload)
	runId := common.UUID()
	if payload != nil {
		if b, ok := payload["branch"].(string); ok && b != "" {
			payload["branch"] = "bb/task-" + taskID + "-r" + runId
		}
	}
	now := time.Now().UTC().Format(time.RFC3339)
	jobId := common.UUID()
	s.db.Exec(`INSERT INTO runs (id, task_id, mode, status, created_at, updated_at) VALUES (?, ?, ?, 'queued', ?, ?)`, runId, taskID, mode, now, now)
	pj, _ := json.Marshal(payload)
	s.db.Exec(`INSERT INTO jobs (id, run_id, task_id, workspace_id, mode, payload_json, status, available_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'queued', ?, ?, ?)`,
		jobId, runId, taskID, workspaceId, mode, string(pj), now, now, now)
	w.WriteHeader(http.StatusCreated)
	writeJSON(w, map[string]any{"runId": runId, "jobId": jobId})
}

func (s *Server) actionContinueFix(w http.ResponseWriter, taskID string) {
	var fixRound int
	if err := s.db.QueryRow(`SELECT fix_round FROM tasks WHERE id = ?`, taskID).Scan(&fixRound); err == sql.ErrNoRows {
		writeJSONError(w, "Not found", http.StatusNotFound)
		return
	}
	newFix := fixRound + 1
	now := time.Now().UTC().Format(time.RFC3339)
	s.db.Exec(`UPDATE tasks SET status = 'in_progress', fix_round = ?, updated_at = ? WHERE id = ?`, newFix, now, taskID)
	s.db.Exec(`INSERT INTO messages (id, task_id, round_type, round_no, author, content, created_at) VALUES (?, ?, 'fix', ?, 'system', ?, ?)`,
		common.UUID(), taskID, newFix, "Continue Fix: Round #"+fmt.Sprint(newFix), now)
	var id, status string
	var f int
	s.db.QueryRow(`SELECT id, status, fix_round FROM tasks WHERE id = ?`, taskID).Scan(&id, &status, &f)
	writeJSON(w, map[string]any{"id": id, "status": status, "fixRound": f})
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(v)
}

func writeJSONError(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": msg})
}
