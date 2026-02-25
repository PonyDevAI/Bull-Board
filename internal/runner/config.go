package runner

import (
	"os"
)

type Config struct {
	APIBaseURL string
	RunnerID   string
	Interval   int
}

func LoadConfig(prefix string) Config {
	if prefix == "" {
		prefix = os.Getenv("PREFIX")
	}
	if prefix == "" {
		prefix = "/opt/bull-board"
	}
	c := Config{
		APIBaseURL: os.Getenv("API_BASE_URL"),
		RunnerID:   os.Getenv("RUNNER_ID"),
		Interval:   30,
	}
	if c.APIBaseURL == "" {
		c.APIBaseURL = "http://127.0.0.1:6666"
	}
	if c.RunnerID == "" {
		c.RunnerID = "runner-1"
	}
	return c
}
