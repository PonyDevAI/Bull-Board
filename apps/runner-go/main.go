package main

import (
	"bytes"
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

type Config struct {
	SQLitePath      string
	ArtifactsDir    string
	RunnerID        string
	MaxConcurrency  int
	LeaseSeconds    int
	APIBaseURL      string
	BackoffBaseSecs int
}

func loadConfig() Config {
	c := Config{
		SQLitePath:      getEnv("SQLITE_PATH", "data/bullboard.db"),
		ArtifactsDir:    getEnv("ARTIFACTS_DIR", "artifacts"),
		RunnerID:        getEnv("RUNNER_ID", "runner-1"),
		MaxConcurrency:  1,
		LeaseSeconds:    600,
		APIBaseURL:      getEnv("API_BASE_URL", "http://localhost:3000"),
		BackoffBaseSecs: 30,
	}
	if v := os.Getenv("MAX_CONCURRENCY"); v != "" {
		fmt.Sscanf(v, "%d", &c.MaxConcurrency)
	}
	if v := os.Getenv("LEASE_SECONDS"); v != "" {
		fmt.Sscanf(v, "%d", &c.LeaseSeconds)
	}
	return c
}

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func main() {
	cfg := loadConfig()
	db, err := sql.Open("sqlite", cfg.SQLitePath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "open db: %v\n", err)
		os.Exit(1)
	}
	defer db.Close()

	for {
		claimed, err := claimJob(db, &cfg)
		if err != nil {
			fmt.Fprintf(os.Stderr, "claim: %v\n", err)
			time.Sleep(5 * time.Second)
			continue
		}
		if !claimed {
			time.Sleep(2 * time.Second)
			continue
		}
		// single worker: process one job per loop (run in goroutine if MaxConcurrency > 1 later)
		time.Sleep(100 * time.Millisecond)
	}
}

type JobRow struct {
	ID         string
	RunID      string
	TaskID     string
	WorkspaceID string
	Mode       string
	PayloadJSON string
	Attempts   int
	MaxAttempts int
}

func claimJob(db *sql.DB, cfg *Config) (bool, error) {
	tx, err := db.BeginTx(context.Background(), &sql.TxOptions{})
	if err != nil {
		return false, err
	}
	defer tx.Rollback()

	// SQLite: BEGIN gets a lock; we need to select and update atomically
	now := time.Now().UTC().Format(time.RFC3339)
	leaseUntil := time.Now().Add(time.Duration(cfg.LeaseSeconds) * time.Second).UTC().Format(time.RFC3339)

	var j JobRow
	err = tx.QueryRow(`
		SELECT id, run_id, task_id, workspace_id, mode, payload_json, attempts, max_attempts
		FROM jobs
		WHERE status = 'queued' AND available_at <= ? AND (locked_until IS NULL OR locked_until < ?)
		ORDER BY priority DESC, created_at ASC LIMIT 1
	`, now, now).Scan(&j.ID, &j.RunID, &j.TaskID, &j.WorkspaceID, &j.Mode, &j.PayloadJSON, &j.Attempts, &j.MaxAttempts)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	_, err = tx.Exec(`
		UPDATE jobs SET status = 'running', locked_by = ?, locked_until = ?, attempts = attempts + 1, updated_at = ?
		WHERE id = ?
	`, cfg.RunnerID, leaseUntil, now, j.ID)
	if err != nil {
		return false, err
	}

	_, err = tx.Exec(`UPDATE runs SET status = 'running', started_at = ?, updated_at = ? WHERE id = ?`, now, now, j.RunID)
	if err != nil {
		return false, err
	}

	if err = tx.Commit(); err != nil {
		return false, err
	}

	go runJob(db, cfg, &j)
	return true, nil
}

func runJob(db *sql.DB, cfg *Config, j *JobRow) {
	var payload map[string]interface{}
	if err := json.Unmarshal([]byte(j.PayloadJSON), &payload); err != nil {
		finishJob(db, cfg, j, "failed", "infra_failed", "invalid payload", nil)
		return
	}

	repoPath, _ := payload["workspace"].(map[string]interface{})["repo_path"].(string)
	baseBranch, _ := payload["workspace"].(map[string]interface{})["base_branch"].(string)
	if baseBranch == "" {
		baseBranch = "main"
	}
	branch, _ := payload["branch"].(string)
	if repoPath == "" || branch == "" {
		finishJob(db, cfg, j, "failed", "infra_failed", "missing workspace.repo_path or branch", nil)
		return
	}

	workDir := filepath.Join(cfg.ArtifactsDir, "worktrees", j.RunID)
	artifactsDir := filepath.Join(cfg.ArtifactsDir, j.RunID)
	_ = os.MkdirAll(artifactsDir, 0755)
	_ = os.MkdirAll(filepath.Dir(workDir), 0755)

	// git worktree add (must run from main repo)
	if err := runCmd(repoPath, "git", "worktree", "add", workDir, branch); err != nil {
		// branch might not exist: create from base
		if err2 := runCmd(repoPath, "git", "worktree", "add", "-b", branch, workDir, baseBranch); err2 != nil {
			finishJob(db, cfg, j, "failed", "infra_failed", "git worktree add: "+err.Error(), nil)
			return
		}
	}

	db.Exec("UPDATE runs SET worktree_path = ?, branch_name = ?, updated_at = ? WHERE id = ?", workDir, branch, time.Now().UTC().Format(time.RFC3339), j.RunID)
	defer func() {
		_ = runCmd(repoPath, "git", "worktree", "remove", workDir, "--force")
	}()

	var status, errorKind, summary string
	var artPaths []map[string]string

	artBase := filepath.Join(cfg.ArtifactsDir, j.RunID)
	switch j.Mode {
	case "VERIFY":
		status, errorKind, summary, artPaths = runVerify(payload, workDir, artifactsDir, artBase)
	case "CODE_CHANGE":
		status, errorKind, summary, artPaths = runCodeChange(payload, workDir, artifactsDir, artBase)
	case "SUBMIT":
		status, errorKind, summary, artPaths = runSubmit(payload, workDir, artifactsDir)
	default:
		status, errorKind, summary = "failed", "infra_failed", "unknown mode"
	}

	// write artifacts to DB (uri = relative path for API)
	for _, a := range artPaths {
		db.Exec("INSERT INTO artifacts (id, run_id, type, uri, created_at) VALUES (?, ?, ?, ?, ?)",
			uuidGen(), j.RunID, a["type"], a["path"], time.Now().UTC().Format(time.RFC3339))
	}

	finishJob(db, cfg, j, status, errorKind, summary, artPaths)
}

func runVerify(payload map[string]interface{}, workDir, artifactsDir, artBase string) (status, errorKind, summary string, arts []map[string]string) {
	verify, _ := payload["verify"].(map[string]interface{})
	cmds, _ := verify["commands"].([]interface{})
	if len(cmds) == 0 {
		return "failed", "infra_failed", "no commands", nil
	}
	var buf bytes.Buffer
	for _, c := range cmds {
		cmdStr, _ := c.(string)
		buf.WriteString("$ " + cmdStr + "\n")
		out, err := runCmdOut(workDir, "sh", "-c", cmdStr)
		buf.Write(out)
		if err != nil {
			buf.WriteString("exit code: " + err.Error() + "\n")
			os.WriteFile(filepath.Join(artifactsDir, "log.txt"), buf.Bytes(), 0644)
			return "failed", "test_failed", err.Error(), []map[string]string{{"type": "log", "path": filepath.Join(artBase, "log.txt")}}
		}
	}
	os.WriteFile(filepath.Join(artifactsDir, "log.txt"), buf.Bytes(), 0644)
	os.WriteFile(filepath.Join(artifactsDir, "report.json"), []byte(`{"summary":"ok"}`), 0644)
	diffOut, _ := runCmdOut(workDir, "git", "diff")
	os.WriteFile(filepath.Join(artifactsDir, "diff.txt"), diffOut, 0644)
	return "succeeded", "none", "ok", []map[string]string{
		{"type": "log", "path": filepath.Join(artBase, "log.txt")},
		{"type": "report", "path": filepath.Join(artBase, "report.json")},
		{"type": "diff", "path": filepath.Join(artBase, "diff.txt")},
	}
}

func runCodeChange(payload map[string]interface{}, workDir, artifactsDir, artBase string) (status, errorKind, summary string, arts []map[string]string) {
	cc, _ := payload["code_change"].(map[string]interface{})
	patch, _ := cc["patch"].(string)
	if patch == "" {
		return "failed", "infra_failed", "no patch", nil
	}
	patchPath := filepath.Join(workDir, "apply.patch")
	if err := os.WriteFile(patchPath, []byte(patch), 0644); err != nil {
		return "failed", "infra_failed", err.Error(), nil
	}
	if err := runCmd(workDir, "git", "apply", "apply.patch"); err != nil {
		return "failed", "code_failed", "git apply: "+err.Error(), nil
	}
	diffOut, _ := runCmdOut(workDir, "git", "diff")
	os.WriteFile(filepath.Join(artifactsDir, "diff.txt"), diffOut, 0644)
	return "succeeded", "none", "applied", []map[string]string{{"type": "diff", "path": filepath.Join(artBase, "diff.txt")}}
}

func runSubmit(payload map[string]interface{}, workDir, artifactsDir string) (status, errorKind, summary string, arts []map[string]string) {
	sub, _ := payload["submit"].(map[string]interface{})
	msg, _ := sub["commit_message"].(string)
	if msg == "" {
		msg = "BullBoard: submit"
	}
	remote, _ := sub["remote"].(string)
	if remote == "" {
		remote = "origin"
	}
	if err := runCmd(workDir, "git", "add", "-A"); err != nil {
		return "failed", "infra_failed", "git add: "+err.Error(), nil
	}
	if err := runCmd(workDir, "git", "commit", "-m", msg); err != nil {
		return "failed", "infra_failed", "git commit: "+err.Error(), nil
	}
	if err := runCmd(workDir, "git", "push", remote, payload["branch"].(string)); err != nil {
		return "failed", "infra_failed", "git push: "+err.Error(), nil
	}
	return "succeeded", "none", "pushed", nil
}

func finishJob(db *sql.DB, cfg *Config, j *JobRow, status, errorKind, summary string, artPaths []map[string]string) {
	now := time.Now().UTC().Format(time.RFC3339)
	db.Exec("UPDATE runs SET status = ?, error_kind = ?, error_message = ?, finished_at = ?, updated_at = ? WHERE id = ?",
		status, errorKind, summary, now, now, j.RunID)

	var attempts, maxAttempts int
	db.QueryRow("SELECT attempts, max_attempts FROM jobs WHERE id = ?", j.ID).Scan(&attempts, &maxAttempts)

	if status == "failed" && attempts < maxAttempts {
		backoff := time.Now().Add(time.Duration(cfg.BackoffBaseSecs*attempts) * time.Second).UTC().Format(time.RFC3339)
		db.Exec("UPDATE jobs SET status = 'queued', locked_until = NULL, last_error = ?, available_at = ?, updated_at = ? WHERE id = ?",
			summary, backoff, now, j.ID)
	} else {
		db.Exec("UPDATE jobs SET status = ?, locked_until = NULL, last_error = ?, updated_at = ? WHERE id = ?",
			status, summary, now, j.ID)
	}

	// callback (uri = relative path e.g. artifacts/runId/log.txt)
	arts := make([]struct{ Type string `json:"type"`; Uri string `json:"uri"` }, 0, len(artPaths))
	for _, a := range artPaths {
		arts = append(arts, struct{ Type string `json:"type"`; Uri string `json:"uri"` }{Type: a["type"], Uri: a["path"]})
	}
	body, _ := json.Marshal(map[string]interface{}{
		"run_id":     j.RunID,
		"status":     status,
		"error_kind": errorKind,
		"summary":    summary,
		"artifacts":  arts,
	})
	req, _ := http.NewRequest("POST", strings.TrimSuffix(cfg.APIBaseURL, "/")+"/api/runner/report", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		fmt.Fprintf(os.Stderr, "report callback: %v\n", err)
		return
	}
	defer resp.Body.Close()
}

func runCmd(dir, name string, args ...string) error {
	cmd := exec.Command(name, args...)
	cmd.Dir = dir
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

func runCmdOut(dir, name string, args ...string) ([]byte, error) {
	cmd := exec.Command(name, args...)
	cmd.Dir = dir
	return cmd.CombinedOutput()
}

func uuidGen() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b[0:4]) + "-" + hex.EncodeToString(b[4:6]) + "-" + hex.EncodeToString(b[6:8]) + "-" + hex.EncodeToString(b[8:10]) + "-" + hex.EncodeToString(b[10:16])
}
