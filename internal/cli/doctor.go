package cli

import (
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/spf13/cobra"
)

func NewDoctorCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "doctor",
		Short: "环境检查",
		RunE:  runDoctor,
	}
}

func runDoctor(cmd *cobra.Command, args []string) error {
	fmt.Println("=== bb doctor ===")
	fmt.Println("PREFIX:", prefix)
	fmt.Println("PORT:  6666")
	current := filepath.Join(prefix, "current")
	if fi, err := os.Lstat(current); err == nil && fi.Mode()&os.ModeSymlink != 0 {
		target, _ := os.Readlink(current)
		fmt.Println("current ->", target)
	} else {
		fmt.Println("current: 未安装或非符号链接")
	}
	fmt.Println("---")
	if path, _ := exec.LookPath("systemctl"); path != "" {
		out, _ := exec.Command("systemctl", "--version").Output()
		fmt.Println("systemd:", strings.Split(string(out), "\n")[0])
		for _, svc := range []string{"bb", "bb-runner"} {
			out, _ := exec.Command("systemctl", "is-active", svc).Output()
			st := strings.TrimSpace(string(out))
			if st == "" {
				st = "inactive"
			}
			fmt.Printf("%s: %s\n", svc, st)
		}
	}
	// API
	resp, err := http.Get("http://127.0.0.1:6666/api/health")
	if err != nil {
		fmt.Println("API (6666): 未响应")
		return nil
	}
	resp.Body.Close()
	if resp.StatusCode == 200 {
		fmt.Println("API (6666): OK")
	} else {
		fmt.Println("API (6666):", resp.StatusCode)
	}
	return nil
}
