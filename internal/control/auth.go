package control

import (
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"time"

	"golang.org/x/crypto/bcrypt"

	"github.com/PonyDevAI/Bull-Board/internal/common"
)

const (
	sessionCookieName = "bb_session"
	sessionTTL        = 7 * 24 * time.Hour
	apiKeyPrefixLen   = 8
	apiKeyByteLen     = 32
)

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

// IsDev 是否为开发环境（BB_ENV=dev、NODE_ENV=development 或 prefix 为 air 默认 /tmp/bb-dev）
func IsDev(prefix string) bool {
	if getEnv("BB_ENV", "") == "dev" || getEnv("NODE_ENV", "") == "development" {
		return true
	}
	// air 默认 entrypoint 使用 --prefix /tmp/bb-dev，视为开发环境
	if prefix == "/tmp/bb-dev" {
		return true
	}
	return false
}

// EnsureFirstUser 首次启动时若无用户则创建 admin：生产随机密码并输出/写文件，开发固定 admin/admin
func EnsureFirstUser(db *sql.DB, prefix string) error {
	var n int
	if err := db.QueryRow(`SELECT COUNT(*) FROM users`).Scan(&n); err != nil || n > 0 {
		return err
	}
	username := "admin"
	var password string
	if IsDev(prefix) {
		password = "admin"
		slog.Info("auth: dev mode, created admin with password admin")
	} else {
		b := make([]byte, 16)
		if _, err := rand.Read(b); err != nil {
			return err
		}
		password = hex.EncodeToString(b)
		fmt.Fprintf(os.Stderr, "[Bull Board] First run: admin user created. Initial password: %s\n", password)
		slog.Info("auth: first run, created admin", "username", username)
		credPath := filepath.Join(prefix, "config", "initial_credentials.txt")
		if dir := filepath.Dir(credPath); dir != "" {
			_ = os.MkdirAll(dir, 0755)
			if f, err := os.OpenFile(credPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0600); err == nil {
				_, _ = fmt.Fprintf(f, "username=%s\npassword=%s\n", username, password)
				f.Close()
			}
		}
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	id := common.UUID()
	now := time.Now().UTC().Format(time.RFC3339)
	_, err = db.Exec(`INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)`, id, username, string(hash), now)
	return err
}

// DeleteInitialCredentials 首次成功登录后删除 initial_credentials.txt
func DeleteInitialCredentials(prefix string) {
	path := filepath.Join(prefix, "config", "initial_credentials.txt")
	_ = os.Remove(path)
}

// LoginUser 验证用户名密码，创建 session，返回 sessionID
func LoginUser(db *sql.DB, username, password string) (sessionID string, err error) {
	var id, hash string
	if err := db.QueryRow(`SELECT id, password_hash FROM users WHERE username = ?`, username).Scan(&id, &hash); err != nil {
		if err == sql.ErrNoRows {
			return "", fmt.Errorf("invalid credentials")
		}
		return "", err
	}
	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)); err != nil {
		return "", fmt.Errorf("invalid credentials")
	}
	sessionID = common.UUID()
	expires := time.Now().UTC().Add(sessionTTL).Format(time.RFC3339)
	_, err = db.Exec(`INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)`, sessionID, id, expires)
	if err != nil {
		return "", err
	}
	return sessionID, nil
}

// LogoutUser 删除 session
func LogoutUser(db *sql.DB, sessionID string) error {
	_, err := db.Exec(`DELETE FROM sessions WHERE id = ?`, sessionID)
	return err
}

// ValidateSession 校验 session，返回用户名
func ValidateSession(db *sql.DB, sessionID string) (username string, ok bool) {
	if sessionID == "" {
		return "", false
	}
	var userID, expires string
	if err := db.QueryRow(`SELECT user_id, expires_at FROM sessions WHERE id = ?`, sessionID).Scan(&userID, &expires); err != nil {
		if err == sql.ErrNoRows {
			return "", false
		}
		return "", false
	}
	if expires != "" {
		t, _ := time.Parse(time.RFC3339, expires)
		if time.Now().UTC().After(t) {
			_, _ = db.Exec(`DELETE FROM sessions WHERE id = ?`, sessionID)
			return "", false
		}
	}
	if err := db.QueryRow(`SELECT username FROM users WHERE id = ?`, userID).Scan(&username); err != nil {
		return "", false
	}
	return username, true
}

// HashAPIKey 返回 sha256(hex) 的 hex 与 prefix
func HashAPIKey(plain string) (hashHex, prefix string) {
	h := sha256.Sum256([]byte(plain))
	if len(plain) >= apiKeyPrefixLen {
		prefix = plain[:apiKeyPrefixLen]
	} else {
		prefix = plain
	}
	return hex.EncodeToString(h[:]), prefix
}

// GenerateAPIKey 生成新的 API key 明文（64 字符 hex）
func GenerateAPIKey() (plain string, hashHex, prefix string, err error) {
	b := make([]byte, apiKeyByteLen)
	if _, err := rand.Read(b); err != nil {
		return "", "", "", err
	}
	plain = hex.EncodeToString(b)
	hashHex, prefix = HashAPIKey(plain)
	return plain, hashHex, prefix, nil
}

// ValidateAPIKey 校验 API key，若有效则更新 last_used_at 并返回 true
func ValidateAPIKey(db *sql.DB, plainKey string) (ok bool) {
	if plainKey == "" {
		return false
	}
	hashHex, _ := HashAPIKey(plainKey)
	var id string
	if err := db.QueryRow(`SELECT id FROM api_keys WHERE key_hash = ? AND (revoked_at IS NULL OR revoked_at = '')`, hashHex).Scan(&id); err != nil {
		if err == sql.ErrNoRows {
			return false
		}
		return false
	}
	now := time.Now().UTC().Format(time.RFC3339)
	_, _ = db.Exec(`UPDATE api_keys SET last_used_at = ? WHERE id = ?`, now, id)
	return true
}

// GetIgnoredVersions 从 settings 读取 ignored_versions JSON array
func GetIgnoredVersions(db *sql.DB) ([]string, error) {
	var val string
	if err := db.QueryRow(`SELECT value FROM settings WHERE key = ?`, "ignored_versions").Scan(&val); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	var list []string
	if val == "" {
		return list, nil
	}
	if err := json.Unmarshal([]byte(val), &list); err != nil {
		return nil, err
	}
	return list, nil
}

// SetIgnoredVersions 写入 ignored_versions
func SetIgnoredVersions(db *sql.DB, versions []string) error {
	raw, _ := json.Marshal(versions)
	_, err := db.Exec(`INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`, "ignored_versions", string(raw))
	return err
}
