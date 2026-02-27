package cli

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"github.com/PonyDevAI/Bull-Board/internal/common"
	"github.com/PonyDevAI/Bull-Board/internal/control"
	"github.com/spf13/cobra"
)

func NewServerCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "server",
		Short: "启动 Control Plane 服务（端口 6666）",
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
	srv := control.NewServer(cfg)
	db, dbPath, err := common.OpenDB(prefix)
	if err == nil {
		defer db.Close()
		srv.SetDB(db, dbPath)
		if err := control.EnsureFirstUser(db, prefix); err != nil {
			return err
		}
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	return srv.ListenAndServe(ctx)
}
