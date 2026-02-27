// bb-runner：Runner/Worker Plane，与 control 通信（heartbeat/poll/report）
package main

import (
	"os"

	"github.com/PonyDevAI/Bull-Board/internal/runner"
)

func main() {
	prefix := os.Getenv("PREFIX")
	if prefix == "" {
		prefix = "/opt/bull-board"
	}
	cfg := runner.LoadConfig(prefix)
	runner.Run(cfg)
}
