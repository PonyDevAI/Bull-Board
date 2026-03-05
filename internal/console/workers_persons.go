package console

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/PonyDevAI/Bull-Board/internal/common"
)

// POST /api/persons/register
func (s *Server) apiPersonsRegister(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost || r.URL.Path != "/api/persons/register" {
		http.NotFound(w, r)
		return
	}
	if s.db == nil {
		writeJSONError(w, "db not configured", http.StatusServiceUnavailable)
		return
	}
	var body struct {
		PersonID        string          `json:"person_id"`
		CompanyID       string          `json:"company_id"`
		Name            string          `json:"name"`
		Host            string          `json:"host"`
		CapabilitiesJSON json.RawMessage `json:"capabilities_json"`
		MaxConcurrency  int             `json:"max_concurrency"`
		Version         string          `json:"version"`
		Type            string          `json:"type"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSONError(w, "invalid body", http.StatusBadRequest)
		return
	}
	if body.PersonID == "" {
		writeJSONError(w, "person_id required", http.StatusBadRequest)
		return
	}
	if body.CompanyID == "" {
		body.CompanyID = "default"
	}
	if body.MaxConcurrency <= 0 {
		body.MaxConcurrency = 1
	}
	if body.Type == "" {
		body.Type = "self"
	}
	now := time.Now().UTC().Format(time.RFC3339)
	caps := "{}"
	if len(body.CapabilitiesJSON) > 0 {
		caps = string(body.CapabilitiesJSON)
	}
	_, err := s.db.Exec(`
		INSERT INTO persons (id, company_id, type, name, host, capabilities_json, max_concurrency, version, last_seen_at, status, last_heartbeat)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'online', ?)
		ON CONFLICT(id) DO UPDATE SET
			company_id=excluded.company_id, type=excluded.type, name=excluded.name, host=excluded.host,
			capabilities_json=excluded.capabilities_json, max_concurrency=excluded.max_concurrency,
			version=excluded.version, last_seen_at=excluded.last_seen_at, status='online', last_heartbeat=excluded.last_heartbeat
	`, body.PersonID, body.CompanyID, body.Type, body.Name, body.Host, caps, body.MaxConcurrency, body.Version, now, now)
	if err != nil {
		writeJSONError(w, "db", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"ok": "true", "person_id": body.PersonID})
}

// POST /api/persons/heartbeat
func (s *Server) apiPersonsHeartbeat(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost || r.URL.Path != "/api/persons/heartbeat" {
		http.NotFound(w, r)
		return
	}
	if s.db == nil {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{"ok": "true"})
		return
	}
	var body struct {
		PersonID string `json:"person_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.PersonID == "" {
		http.Error(w, `{"error":"person_id required"}`, http.StatusBadRequest)
		return
	}
	now := time.Now().UTC().Format(time.RFC3339)
	_, err := s.db.Exec(`
		UPDATE persons SET last_heartbeat=?, last_seen_at=?, status='online' WHERE id=?
	`, now, now, body.PersonID)
	if err != nil {
		writeJSONError(w, "db", http.StatusInternalServerError)
		return
	}
	_, _ = s.db.Exec(`INSERT OR IGNORE INTO persons (id, company_id, type, last_heartbeat, last_seen_at, status) VALUES (?, 'default', 'self', ?, ?, 'online')`, body.PersonID, now, now)
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"ok": "true"})
}

// GET /api/persons
func (s *Server) apiPersonsList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet || r.URL.Path != "/api/persons" {
		http.NotFound(w, r)
		return
	}
	if s.db == nil {
		writeJSONError(w, "db not configured", http.StatusServiceUnavailable)
		return
	}
	rows, err := s.db.Query(`
		SELECT id, company_id, type, name, host, capabilities_json, max_concurrency, version, last_seen_at, status, last_heartbeat
		FROM persons ORDER BY last_seen_at DESC
	`)
	if err != nil {
		writeJSONError(w, "db", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	var list []map[string]any
	for rows.Next() {
		var id, companyID, ptype, name, host, caps, version, lastSeen, status, lastHeartbeat string
		var maxConcurrency int
		if err := rows.Scan(&id, &companyID, &ptype, &name, &host, &caps, &maxConcurrency, &version, &lastSeen, &status, &lastHeartbeat); err != nil {
			continue
		}
		list = append(list, map[string]any{
			"id": id, "company_id": companyID, "type": ptype, "name": name, "host": host,
			"capabilities_json": caps, "max_concurrency": maxConcurrency, "version": version,
			"last_seen_at": lastSeen, "status": status, "last_heartbeat": lastHeartbeat,
		})
	}
	writeJSON(w, list)
}

// POST /api/workers/bind
func (s *Server) apiWorkersBind(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost || r.URL.Path != "/api/workers/bind" {
		http.NotFound(w, r)
		return
	}
	if s.db == nil {
		writeJSONError(w, "db not configured", http.StatusServiceUnavailable)
		return
	}
	var body struct {
		AgentID        string `json:"agent_id"`
		PersonID       string `json:"person_id"`
		DeptID         string `json:"dept_id"`
		CompanyID      string `json:"company_id"`
		MaxConcurrency int    `json:"max_concurrency"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSONError(w, "invalid body", http.StatusBadRequest)
		return
	}
	if body.AgentID == "" || body.PersonID == "" {
		writeJSONError(w, "agent_id and person_id required", http.StatusBadRequest)
		return
	}
	if body.CompanyID == "" {
		body.CompanyID = "default"
	}
	if body.MaxConcurrency <= 0 {
		body.MaxConcurrency = 1
	}
	workerID := common.UUID()
	now := time.Now().UTC().Format(time.RFC3339)
	_, err := s.db.Exec(`
		INSERT INTO workers (id, company_id, dept_id, agent_id, person_id, status, max_concurrency, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, 'online', ?, ?, ?)
	`, workerID, body.CompanyID, body.DeptID, body.AgentID, body.PersonID, body.MaxConcurrency, now, now)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE") {
			writeJSONError(w, "agent already bound to a person", http.StatusConflict)
			return
		}
		writeJSONError(w, "db", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
	writeJSON(w, map[string]any{"ok": true, "worker_id": workerID})
}

// POST /api/workers/unbind
func (s *Server) apiWorkersUnbind(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost || r.URL.Path != "/api/workers/unbind" {
		http.NotFound(w, r)
		return
	}
	if s.db == nil {
		writeJSONError(w, "db not configured", http.StatusServiceUnavailable)
		return
	}
	var body struct {
		WorkerID  string `json:"worker_id"`
		AgentID   string `json:"agent_id"`
		PersonID  string `json:"person_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSONError(w, "invalid body", http.StatusBadRequest)
		return
	}
	var res sql.Result
	var err error
	if body.WorkerID != "" {
		res, err = s.db.Exec(`DELETE FROM workers WHERE id = ?`, body.WorkerID)
	} else if body.AgentID != "" && body.PersonID != "" {
		res, err = s.db.Exec(`DELETE FROM workers WHERE agent_id = ? AND person_id = ?`, body.AgentID, body.PersonID)
	} else {
		writeJSONError(w, "worker_id or (agent_id and person_id) required", http.StatusBadRequest)
		return
	}
	if err != nil {
		writeJSONError(w, "db", http.StatusInternalServerError)
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		writeJSONError(w, "not found", http.StatusNotFound)
		return
	}
	writeJSON(w, map[string]string{"ok": "true"})
}

// GET /api/workers?dept=plan|exec&status=...
func (s *Server) apiWorkersList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet || r.URL.Path != "/api/workers" {
		http.NotFound(w, r)
		return
	}
	if s.db == nil {
		writeJSONError(w, "db not configured", http.StatusServiceUnavailable)
		return
	}
	q := r.URL.Query()
	dept := q.Get("dept")
	status := q.Get("status")
	sqlStr := `SELECT w.id, w.company_id, w.dept_id, w.agent_id, w.person_id, w.status, w.max_concurrency, w.current_job_id, w.last_seen_at, w.created_at,
		a.name as agent_name, p.name as person_name, p.last_heartbeat as person_last_heartbeat
		FROM workers w
		LEFT JOIN agents a ON w.agent_id = a.id
		LEFT JOIN persons p ON w.person_id = p.id
		WHERE 1=1`
	args := []any{}
	if dept != "" {
		sqlStr += ` AND w.dept_id = ?`
		args = append(args, dept)
	}
	if status != "" {
		sqlStr += ` AND w.status = ?`
		args = append(args, status)
	}
	sqlStr += ` ORDER BY w.last_seen_at DESC`
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
		var id, companyID, deptID, agentID, personID, wStatus, currentJobID, lastSeen, createdAt string
		var agentName, personName, personHeartbeat sql.NullString
		var maxConcurrency int
		if err := rows.Scan(&id, &companyID, &deptID, &agentID, &personID, &wStatus, &maxConcurrency, &currentJobID, &lastSeen, &createdAt, &agentName, &personName, &personHeartbeat); err != nil {
			continue
		}
		m := map[string]any{"id": id, "company_id": companyID, "dept_id": deptID, "agent_id": agentID, "person_id": personID, "status": wStatus, "max_concurrency": maxConcurrency, "current_job_id": currentJobID, "last_seen_at": lastSeen, "created_at": createdAt}
		if agentName.Valid {
			m["agent_name"] = agentName.String
		}
		if personName.Valid {
			m["person_name"] = personName.String
		}
		if personHeartbeat.Valid {
			m["person_last_heartbeat"] = personHeartbeat.String
		}
		list = append(list, m)
	}
	writeJSON(w, list)
}

func (s *Server) apiPersonsRoutes(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	switch {
	case path == "/api/persons" && r.Method == http.MethodGet:
		s.apiPersonsList(w, r)
	default:
		http.NotFound(w, r)
	}
}

func (s *Server) apiWorkersRoutes(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	switch {
	case path == "/api/workers" && r.Method == http.MethodGet:
		s.apiWorkersList(w, r)
	case path == "/api/workers/bind" && r.Method == http.MethodPost:
		s.apiWorkersBind(w, r)
	case path == "/api/workers/unbind" && r.Method == http.MethodPost:
		s.apiWorkersUnbind(w, r)
	default:
		http.NotFound(w, r)
	}
}
