package cli

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"math/big"
	"os"
	"path/filepath"
	"time"

	"github.com/spf13/cobra"
)

func NewTLSCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "tls",
		Short: "TLS 管理（同端口 8888）",
	}
	cmd.AddCommand(NewTLSEnableCmd())
	cmd.AddCommand(NewTLSDisableCmd())
	cmd.AddCommand(NewTLSStatusCmd())
	return cmd
}

func NewTLSEnableCmd() *cobra.Command {
	var selfSigned bool
	var certPath, keyPath string
	cmd := &cobra.Command{
		Use:   "enable",
		Short: "启用 TLS",
		RunE: func(cmd *cobra.Command, args []string) error {
			var cert, key string
			if selfSigned {
				dir := filepath.Join(prefix, "config", "certs")
				if err := os.MkdirAll(dir, 0755); err != nil {
					return err
				}
				cert = filepath.Join(dir, "bb-cert.pem")
				key = filepath.Join(dir, "bb-key.pem")
				if err := generateSelfSigned(cert, key); err != nil {
					return err
				}
			} else if certPath != "" && keyPath != "" {
				cert = certPath
				key = keyPath
			} else {
				return fmt.Errorf("请使用 --self-signed 或 --cert 与 --key")
			}
			return writeTLSConfig(prefix, true, cert, key)
		},
	}
	cmd.Flags().BoolVar(&selfSigned, "self-signed", false, "生成自签证书到 config/certs/")
	cmd.Flags().StringVar(&certPath, "cert", "", "证书路径")
	cmd.Flags().StringVar(&keyPath, "key", "", "私钥路径")
	return cmd
}

func NewTLSDisableCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "disable",
		Short: "关闭 TLS",
		RunE: func(cmd *cobra.Command, args []string) error {
			return writeTLSConfig(prefix, false, "", "")
		},
	}
}

func NewTLSStatusCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "status",
		Short: "查看 TLS 状态",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := filepath.Join(prefix, "config", "bb.json")
			data, err := os.ReadFile(path)
			if err != nil {
				fmt.Println("TLS: 未配置（或未找到 config/bb.json）")
				return nil
			}
			var c struct {
				TLS *struct {
					Enabled  bool   `json:"enabled"`
					CertPath string `json:"certPath"`
					KeyPath  string `json:"keyPath"`
				} `json:"tls"`
			}
			if json.Unmarshal(data, &c) != nil || c.TLS == nil {
				fmt.Println("TLS: 未配置")
				return nil
			}
			if c.TLS.Enabled {
				fmt.Printf("TLS: 已启用\ncert: %s\nkey:  %s\n", c.TLS.CertPath, c.TLS.KeyPath)
			} else {
				fmt.Println("TLS: 已关闭")
			}
			return nil
		},
	}
}

func writeTLSConfig(prefix string, enabled bool, cert, key string) error {
	configPath := filepath.Join(prefix, "config", "bb.json")
	dir := filepath.Dir(configPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}
	var root map[string]any
	if data, err := os.ReadFile(configPath); err == nil {
		_ = json.Unmarshal(data, &root)
	}
	if root == nil {
		root = make(map[string]any)
	}
	tls := map[string]any{"enabled": enabled}
	if enabled {
		tls["certPath"] = cert
		tls["keyPath"] = key
	}
	root["tls"] = tls
	if _, ok := root["port"]; !ok {
		root["port"] = 8888
	}
	data, _ := json.MarshalIndent(root, "", "  ")
	return os.WriteFile(configPath, data, 0644)
}

func generateSelfSigned(certPath, keyPath string) error {
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return err
	}
	template := x509.Certificate{
		SerialNumber:          big.NewInt(1),
		NotBefore:             time.Now(),
		NotAfter:              time.Now().Add(365 * 24 * time.Hour),
		BasicConstraintsValid: true,
	}
	certDER, err := x509.CreateCertificate(rand.Reader, &template, &template, &key.PublicKey, key)
	if err != nil {
		return err
	}
	keyPEM := pem.EncodeToMemory(&pem.Block{Type: "RSA PRIVATE KEY", Bytes: x509.MarshalPKCS1PrivateKey(key)})
	certPEM := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: certDER})
	if err := os.WriteFile(keyPath, keyPEM, 0600); err != nil {
		return err
	}
	return os.WriteFile(certPath, certPEM, 0644)
}

