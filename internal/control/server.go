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
	// API 子路径在 apiRouter 中已处理，这里只处理 workspaces/tasks/runner 和静态
	if strings.HasPrefix(path, "/api/workspaces") {
		s.apiWorkspaces(w, r)
		return
	}
	if strings.HasPrefix(path, "/api/tasks") {
		s.apiTasks(w, r)
		return
	}
	if strings.HasPrefix(path, "/api/runner/") {
		s.runnerRoutes(w, r)
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

// runnerRoutes 分发 /api/runner/*
func (s *Server) runnerRoutes(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	switch {
	case path == "/api/runner/heartbeat" && r.Method == http.MethodPost:
		s.runnerHeartbeat(w, r)
	case path == "/api/runner/poll":
		s.runnerPoll(w, r)
	case path == "/api/runner/report" && r.Method == http.MethodPost:
		s.runnerReport(w, r)
	default:
		http.NotFound(w, r)
	}
}

// apiRouter 处理所有 /api/* 请求：鉴权 + 路由
func (s *Server) apiRouter(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	// 放行
	if path == "/api/health" || path == "/health" {
		s.health(w, r)
		return
	}
	if path == "/api/auth/login" && r.Method == http.MethodPost {
		s.authLogin(w, r)
		return
	}
	if path == "/api/auth/logout" && r.Method == http.MethodPost {
		s.authLogout(w, r)
		return
	}
	// SSE 仅 session
	if path == "/api/events" {
		if !s.sessionRequired(w, r) {
			return
		}
		s.events(w, r)
		return
	}
	// 以下需要 session 或 API key
	if path == "/api/auth/me" && r.Method == http.MethodGet {
		s.authMe(w, r)
		return
	}
	if path == "/api/api-keys" {
		if r.Method == http.MethodGet {
			s.apiKeysList(w, r)
			return
		}
		if r.Method == http.MethodPost {
			s.apiKeysCreate(w, r)
			return
		}
		http.Error(w, "", http.StatusMethodNotAllowed)
		return
	}
	if strings.HasPrefix(path, "/api/api-keys/") {
		rest := strings.TrimPrefix(path, "/api/api-keys/")
		parts := strings.SplitN(rest, "/", 2)
		id := parts[0]
		if id == "" {
			http.NotFound(w, r)
			return
		}
		if len(parts) > 1 && parts[1] == "revoke" && r.Method == http.MethodPost {
			s.apiKeysRevoke(w, r)
			return
		}
		if len(parts) == 1 && r.Method == http.MethodDelete {
			s.apiKeysDelete(w, r)
			return
		}
		http.NotFound(w, r)
		return
	}
	if path == "/api/system/version" && r.Method == http.MethodGet {
		s.systemVersion(w, r)
		return
	}
	if path == "/api/system/update" && r.Method == http.MethodGet {
		s.systemUpdate(w, r)
		return
	}
	if path == "/api/system/update/ignore" && r.Method == http.MethodPost {
		s.systemUpdateIgnore(w, r)
		return
	}
	if path == "/api/system/upgrade/plan" && r.Method == http.MethodPost {
		s.systemUpgradePlan(w, r)
		return
	}
	// workspaces, tasks, runner 等需鉴权后交给 staticOrSPA 内部分发
	if strings.HasPrefix(path, "/api/") {
		if !s.authRequired(w, r) {
			return
		}
		s.staticOrSPA(w, r)
		return
	}
	s.staticOrSPA(w, r)
}

func (s *Server) rootHandler(w http.ResponseWriter, r *http.Request) {
	s.staticOrSPA(w, r)
}

// ListenAndServe 根据配置启动 HTTP 或 HTTPS
func (s *Server) ListenAndServe(ctx context.Context) error {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/health", s.health)
	mux.HandleFunc("/health", s.health)
	mux.HandleFunc("/api/", s.apiRouter)
	mux.HandleFunc("/", s.rootHandler)

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
