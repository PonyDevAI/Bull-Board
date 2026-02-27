package cli

import (
	"os"

	"github.com/spf13/cobra"
)

var prefix string
var port int

// NewRootCmd 返回 bb 的根命令
func NewRootCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "bb",
		Short: "Bull Board 管理命令",
		Long:  "bb 提供 server、status、logs、restart、doctor、tls 等运行期管理（安装/升级/卸载由 install.sh 负责）。",
	}
	cmd.PersistentFlags().StringVar(&prefix, "prefix", getEnv("BB_PREFIX", "/opt/bull-board"), "安装前缀")
	cmd.PersistentFlags().IntVar(&port, "port", 8888, "端口（仅 server）")
	cmd.AddCommand(NewServerCmd())
	cmd.AddCommand(NewVersionCmd())
	cmd.AddCommand(NewTLSCmd())
	cmd.AddCommand(NewStatusCmd())
	cmd.AddCommand(NewLogsCmd())
	cmd.AddCommand(NewRestartCmd())
	cmd.AddCommand(NewDoctorCmd())
	return cmd
}

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
