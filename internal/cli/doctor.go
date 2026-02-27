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
	fmt.Println("PORT:  ", port)
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
	url := fmt.Sprintf("http://127.0.0.1:%d/api/health", port)
	resp, err := http.Get(url)
	if err != nil {
		fmt.Printf("API (%d): 未响应\n", port)
		return nil
	}
	resp.Body.Close()
	if resp.StatusCode == 200 {
		fmt.Printf("API (%d): OK\n", port)
	} else {
		fmt.Printf("API (%d): %d\n", port, resp.StatusCode)
	}
	return nil
}
