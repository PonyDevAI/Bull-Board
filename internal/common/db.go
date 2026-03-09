package common

import (
	"database/sql"
	"os"
	"path/filepath"
	"strings"

	_ "modernc.org/sqlite"
)

const defaultDBPath = "data/db/bb.sqlite"

// OpenDB 打开或创建 SQLite，路径为 PREFIX/data/db/bb.sqlite，并执行 schema。
func OpenDB(prefix string) (*sql.DB, string, error) {
	if prefix == "" {
		prefix = getEnv("PREFIX", "/opt/bull-board")
	}
	dbPath := getEnv("SQLITE_PATH", filepath.Join(prefix, defaultDBPath))
	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, "", err
	}
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, "", err
	}
	if err := initSchema(db); err != nil {
		db.Close()
		return nil, "", err
	}
	return db, dbPath, nil
}

func initSchema(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
		CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL);
		CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at TEXT NOT NULL);
		CREATE TABLE IF NOT EXISTS api_keys (id TEXT PRIMARY KEY, name TEXT NOT NULL, key_hash TEXT NOT NULL, key_prefix TEXT NOT NULL, created_at TEXT NOT NULL, last_used_at TEXT, revoked_at TEXT);
		CREATE TABLE IF NOT EXISTS workspaces (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			repo_path TEXT NOT NULL,
			default_branch TEXT NOT NULL DEFAULT 'main',
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL
		);
		CREATE TABLE IF NOT EXISTS tasks (
			id TEXT PRIMARY KEY,
			workspace_id TEXT NOT NULL,
			title TEXT NOT NULL,
			description TEXT NOT NULL DEFAULT '',
			status TEXT NOT NULL DEFAULT 'plan',
			plan_round INTEGER NOT NULL DEFAULT 0,
			fix_round INTEGER NOT NULL DEFAULT 0,
			submit_state TEXT NOT NULL DEFAULT 'not_submitted',
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL
		);
		CREATE TABLE IF NOT EXISTS runs (
			id TEXT PRIMARY KEY,
			task_id TEXT NOT NULL,
			mode TEXT NOT NULL DEFAULT 'CODE_CHANGE',
			status TEXT NOT NULL DEFAULT 'queued',
			worktree_path TEXT,
			branch_name TEXT,
			error_kind TEXT NOT NULL DEFAULT 'none',
			error_message TEXT,
			started_at TEXT,
			finished_at TEXT,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL
		);
		CREATE TABLE IF NOT EXISTS artifacts (
			id TEXT PRIMARY KEY,
			run_id TEXT NOT NULL,
			type TEXT NOT NULL,
			uri TEXT NOT NULL,
			meta TEXT,
			created_at TEXT NOT NULL
		);
		CREATE TABLE IF NOT EXISTS messages (
			id TEXT PRIMARY KEY,
			task_id TEXT NOT NULL,
			round_type TEXT NOT NULL,
			round_no INTEGER NOT NULL,
			author TEXT NOT NULL,
			content TEXT NOT NULL,
			created_at TEXT NOT NULL
		);
		CREATE TABLE IF NOT EXISTS jobs (
			id TEXT PRIMARY KEY,
			run_id TEXT NOT NULL,
			task_id TEXT NOT NULL,
			workspace_id TEXT NOT NULL,
			mode TEXT NOT NULL,
			payload_json TEXT NOT NULL,
			status TEXT NOT NULL DEFAULT 'queued',
			priority INTEGER NOT NULL DEFAULT 0,
			available_at TEXT NOT NULL,
			attempts INTEGER NOT NULL DEFAULT 0,
			max_attempts INTEGER NOT NULL DEFAULT 3,
			last_error TEXT,
			assigned_worker_id TEXT,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL
		);
	`)
	if err != nil {
		return err
	}

	for _, q := range []string{
		"ALTER TABLE runs ADD COLUMN mode TEXT DEFAULT 'CODE_CHANGE'",
		"ALTER TABLE runs ADD COLUMN worktree_path TEXT",
		"ALTER TABLE runs ADD COLUMN branch_name TEXT",
		"ALTER TABLE runs ADD COLUMN error_kind TEXT DEFAULT 'none'",
		"ALTER TABLE runs ADD COLUMN error_message TEXT",
		"ALTER TABLE runs ADD COLUMN started_at TEXT",
		"ALTER TABLE runs ADD COLUMN finished_at TEXT",
		"ALTER TABLE runs ADD COLUMN updated_at TEXT",
		"ALTER TABLE jobs ADD COLUMN mode TEXT DEFAULT 'CODE_CHANGE'",
		"ALTER TABLE jobs ADD COLUMN payload_json TEXT DEFAULT '{}'",
		"ALTER TABLE jobs ADD COLUMN priority INTEGER DEFAULT 0",
		"ALTER TABLE jobs ADD COLUMN available_at TEXT DEFAULT ''",
		"ALTER TABLE jobs ADD COLUMN attempts INTEGER DEFAULT 0",
		"ALTER TABLE jobs ADD COLUMN max_attempts INTEGER DEFAULT 3",
		"ALTER TABLE jobs ADD COLUMN last_error TEXT",
		"ALTER TABLE jobs ADD COLUMN assigned_worker_id TEXT",
	} {
		_, _ = db.Exec(q)
	}

	return initSchemaWorkforceV2(db)
}

func initSchemaWorkforceV2(db *sql.DB) error {
	schemaBytes, err := os.ReadFile("db/schema_v2.sql")
	if err != nil {
		return err
	}
	for _, stmt := range strings.Split(string(schemaBytes), ";") {
		s := strings.TrimSpace(stmt)
		if s == "" || strings.HasPrefix(s, "PRAGMA") {
			continue
		}
		if !strings.HasPrefix(strings.ToUpper(s), "CREATE TABLE") {
			continue
		}
		tbl, ok := tableNameFromCreate(s)
		if !ok || !isWorkforceTable(tbl) {
			continue
		}
		s = strings.Replace(s, "CREATE TABLE "+tbl, "CREATE TABLE IF NOT EXISTS "+tbl, 1)
		if _, err := db.Exec(s); err != nil {
			return err
		}
	}
	_, _ = db.Exec(`CREATE INDEX IF NOT EXISTS idx_roles_home ON roles(home_id)`)
	_, _ = db.Exec(`CREATE INDEX IF NOT EXISTS idx_model_profiles_home ON model_profiles(home_id)`)
	_, _ = db.Exec(`CREATE INDEX IF NOT EXISTS idx_integrations_home ON integration_instances(home_id)`)
	_, _ = db.Exec(`CREATE INDEX IF NOT EXISTS idx_agent_apps_home ON agent_apps(home_id)`)
	_, _ = db.Exec(`CREATE INDEX IF NOT EXISTS idx_execution_backends_home ON execution_backends(home_id)`)
	_, _ = db.Exec(`CREATE INDEX IF NOT EXISTS idx_workers_bindings ON workers(home_id, role_id, agent_app_id, execution_backend_id)`)

	_, _ = db.Exec(`INSERT OR IGNORE INTO homes (id,name) VALUES ('default','Default Home')`)
	_, _ = db.Exec(`INSERT OR IGNORE INTO workspaces (id,home_id,name) VALUES ('default-workspace','default','Default Workspace')`)
	_, _ = db.Exec(`INSERT OR IGNORE INTO groups (id,home_id,workspace_id,name) VALUES ('default-group','default','default-workspace','Default Group')`)
	for _, role := range []string{"Planner", "Researcher", "Coder", "Reviewer", "Writer", "Operator"} {
		_, _ = db.Exec(`INSERT OR IGNORE INTO roles (id,home_id,name,code) VALUES (lower(replace(?,' ', '-')),'default',?,lower(replace(?,' ', '_')))`, role, role, role)
	}
	_, _ = db.Exec(`INSERT OR IGNORE INTO connectors (id,home_id,code,name,category) VALUES ('openclaw','default','openclaw','OpenClaw','execution_backend')`)
	return nil
}

func tableNameFromCreate(statement string) (string, bool) {
	namePart := strings.TrimSpace(statement[len("CREATE TABLE"):])
	namePart = strings.TrimPrefix(namePart, "IF NOT EXISTS")
	namePart = strings.TrimSpace(namePart)
	for i, r := range namePart {
		if r == ' ' || r == '(' {
			return strings.TrimSpace(namePart[:i]), true
		}
	}
	return "", false
}

func isWorkforceTable(table string) bool {
	switch table {
	case "homes", "workspaces", "groups", "roles", "model_profiles", "connectors", "integration_instances", "execution_backends", "agent_apps", "agent_app_skills", "agent_app_plugins", "workers":
		return true
	default:
		return false
	}
}
