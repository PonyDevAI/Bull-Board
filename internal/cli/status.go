package cli

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/spf13/cobra"
)

func NewStatusCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "status",
		Short: "服务状态与 Panel 地址",
		RunE:  runStatus,
	}
}

func runStatus(cmd *cobra.Command, args []string) error {
	fmt.Println("=== bb status ===")
	fmt.Println("PREFIX:", prefix)
	current := filepath.Join(prefix, "current")
	if fi, err := os.Lstat(current); err == nil && fi.Mode()&os.ModeSymlink != 0 {
		target, _ := os.Readlink(current)
		fmt.Println("Version:", filepath.Base(target))
	} else {
		fmt.Println("Version: 未安装")
	}
	fmt.Println()
	// systemd
	if path, _ := exec.LookPath("systemctl"); path != "" {
		fmt.Println("Services:")
		for _, svc := range []string{"bb", "bb-runner"} {
			out, _ := exec.Command("systemctl", "is-active", svc).Output()
			status := strings.TrimSpace(string(out))
			if status == "" {
				status = "inactive"
			}
			fmt.Printf("  %s: %s\n", svc, status)
		}
	}
	fmt.Println()
	proto := "http"
	configPath := filepath.Join(prefix, "config", "bb.json")
	if data, err := os.ReadFile(configPath); err == nil {
		if strings.Contains(string(data), `"enabled":true`) && strings.Contains(string(data), "tls") {
			proto = "https"
		}
	}
	host := "localhost"
	if h, _ := os.Hostname(); h != "" {
		host = h
	}
	fmt.Println("Panel:", proto+"://"+host+":6666")
	return nil
}
