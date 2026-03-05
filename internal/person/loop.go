package person

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"sync"
	"time"
)

// Run：register -> heartbeat loop -> pull loop（双信号量 + 独立 workdir 执行）
func Run(cfg Config) {
	client := &http.Client{Timeout: 15 * time.Second}
	if err := doRegister(client, cfg); err != nil {
		slog.Warn("register failed", "err", err)
	}
	// 全局 person 级信号量
	personSem := make(chan struct{}, cfg.MaxConcurrency)
	if cfg.MaxConcurrency <= 0 {
		personSem = make(chan struct{}, 1)
	}
	// 每 worker 信号量（worker_id -> chan，默认容量 1）
	workerSems := &workerSemMap{m: make(map[string]chan struct{})}
	// heartbeat 循环
	go func() {
		heartbeatTicker := time.NewTicker(time.Duration(cfg.Interval) * time.Second)
		defer heartbeatTicker.Stop()
		for range heartbeatTicker.C {
			doHeartbeat(client, cfg)
		}
	}()
	// pull 循环
	pullTicker := time.NewTicker(5 * time.Second)
	defer pullTicker.Stop()
	for range pullTicker.C {
		jobs := doPull(client, cfg)
		for _, job := range jobs {
			job := job
			go func() {
				personSem <- struct{}{}
				defer func() { <-personSem }()
				runJob(context.Background(), client, cfg, job, workerSems)
			}()
		}
	}
}

type workerSemMap struct {
	mu sync.Mutex
	m  map[string]chan struct{}
}

func (w *workerSemMap) acquire(workerID string) {
	w.mu.Lock()
	ch, ok := w.m[workerID]
	if !ok {
		ch = make(chan struct{}, 1)
		w.m[workerID] = ch
	}
	w.mu.Unlock()
	ch <- struct{}{}
}

func (w *workerSemMap) release(workerID string) {
	w.mu.Lock()
	ch := w.m[workerID]
	w.mu.Unlock()
	if ch != nil {
		<-ch
	}
}

func doRegister(client *http.Client, cfg Config) error {
	body, _ := json.Marshal(map[string]any{
		"person_id":        cfg.PersonID,
		"company_id":       "default",
		"name":             cfg.PersonID,
		"host":             hostname(),
		"max_concurrency": cfg.MaxConcurrency,
		"version":          "1.0",
		"type":             "self",
	})
	req, _ := http.NewRequest(http.MethodPost, cfg.APIBaseURL+"/api/persons/register", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if cfg.PersonAPIKey != "" {
		req.Header.Set("X-API-Key", cfg.PersonAPIKey)
	}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("register status %d", resp.StatusCode)
	}
	slog.Info("registered", "person_id", cfg.PersonID)
	return nil
}

func hostname() string {
	h, _ := os.Hostname()
	if h == "" {
		return "local"
	}
	return h
}

func doHeartbeat(client *http.Client, cfg Config) {
	body, _ := json.Marshal(map[string]string{"person_id": cfg.PersonID})
	req, _ := http.NewRequest(http.MethodPost, cfg.APIBaseURL+"/api/persons/heartbeat", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if cfg.PersonAPIKey != "" {
		req.Header.Set("X-API-Key", cfg.PersonAPIKey)
	}
	resp, err := client.Do(req)
	if err != nil {
		slog.Warn("heartbeat", "err", err)
		return
	}
	resp.Body.Close()
}

func doPull(client *http.Client, cfg Config) (jobs []map[string]any) {
	url := cfg.APIBaseURL + "/api/person/pull?person_id=" + cfg.PersonID + "&limit=2"
	req, _ := http.NewRequest(http.MethodGet, url, nil)
	if cfg.PersonAPIKey != "" {
		req.Header.Set("X-API-Key", cfg.PersonAPIKey)
	}
	resp, err := client.Do(req)
	if err != nil {
		slog.Warn("pull", "err", err)
		return nil
	}
	defer resp.Body.Close()
	var out struct {
		Jobs []map[string]any `json:"jobs"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil
	}
	return out.Jobs
}

func runJob(ctx context.Context, client *http.Client, cfg Config, job map[string]any, workerSems *workerSemMap) {
	jobID, _ := job["id"].(string)
	runID, _ := job["run_id"].(string)
	assignedWorkerID, _ := job["assigned_worker_id"].(string)
	mode, _ := job["mode"].(string)
	payload, _ := job["payload"].(map[string]any)
	if jobID == "" {
		return
	}
	workerSems.acquire(assignedWorkerID)
	defer workerSems.release(assignedWorkerID)
	workDir := filepath.Join(cfg.WorkDirBase, runID, jobID)
	_ = os.MkdirAll(workDir, 0755)
	defer os.RemoveAll(workDir)
	timeout := 30 * time.Minute
	if t, ok := payload["timeout_sec"].(float64); ok && t > 0 {
		timeout = time.Duration(t) * time.Second
	}
	runCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	var status, summary, logs string
	if mode == "VERIFY" && payload != nil {
		if cmds, ok := payload["verify"].(map[string]any); ok {
			if cmdList, ok := cmds["commands"].([]any); ok && len(cmdList) > 0 {
				var args []string
				for _, c := range cmdList {
					if s, ok := c.(string); ok {
						args = append(args, s)
					}
				}
				if len(args) > 0 {
					cmd := exec.CommandContext(runCtx, args[0], args[1:]...)
					cmd.Dir = workDir
					out, err := cmd.CombinedOutput()
					logs = string(out)
					if err != nil {
						status = "failed"
						summary = err.Error()
					} else {
						status = "succeeded"
						summary = "ok"
					}
				}
			}
		}
	}
	if status == "" {
		cmd := exec.CommandContext(runCtx, "sh", "-c", "echo ok")
		cmd.Dir = workDir
		out, err := cmd.CombinedOutput()
		logs = string(out)
		if err != nil {
			status = "failed"
			summary = err.Error()
		} else {
			status = "succeeded"
			summary = "ok"
		}
	}
	doJobReport(client, cfg, jobID, status, summary, logs)
}

func doJobReport(client *http.Client, cfg Config, jobID, status, summary, logs string) {
	body, _ := json.Marshal(map[string]any{
		"status":  status,
		"summary": summary,
		"logs":    logs,
	})
	url := cfg.APIBaseURL + "/api/jobs/" + jobID + "/report"
	req, _ := http.NewRequest(http.MethodPost, url, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if cfg.PersonAPIKey != "" {
		req.Header.Set("X-API-Key", cfg.PersonAPIKey)
	}
	resp, err := client.Do(req)
	if err != nil {
		slog.Warn("report", "job_id", jobID, "err", err)
		return
	}
	resp.Body.Close()
	slog.Info("reported", "job_id", jobID, "status", status)
}
