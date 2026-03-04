package runner

import (
	"os"
)

type Config struct {
	APIBaseURL    string
	RunnerID      string
	Interval      int
	RunnerAPIKey  string
	MaxConcurrency int  // runner 级并发
	WorkDirBase   string // 每 job 独立 workdir 根目录
}

func LoadConfig(prefix string) Config {
	if prefix == "" {
		prefix = os.Getenv("PREFIX")
	}
	if prefix == "" {
		prefix = "/opt/bull-board"
	}
	c := Config{
		APIBaseURL:     os.Getenv("API_BASE_URL"),
		RunnerID:       os.Getenv("RUNNER_ID"),
		Interval:       30,
		RunnerAPIKey:   os.Getenv("RUNNER_API_KEY"),
		MaxConcurrency: 2,
		WorkDirBase:    os.Getenv("WORK_DIR_BASE"),
	}
	if c.APIBaseURL == "" {
		c.APIBaseURL = "http://127.0.0.1:8888"
	}
	if c.RunnerID == "" {
		c.RunnerID = "runner-1"
	}
	if c.WorkDirBase == "" {
		c.WorkDirBase = "/tmp/bb-runner-work"
	}
	return c
}
