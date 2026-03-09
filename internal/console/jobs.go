package console

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/PonyDevAI/Bull-Board/internal/common"
)

const defaultLeaseSeconds = 600

// GET /api/workers/pull?worker_id=...&limit=... 拉取 worker 的 queued jobs，原子写租约
func (s *Server) workerPull(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet || !strings.HasPrefix(r.URL.Path, "/api/workers/pull") {
		http.NotFound(w, r)
		return
	}
	if s.db == nil {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"jobs": []any{}})
		return
	}
	workerID := r.URL.Query().Get("worker_id")
	if workerID == "" {
		writeJSONError(w, "worker_id required", http.StatusBadRequest)
		return
	}
	limit := 1
	if l := r.URL.Query().Get("limit"); l != "" {
		if n, err := parseInt(l); err == nil && n > 0 && n <= 10 {
			limit = n
		}
	}
	// 先回收超时未续租的 running jobs 为 queued
	now := time.Now().UTC().Format(time.RFC3339)
	_, _ = s.db.Exec(`UPDATE jobs SET status='queued', locked_until=NULL WHERE status='running' AND (locked_until IS NULL OR locked_until < ?)`, now)
	// 查询可拉取的 jobs：assigned_worker_id 属于该 person 的 workers，且 queued 且无有效租约
	rows, err := s.db.Query(`
		SELECT j.id, j.run_id, j.task_id, j.workspace_id, j.mode, j.payload_json, j.assigned_worker_id
		FROM jobs j
		INNER JOIN workers w ON j.assigned_worker_id = w.id AND w.id = ?
		WHERE j.status = 'queued' AND (j.locked_until IS NULL OR j.locked_until < ?)
		ORDER BY j.priority DESC, j.available_at ASC
		LIMIT ?
	`, workerID, now, limit)
	if err != nil {
		writeJSONError(w, "db", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	type jobRow struct {
		id, runID, taskID, workspaceID, mode, payloadJSON, assignedWorkerID string
	}
	var rowsData []jobRow
	var jobs []map[string]any
	for rows.Next() {
		var row jobRow
		if err := rows.Scan(&row.id, &row.runID, &row.taskID, &row.workspaceID, &row.mode, &row.payloadJSON, &row.assignedWorkerID); err != nil {
			continue
		}
		rowsData = append(rowsData, row)
		var payload map[string]any
		_ = json.Unmarshal([]byte(row.payloadJSON), &payload)
		jobs = append(jobs, map[string]any{
			"id": row.id, "run_id": row.runID, "task_id": row.taskID, "workspace_id": row.workspaceID,
			"mode": row.mode, "payload": payload, "assigned_worker_id": row.assignedWorkerID,
		})
	}
	// 原子写租约
	leaseUntil := time.Now().UTC().Add(defaultLeaseSeconds * time.Second).Format(time.RFC3339)
	for _, row := range rowsData {
		s.db.Exec(`UPDATE jobs SET status='running', locked_until=?, attempts=attempts+1, updated_at=? WHERE id=?`, leaseUntil, now, row.id)
		s.db.Exec(`UPDATE workers SET current_job_id=?, last_seen_at=?, status='busy' WHERE id=?`, row.id, now, row.assignedWorkerID)
	}
	writeJSON(w, map[string]any{"jobs": jobs})
}

func parseInt(s string) (int, error) {
	var n int
	_, err := fmt.Sscanf(s, "%d", &n)
	return n, err
}

// POST /api/jobs/:id/report 上报 job 结果；更新 job、run、worker.current_job_id
func (s *Server) jobReport(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.NotFound(w, r)
		return
	}
	path := r.URL.Path
	if !strings.HasPrefix(path, "/api/jobs/") || !strings.HasSuffix(path, "/report") {
		http.NotFound(w, r)
		return
	}
	jobID := strings.TrimPrefix(strings.TrimSuffix(path, "/report"), "/api/jobs/")
	if jobID == "" {
		writeJSONError(w, "job id required", http.StatusBadRequest)
		return
	}
	if s.db == nil {
		writeJSONError(w, "db not configured", http.StatusServiceUnavailable)
		return
	}
	var body struct {
		Status    string           `json:"status"`
		Summary   string           `json:"summary"`
		Artifacts []map[string]any `json:"artifacts"`
		Logs      string           `json:"logs"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	if body.Status == "" {
		body.Status = "succeeded"
	}
	if body.Status != "succeeded" && body.Status != "failed" {
		writeJSONError(w, "status must be succeeded or failed", http.StatusBadRequest)
		return
	}
	now := time.Now().UTC().Format(time.RFC3339)
	var runID, assignedWorkerID string
	err := s.db.QueryRow(`SELECT run_id, assigned_worker_id FROM jobs WHERE id=?`, jobID).Scan(&runID, &assignedWorkerID)
	if err == sql.ErrNoRows {
		writeJSONError(w, "job not found", http.StatusNotFound)
		return
	}
	if err != nil {
		writeJSONError(w, "db", http.StatusInternalServerError)
		return
	}
	tx, _ := s.db.Begin()
	defer tx.Rollback()
	_, _ = tx.Exec(`UPDATE jobs SET status=?, locked_until=NULL, last_error=?, updated_at=? WHERE id=?`, body.Status, body.Summary, now, jobID)
	_, _ = tx.Exec(`UPDATE runs SET status=?, finished_at=?, error_message=?, updated_at=? WHERE id=?`, body.Status, now, body.Summary, now, runID)
	_, _ = tx.Exec(`UPDATE workers SET current_job_id=NULL, last_seen_at=?, status='online' WHERE id=?`, now, assignedWorkerID)
	if body.Artifacts != nil {
		for _, a := range body.Artifacts {
			typ, _ := a["type"].(string)
			uri, _ := a["uri"].(string)
			if typ != "" && uri != "" {
				_, _ = tx.Exec(`INSERT INTO artifacts (id, run_id, type, uri, created_at) VALUES (?, ?, ?, ?, ?)`, common.UUID(), runID, typ, uri, now)
			}
		}
	}
	if err := tx.Commit(); err != nil {
		writeJSONError(w, "db", http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]string{"ok": "true"})
}
