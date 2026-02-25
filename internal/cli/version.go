package cli

import (
	"fmt"

	"github.com/trustpoker/bull-borad/internal/control"
	"github.com/spf13/cobra"
)

func NewVersionCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "version",
		Short: "显示版本号",
		Run: func(cmd *cobra.Command, args []string) {
			fmt.Println("bb", control.Version)
		},
	}
}
