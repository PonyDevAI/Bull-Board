package control

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/trustpoker/bull-borad/internal/common"
)

// Server 提供 /api/health、/api/events(SSE)、静态托管与 SPA fallback
type Server struct {
	cfg      *common.ServerConfig
	startAt  time.Time
	sseConns sync.Map
	db       *sql.DB
	dbPath   string
}

func NewServer(cfg *common.ServerConfig) *Server {
	return &Server{cfg: cfg, startAt: time.Now()}
}

// SetDB 设置可选 DB，health 将检查可用性并报告 db_path
func (s *Server) SetDB(db *sql.DB, dbPath string) {
	s.db = db
	s.dbPath = dbPath
}

func (s *Server) health(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/api/health" && r.URL.Path != "/health" {
		http.NotFound(w, r)
		return
	}
	out := map[string]any{
		"ok":      true,
		"service": "bb",
		"version": Version,
		"uptime":  time.Since(s.startAt).String(),
		"paths":   map[string]string{"api": "/api", "events": "/api/events"},
	}
	if s.dbPath != "" {
		out["db_path"] = s.dbPath
		if s.db != nil {
			if err := s.db.Ping(); err != nil {
				out["db_ok"] = false
				out["db_error"] = err.Error()
			} else {
				out["db_ok"] = true
			}
		}
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(out)
}

func (s *Server) events(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/api/events" {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")
	if flusher, ok := w.(http.Flusher); ok {
		flusher.Flush()
	}
	s.sseConns.Store(&w, struct{}{})
	defer s.sseConns.Delete(&w)
	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-r.Context().Done():
			return
		case <-ticker.C:
			_, _ = w.Write([]byte(": heartbeat\n\n"))
			if flusher, ok := w.(http.Flusher); ok {
				flusher.Flush()
			}
		}
	}
}

func (s *Server) runnerHeartbeat(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost || r.URL.Path != "/api/runner/heartbeat" {
		http.NotFound(w, r)
		return
	}
	var body struct{ RunnerID string `json:"runner_id"` }
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.RunnerID == "" {
		http.Error(w, `{"error":"runner_id required"}`, http.StatusBadRequest)
		return
	}
	if s.db == nil {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{"ok": "true"})
		return
	}
	now := time.Now().UTC().Format(time.RFC3339)
	_, err := s.db.Exec(`INSERT INTO runners (id, last_heartbeat) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET last_heartbeat = excluded.last_heartbeat`, body.RunnerID, now)
	if err != nil {
		slog.Warn("runner heartbeat", "runner_id", body.RunnerID, "err", err)
		http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
		return
	}
	slog.Info("runner heartbeat", "runner_id", body.RunnerID)
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"ok": "true"})
}

func (s *Server) runnerPoll(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/api/runner/poll" {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{"jobs": []any{}})
}

func (s *Server) runnerReport(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost || r.URL.Path != "/api/runner/report" {
		http.NotFound(w, r)
		return
	}
	var body map[string]any
	_ = json.NewDecoder(r.Body).Decode(&body)
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"ok": "true"})
}

func (s *Server) staticOrSPA(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	if path == "" {
		path = "/"
	}
	if strings.HasPrefix(path, "/api/workspaces") {
		s.apiWorkspaces(w, r)
		return
	}
	if strings.HasPrefix(path, "/api/tasks") {
		s.apiTasks(w, r)
		return
	}
	if strings.HasPrefix(path, "/api") {
		http.NotFound(w, r)
		return
	}
	cleanPath := filepath.Clean(path)
	if cleanPath == "." || cleanPath == "/" {
		cleanPath = "index.html"
	} else {
		cleanPath = strings.TrimPrefix(cleanPath, "/")
	}
	fullPath := filepath.Join(s.cfg.StaticDir, cleanPath)
	if _, err := os.Stat(fullPath); err == nil {
		http.ServeFile(w, r, fullPath)
		return
	}
	indexPath := filepath.Join(s.cfg.StaticDir, "index.html")
	if _, err := os.Stat(indexPath); err == nil {
		http.ServeFile(w, r, indexPath)
		return
	}
	http.NotFound(w, r)
}

// ListenAndServe 根据配置启动 HTTP 或 HTTPS
func (s *Server) ListenAndServe(ctx context.Context) error {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/health", s.health)
	mux.HandleFunc("/health", s.health)
	mux.HandleFunc("/api/events", s.events)
	mux.HandleFunc("/api/runner/heartbeat", s.runnerHeartbeat)
	mux.HandleFunc("/api/runner/poll", s.runnerPoll)
	mux.HandleFunc("/api/runner/report", s.runnerReport)
	mux.HandleFunc("/api/workspaces", s.apiWorkspaces)
	mux.HandleFunc("/api/workspaces/", s.apiWorkspaces)
	mux.HandleFunc("/api/tasks", s.apiTasks)
	mux.HandleFunc("/api/tasks/", s.apiTasks)
	mux.HandleFunc("/", s.staticOrSPA)

	addr := listenAddr(s.cfg.Port)
	srv := &http.Server{Addr: addr, Handler: mux}
	go func() {
		<-ctx.Done()
		_ = srv.Shutdown(context.Background())
	}()
	if s.cfg.TLSEnabled && s.cfg.TLSCert != "" && s.cfg.TLSKey != "" {
		slog.Info("bb server TLS", "addr", "https://"+addr)
		return srv.ListenAndServeTLS(s.cfg.TLSCert, s.cfg.TLSKey)
	}
	slog.Info("bb server", "addr", "http://"+addr)
	return srv.ListenAndServe()
}

func listenAddr(port int) string {
	if port <= 0 {
		port = 6666
	}
	return fmt.Sprintf(":%d", port)
}
