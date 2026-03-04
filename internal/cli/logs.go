package cli

import (
	"fmt"
	"os/exec"

	"github.com/spf13/cobra"
)

var logsFollow bool
var logsLines int

func NewLogsCmd() *cobra.Command {
	cc := &cobra.Command{
		Use:   "logs [console|runner]",
		Short: "查看服务日志（journalctl）",
		RunE:  runLogs,
	}
	cc.Flags().BoolVarP(&logsFollow, "follow", "f", false, "持续输出")
	cc.Flags().IntVar(&logsLines, "lines", 100, "显示行数")
	return cc
}

func runLogs(c *cobra.Command, args []string) error {
	which := "bb"
	if len(args) > 0 {
		switch args[0] {
		case "runner":
			which = "bb-runner"
		case "console":
			which = "bb"
		default:
			which = "bb"
		}
	}
	argsExec := []string{"-u", which, "-n", fmt.Sprintf("%d", logsLines), "--no-pager"}
	if logsFollow {
		argsExec = append(argsExec, "-f")
	}
	ex := exec.Command("systemctl", argsExec...)
	ex.Stdout = c.OutOrStdout()
	ex.Stderr = c.ErrOrStderr()
	return ex.Run()
}
