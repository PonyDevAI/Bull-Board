package common

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strconv"
)

// ServerConfig 供 bb server 使用
type ServerConfig struct {
	Port       int
	StaticDir  string
	Prefix     string   // 安装前缀，用于 VERSION、initial_credentials 等
	TLSEnabled bool
	TLSCert    string
	TLSKey     string
}

// LoadServerConfig 从 PREFIX/config/bb.json 或环境变量解析
func LoadServerConfig(prefix string) (*ServerConfig, error) {
	if prefix == "" {
		prefix = getEnv("PREFIX", "/opt/bull-board")
	}
	path := filepath.Join(prefix, "config", "bb.json")
	data, err := os.ReadFile(path)
	if err != nil {
		return defaultServerConfig(prefix), nil
	}
	var out struct {
		Port int `json:"port"`
		TLS  *struct {
			Enabled  bool   `json:"enabled"`
			CertPath string `json:"certPath"`
			KeyPath  string `json:"keyPath"`
		} `json:"tls"`
	}
	if err := json.Unmarshal(data, &out); err != nil {
		return defaultServerConfig(prefix), nil
	}
	cfg := defaultServerConfig(prefix)
	if out.Port > 0 {
		cfg.Port = out.Port
	}
	if out.TLS != nil && out.TLS.Enabled {
		cfg.TLSEnabled = true
		cfg.TLSCert = out.TLS.CertPath
		cfg.TLSKey = out.TLS.KeyPath
	}
	return cfg, nil
}

func defaultServerConfig(prefix string) *ServerConfig {
	port := 8888
	if v := getEnv("PORT", ""); v != "" {
		if p, _ := strconv.Atoi(v); p > 0 {
			port = p
		}
	}
	staticDir := filepath.Join(prefix, "current", "dashboard", "dist")
	if v := getEnv("DASHBOARD_DIST", ""); v != "" {
		staticDir = v
	}
	return &ServerConfig{
		Port:      port,
		StaticDir: staticDir,
		Prefix:    prefix,
	}
}

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
