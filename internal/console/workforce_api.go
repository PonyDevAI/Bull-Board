package console

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/PonyDevAI/Bull-Board/internal/common"
)

type workforceResource struct {
	Table          string
	Path           string
	RequiredFields []string
	SafeDeleteRefs []string
}

var workforceResources = []workforceResource{
	{Table: "roles", Path: "/api/roles", RequiredFields: []string{"home_id", "name", "code"}, SafeDeleteRefs: []string{"workers.role_id"}},
	{Table: "model_profiles", Path: "/api/model-profiles", RequiredFields: []string{"home_id", "name", "provider", "model_name"}, SafeDeleteRefs: []string{"agent_apps.default_model_profile_id"}},
	{Table: "integration_instances", Path: "/api/integrations", RequiredFields: []string{"home_id", "connector_code", "name", "status"}, SafeDeleteRefs: []string{"execution_backends.integration_instance_id"}},
	{Table: "agent_apps", Path: "/api/agent-apps", RequiredFields: []string{"home_id", "name"}, SafeDeleteRefs: []string{"workers.agent_app_id"}},
	{Table: "execution_backends", Path: "/api/execution-backends", RequiredFields: []string{"home_id", "name", "connector_code", "type", "endpoint_url", "status"}, SafeDeleteRefs: []string{"workers.execution_backend_id", "agent_apps.default_execution_backend_id"}},
	{Table: "workers", Path: "/api/workers", RequiredFields: []string{"home_id", "workspace_id", "group_id", "role_id", "agent_app_id", "execution_backend_id", "name", "status"}},
}

func (s *Server) apiWorkforceRoutes(w http.ResponseWriter, r *http.Request) {
	if s.db == nil {
		writeJSONError(w, "db not configured", http.StatusServiceUnavailable)
		return
	}
	for _, resource := range workforceResources {
		if r.URL.Path == resource.Path || strings.HasPrefix(r.URL.Path, resource.Path+"/") {
			s.handleResource(w, r, resource)
			return
		}
	}
	http.NotFound(w, r)
}

func (s *Server) handleResource(w http.ResponseWriter, r *http.Request, resource workforceResource) {
	if r.URL.Path == resource.Path {
		switch r.Method {
		case http.MethodGet:
			s.resourceList(w, resource)
		case http.MethodPost:
			s.resourceCreate(w, r, resource)
		default:
			http.Error(w, "", http.StatusMethodNotAllowed)
		}
		return
	}
	id := strings.TrimPrefix(r.URL.Path, resource.Path+"/")
	if id == "" || strings.Contains(id, "/") {
		http.NotFound(w, r)
		return
	}
	switch r.Method {
	case http.MethodGet:
		s.resourceGet(w, resource, id)
	case http.MethodPatch:
		s.resourceUpdate(w, r, resource, id)
	case http.MethodDelete:
		s.resourceDelete(w, resource, id)
	default:
		http.Error(w, "", http.StatusMethodNotAllowed)
	}
}

func (s *Server) resourceList(w http.ResponseWriter, resource workforceResource) {
	rows, err := s.db.Query("SELECT * FROM " + resource.Table + " ORDER BY created_at DESC")
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
}

func (s *Server) resourceGet(w http.ResponseWriter, resource workforceResource, id string) {
	rows, err := s.db.Query("SELECT * FROM "+resource.Table+" WHERE id = ?", id)
	if err != nil {
		writeJSONError(w, "db", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	items, err := scanRows(rows)
	if err != nil || len(items) == 0 {
		writeJSONError(w, "not found", http.StatusNotFound)
		return
	}
	writeJSON(w, map[string]any{"item": items[0]})
}

func (s *Server) resourceCreate(w http.ResponseWriter, r *http.Request, resource workforceResource) {
	payload := map[string]any{}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSONError(w, "invalid body", http.StatusBadRequest)
		return
	}
	for _, f := range resource.RequiredFields {
		if strings.TrimSpace(asString(payload[f])) == "" {
			writeJSONError(w, f+" required", http.StatusBadRequest)
			return
		}
	}
	if resource.Table == "workers" {
		if _, ok := payload["max_concurrency"]; !ok {
			payload["max_concurrency"] = 1
		}
	}
	now := time.Now().UTC().Format(time.RFC3339)
	payload["id"] = common.UUID()
	payload["created_at"] = now
	payload["updated_at"] = now
	columns := make([]string, 0, len(payload))
	values := make([]any, 0, len(payload))
	marks := make([]string, 0, len(payload))
	for k, v := range payload {
		columns = append(columns, k)
		values = append(values, v)
		marks = append(marks, "?")
	}
	query := "INSERT INTO " + resource.Table + " (" + strings.Join(columns, ",") + ") VALUES (" + strings.Join(marks, ",") + ")"
	if _, err := s.db.Exec(query, values...); err != nil {
		writeJSONError(w, "db", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
	writeJSON(w, map[string]any{"item": payload})
}

func (s *Server) resourceUpdate(w http.ResponseWriter, r *http.Request, resource workforceResource, id string) {
	payload := map[string]any{}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSONError(w, "invalid body", http.StatusBadRequest)
		return
	}
	delete(payload, "id")
	delete(payload, "created_at")
	if len(payload) == 0 {
		writeJSONError(w, "no fields to update", http.StatusBadRequest)
		return
	}
	payload["updated_at"] = time.Now().UTC().Format(time.RFC3339)
	sets := make([]string, 0, len(payload))
	values := make([]any, 0, len(payload)+1)
	for k, v := range payload {
		sets = append(sets, k+" = ?")
		values = append(values, v)
	}
	values = append(values, id)
	res, err := s.db.Exec("UPDATE "+resource.Table+" SET "+strings.Join(sets, ",")+" WHERE id = ?", values...)
	if err != nil {
		writeJSONError(w, "db", http.StatusInternalServerError)
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		writeJSONError(w, "not found", http.StatusNotFound)
		return
	}
	s.resourceGet(w, resource, id)
}

func (s *Server) resourceDelete(w http.ResponseWriter, resource workforceResource, id string) {
	for _, ref := range resource.SafeDeleteRefs {
		parts := strings.Split(ref, ".")
		var n int
		_ = s.db.QueryRow("SELECT COUNT(1) FROM "+parts[0]+" WHERE "+parts[1]+" = ?", id).Scan(&n)
		if n > 0 {
			writeJSONError(w, "resource in use", http.StatusConflict)
			return
		}
	}
	res, err := s.db.Exec("DELETE FROM "+resource.Table+" WHERE id = ?", id)
	if err != nil {
		writeJSONError(w, "db", http.StatusInternalServerError)
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		writeJSONError(w, "not found", http.StatusNotFound)
		return
	}
	writeJSON(w, map[string]any{"ok": true})
}

func scanRows(rows *sql.Rows) ([]map[string]any, error) {
	cols, err := rows.Columns()
	if err != nil {
		return nil, err
	}
	items := []map[string]any{}
	for rows.Next() {
		vals := make([]any, len(cols))
		ptrs := make([]any, len(cols))
		for i := range vals {
			ptrs[i] = &vals[i]
		}
		if err := rows.Scan(ptrs...); err != nil {
			return nil, err
		}
		item := map[string]any{}
		for i, c := range cols {
			if b, ok := vals[i].([]byte); ok {
				item[c] = string(b)
			} else {
				item[c] = vals[i]
			}
		}
		items = append(items, item)
	}
	return items, nil
}

func asString(v any) string {
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}
