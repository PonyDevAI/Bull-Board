package control

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/PonyDevAI/Bull-Board/internal/common"
)

func (s *Server) apiKeysList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet || r.URL.Path != "/api/api-keys" {
		http.NotFound(w, r)
		return
	}
	if !s.authRequired(w, r) {
		return
	}
	rows, err := s.db.Query(`SELECT id, name, key_prefix, created_at, last_used_at, revoked_at FROM api_keys ORDER BY created_at DESC`)
	if err != nil {
		writeJSONError(w, "db", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	var list []map[string]any
	for rows.Next() {
		var id, name, prefix, createdAt string
		var lastUsed, revokedAt sql.NullString
		if err := rows.Scan(&id, &name, &prefix, &createdAt, &lastUsed, &revokedAt); err != nil {
			continue
		}
		m := map[string]any{"id": id, "name": name, "prefix": prefix, "createdAt": createdAt}
		if lastUsed.Valid {
			m["lastUsedAt"] = lastUsed.String
		}
		if revokedAt.Valid {
			m["revokedAt"] = revokedAt.String
		}
		list = append(list, m)
	}
	writeJSON(w, list)
}

func (s *Server) apiKeysCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost || r.URL.Path != "/api/api-keys" {
		http.NotFound(w, r)
		return
	}
	if !s.authRequired(w, r) {
		return
	}
	var body struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSONError(w, "name required", http.StatusBadRequest)
		return
	}
	name := strings.TrimSpace(body.Name)
	if name == "" {
		name = "API Key"
	}
	plain, hashHex, prefix, err := GenerateAPIKey()
	if err != nil {
		writeJSONError(w, "generate key failed", http.StatusInternalServerError)
		return
	}
	id := common.UUID()
	now := time.Now().UTC().Format(time.RFC3339)
	_, err = s.db.Exec(`INSERT INTO api_keys (id, name, key_hash, key_prefix, created_at) VALUES (?, ?, ?, ?, ?)`, id, name, hashHex, prefix, now)
	if err != nil {
		writeJSONError(w, "db", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
	writeJSON(w, map[string]any{
		"id": id, "name": name, "prefix": prefix,
		"api_key_plaintext": plain,
		"createdAt":         now,
	})
}

func (s *Server) apiKeysRevoke(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.NotFound(w, r)
		return
	}
	path := r.URL.Path
	if !strings.HasPrefix(path, "/api/api-keys/") {
		http.NotFound(w, r)
		return
	}
	rest := strings.TrimPrefix(path, "/api/api-keys/")
	parts := strings.SplitN(rest, "/", 2)
	id := strings.TrimSuffix(parts[0], "/revoke")
	if id == "" || (len(parts) > 1 && parts[1] != "revoke") {
		http.NotFound(w, r)
		return
	}
	if !s.authRequired(w, r) {
		return
	}
	now := time.Now().UTC().Format(time.RFC3339)
	res, err := s.db.Exec(`UPDATE api_keys SET revoked_at = ? WHERE id = ?`, now, id)
	if err != nil {
		writeJSONError(w, "db", http.StatusInternalServerError)
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		writeJSONError(w, "Not found", http.StatusNotFound)
		return
	}
	writeJSON(w, map[string]string{"ok": "true"})
}

func (s *Server) apiKeysDelete(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.NotFound(w, r)
		return
	}
	path := r.URL.Path
	if !strings.HasPrefix(path, "/api/api-keys/") {
		http.NotFound(w, r)
		return
	}
	rest := strings.TrimPrefix(path, "/api/api-keys/")
	id := strings.SplitN(rest, "/", 2)[0]
	if id == "" {
		http.NotFound(w, r)
		return
	}
	if !s.authRequired(w, r) {
		return
	}
	res, err := s.db.Exec(`DELETE FROM api_keys WHERE id = ?`, id)
	if err != nil {
		writeJSONError(w, "db", http.StatusInternalServerError)
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		writeJSONError(w, "Not found", http.StatusNotFound)
		return
	}
	writeJSON(w, map[string]string{"ok": "true"})
}
