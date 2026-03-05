// bb-person：Person 执行器（原 Runner），与 console 通信（heartbeat/pull/report）
package main

import (
	"os"

	"github.com/PonyDevAI/Bull-Board/internal/person"
)

func main() {
	prefix := os.Getenv("PREFIX")
	if prefix == "" {
		prefix = "/opt/bull-board"
	}
	cfg := person.LoadConfig(prefix)
	person.Run(cfg)
}
