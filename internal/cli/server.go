package cli

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"github.com/PonyDevAI/Bull-Board/internal/common"
	"github.com/PonyDevAI/Bull-Board/internal/console"
	"github.com/spf13/cobra"
)

func NewServerCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "server",
		Short: "启动 Console 控制台服务（端口 8888）",
		RunE:  runServer,
	}
	return cmd
}

func runServer(cmd *cobra.Command, args []string) error {
	cfg, err := common.LoadServerConfig(prefix)
	if err != nil {
		return err
	}
	if port > 0 {
		cfg.Port = port
	}
	srv := console.NewServer(cfg)
	db, dbPath, err := common.OpenDB(prefix)
	if err == nil {
		defer db.Close()
		srv.SetDB(db, dbPath)
		if err := console.EnsureFirstUser(db, prefix); err != nil {
			return err
		}
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	return srv.ListenAndServe(ctx)
}
