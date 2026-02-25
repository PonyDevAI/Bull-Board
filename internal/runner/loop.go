package runner

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"
)

// Run 循环：心跳 + 拉取 + 上报（最小实现）
func Run(cfg Config) {
	client := &http.Client{Timeout: 10 * time.Second}
	heartbeatTicker := time.NewTicker(time.Duration(cfg.Interval) * time.Second)
	defer heartbeatTicker.Stop()
	doHeartbeat(client, cfg)
	for range heartbeatTicker.C {
		doHeartbeat(client, cfg)
	}
}

func doHeartbeat(client *http.Client, cfg Config) {
	body, _ := json.Marshal(map[string]string{"runner_id": cfg.RunnerID})
	req, err := http.NewRequest(http.MethodPost, cfg.APIBaseURL+"/api/runner/heartbeat", bytes.NewReader(body))
	if err != nil {
		slog.Warn("heartbeat request", "err", err)
		return
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := client.Do(req)
	if err != nil {
		slog.Warn("heartbeat", "err", err)
		return
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		slog.Warn("heartbeat", "status", resp.StatusCode)
		return
	}
	slog.Info("heartbeat ok", "runner_id", cfg.RunnerID)
}

func doPoll(client *http.Client, cfg Config) (jobs []map[string]any) {
	resp, err := client.Get(cfg.APIBaseURL + "/api/runner/poll")
	if err != nil {
		slog.Warn("poll", "err", err)
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

func doReport(client *http.Client, baseURL string, payload map[string]any) error {
	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest(http.MethodPost, baseURL+"/api/runner/report", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("report status %d", resp.StatusCode)
	}
	return nil
}
