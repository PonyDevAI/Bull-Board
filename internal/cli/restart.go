package cli

import (
	"fmt"
	"os/exec"

	"github.com/spf13/cobra"
)

func NewRestartCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "restart [control|runner|all]",
		Short: "重启服务",
		RunE:  runRestart,
	}
}

func runRestart(cmd *cobra.Command, args []string) error {
	which := "all"
	if len(args) > 0 {
		which = args[0]
	}
	var svcs []string
	switch which {
	case "all":
		svcs = []string{"bb", "bb-runner"}
	case "control":
		svcs = []string{"bb"}
	case "runner":
		svcs = []string{"bb-runner"}
	default:
		return fmt.Errorf("用法: bb restart [control|runner|all]")
	}
	for _, s := range svcs {
		if err := exec.Command("systemctl", "restart", s).Run(); err != nil {
			return err
		}
		fmt.Println("已重启", s)
	}
	return nil
}
