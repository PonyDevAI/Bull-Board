package control

import (
	"encoding/json"
	"net/http"
	"strings"
)

func getSessionID(r *http.Request) string {
	c, _ := r.Cookie(sessionCookieName)
	if c != nil {
		return strings.TrimSpace(c.Value)
	}
	return ""
}

func getAPIKey(r *http.Request) string {
	if s := r.Header.Get("Authorization"); strings.HasPrefix(s, "Bearer ") {
		return strings.TrimSpace(strings.TrimPrefix(s, "Bearer "))
	}
	if s := r.Header.Get("X-API-Key"); s != "" {
		return strings.TrimSpace(s)
	}
	return ""
}

// authRequired 要求 session 或 API key 任一通过；若未通过写 401 并返回 false
func (s *Server) authRequired(w http.ResponseWriter, r *http.Request) bool {
	if s.db == nil {
		writeJSONError(w, "auth not configured", http.StatusServiceUnavailable)
		return false
	}
	sid := getSessionID(r)
	if sid != "" {
		if username, ok := ValidateSession(s.db, sid); ok {
			r.Header.Set("X-BB-User", username)
			return true
		}
	}
	key := getAPIKey(r)
	if key != "" && ValidateAPIKey(s.db, key) {
		return true
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusUnauthorized)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": "unauthorized"})
	return false
}

// sessionRequired 仅要求 session（用于 SSE）；未通过写 401 并返回 false
func (s *Server) sessionRequired(w http.ResponseWriter, r *http.Request) bool {
	if s.db == nil {
		writeJSONError(w, "auth not configured", http.StatusServiceUnavailable)
		return false
	}
	sid := getSessionID(r)
	if sid == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "unauthorized"})
		return false
	}
	if username, ok := ValidateSession(s.db, sid); ok {
		r.Header.Set("X-BB-User", username)
		return true
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusUnauthorized)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": "unauthorized"})
	return false
}

func (s *Server) authLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost || r.URL.Path != "/api/auth/login" {
		http.NotFound(w, r)
		return
	}
	if s.db == nil {
		writeJSONError(w, "auth not configured", http.StatusServiceUnavailable)
		return
	}
	var body struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Username == "" || body.Password == "" {
		writeJSONError(w, "username and password required", http.StatusBadRequest)
		return
	}
	sessionID, err := LoginUser(s.db, body.Username, body.Password)
	if err != nil {
		writeJSONError(w, "invalid credentials", http.StatusUnauthorized)
		return
	}
	prefix := s.cfg.Prefix
	if prefix == "" {
		prefix = "/opt/bull-board"
	}
	DeleteInitialCredentials(prefix)
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    sessionID,
		Path:     "/",
		MaxAge:   int(sessionTTL.Seconds()),
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
	writeJSON(w, map[string]any{"username": body.Username})
}

func (s *Server) authLogout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost || r.URL.Path != "/api/auth/logout" {
		http.NotFound(w, r)
		return
	}
	sid := getSessionID(r)
	if sid != "" && s.db != nil {
		_ = LogoutUser(s.db, sid)
	}
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
	writeJSON(w, map[string]string{"ok": "true"})
}

func (s *Server) authMe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet || r.URL.Path != "/api/auth/me" {
		http.NotFound(w, r)
		return
	}
	if !s.authRequired(w, r) {
		return
	}
	username := r.Header.Get("X-BB-User")
	writeJSON(w, map[string]any{"username": username})
}
