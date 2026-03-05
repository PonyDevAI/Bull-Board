package cli

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/spf13/cobra"
)

// findInstallSh 查找 install.sh：BB_INSTALL_SH > prefix/bin/install.sh > 可执行文件相对路径 infra/deploy/install.sh
func findInstallSh() (string, error) {
	if p := os.Getenv("BB_INSTALL_SH"); p != "" {
		if st, err := os.Stat(p); err == nil && !st.IsDir() {
			return p, nil
		}
	}
	p := filepath.Join(prefix, "bin", "install.sh")
	if st, err := os.Stat(p); err == nil && !st.IsDir() {
		return p, nil
	}
	exe, err := os.Executable()
	if err != nil {
		return "", err
	}
	exeDir := filepath.Dir(exe)
	// 仓库内：bb 在根或 bin，install.sh 在 infra/deploy/
	for _, rel := range []string{"infra/deploy/install.sh", "../infra/deploy/install.sh", "../../infra/deploy/install.sh"} {
		candidate := filepath.Join(exeDir, rel)
		candidate = filepath.Clean(candidate)
		if st, err := os.Stat(candidate); err == nil && !st.IsDir() {
			return candidate, nil
		}
	}
	return "", fmt.Errorf("未找到 install.sh（可设 BB_INSTALL_SH 或先通过 curl|bash 安装一次）")
}

func NewUpgradeCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "upgrade [all|console|person]",
		Short: "升级（委托 install.sh，默认 all）",
		Long:  "从当前仓库或 prefix/bin 的 install.sh 执行升级。",
		RunE:  runUpgrade,
	}
}

func runUpgrade(cmd *cobra.Command, args []string) error {
	component := "all"
	if len(args) > 0 {
		component = args[0]
	}
	installSh, err := findInstallSh()
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		fmt.Fprintln(os.Stderr, "或运行: curl -fsSL https://raw.githubusercontent.com/PonyDevAI/Bull-Board/main/infra/deploy/install.sh | bash -s upgrade --prefix", prefix)
		os.Exit(1)
	}
	mode := getEnv("MODE", "local")
	version := getEnv("VERSION", "latest")
	bash, _ := exec.LookPath("bash")
	if bash == "" {
		return fmt.Errorf("需要 bash 执行 install.sh")
	}
	c := exec.Command(bash, installSh, "upgrade", "--mode", mode, "--prefix", prefix, "--component", component, "--version", version, "--from-repo")
	c.Env = append(os.Environ(), "PREFIX="+prefix, "MODE="+mode, "VERSION="+version, "COMPONENT="+component)
	c.Stdin = os.Stdin
	c.Stdout = os.Stdout
	c.Stderr = os.Stderr
	return c.Run()
}

func NewUninstallCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "uninstall",
		Short: "卸载（委托 install.sh，默认保留 data）",
		Long:  "停止并移除 systemd 服务与 current 链接；加 --purge-data 会删除 data/、config/、versions/。完全卸掉还需手动删除二进制：rm -f /usr/local/bin/bb /usr/local/bin/bb-person",
		RunE:  runUninstall,
	}
	cmd.Flags().Bool("purge-data", false, "同时删除 data、config、versions 目录")
	return cmd
}

func runUninstall(cmd *cobra.Command, args []string) error {
	installSh, err := findInstallSh()
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		fmt.Fprintln(os.Stderr, "或运行: curl -fsSL https://raw.githubusercontent.com/PonyDevAI/Bull-Board/main/infra/deploy/install.sh | bash -s uninstall --prefix", prefix)
		os.Exit(1)
	}
	bash, _ := exec.LookPath("bash")
	if bash == "" {
		return fmt.Errorf("需要 bash 执行 install.sh")
	}
	argsRun := []string{installSh, "uninstall", "--prefix", prefix}
	purge, _ := cmd.Flags().GetBool("purge-data")
	if purge {
		argsRun = append(argsRun, "--purge-data")
	}
	c := exec.Command(bash, argsRun...)
	c.Env = append(os.Environ(), "PREFIX="+prefix)
	if purge {
		c.Env = append(c.Env, "PURGE_DATA=true")
	}
	c.Stdin = os.Stdin
	c.Stdout = os.Stdout
	c.Stderr = os.Stderr
	return c.Run()
}
