package common

import (
	"database/sql"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

const defaultDBPath = "data/db/bb.sqlite"

// OpenDB 打开或创建 SQLite，路径为 PREFIX/data/db/bb.sqlite，并执行最小 schema
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
		CREATE TABLE IF NOT EXISTS persons (id TEXT PRIMARY KEY, company_id TEXT, type TEXT NOT NULL DEFAULT 'self', name TEXT, host TEXT, capabilities_json TEXT, max_concurrency INTEGER DEFAULT 1, version TEXT, last_seen_at TEXT, status TEXT DEFAULT 'offline', last_heartbeat TEXT, endpoint_url TEXT, config_json TEXT);
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
			locked_by TEXT,
			locked_until TEXT,
			last_error TEXT,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL
		);
	`)
	if err != nil {
		return err
	}
	// 兼容旧 schema：为已存在的 runs/jobs 表补列（SQLite 无 IF NOT EXISTS 列，忽略重复列错误）
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
		"ALTER TABLE jobs ADD COLUMN locked_by TEXT",
		"ALTER TABLE jobs ADD COLUMN locked_until TEXT",
		"ALTER TABLE jobs ADD COLUMN last_error TEXT",
	} {
		_, _ = db.Exec(q)
	}
	// PR2: company/worker 模型
	if err := initSchemaCompanyWorkers(db); err != nil {
		return err
	}
	return nil
}

func initSchemaCompanyWorkers(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS companies (id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL);
		CREATE TABLE IF NOT EXISTS depts (id TEXT PRIMARY KEY, company_id TEXT NOT NULL, type TEXT NOT NULL CHECK (type IN ('plan','exec')), name TEXT NOT NULL, created_at TEXT NOT NULL);
		CREATE TABLE IF NOT EXISTS agents (id TEXT PRIMARY KEY, company_id TEXT NOT NULL, dept_id TEXT, name TEXT NOT NULL, roles_json TEXT, model_config_json TEXT, prompt_profile TEXT, tool_profile TEXT, is_enabled INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
		CREATE TABLE IF NOT EXISTS workers (id TEXT PRIMARY KEY, company_id TEXT NOT NULL, dept_id TEXT, agent_id TEXT NOT NULL UNIQUE, person_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'offline', max_concurrency INTEGER NOT NULL DEFAULT 1, current_job_id TEXT, last_seen_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
	`)
	if err != nil {
		return err
	}
	// persons 表补列（兼容旧 persons 或迁移后）
	for _, q := range []string{
		"ALTER TABLE persons ADD COLUMN company_id TEXT",
		"ALTER TABLE persons ADD COLUMN type TEXT",
		"ALTER TABLE persons ADD COLUMN name TEXT",
		"ALTER TABLE persons ADD COLUMN host TEXT",
		"ALTER TABLE persons ADD COLUMN capabilities_json TEXT",
		"ALTER TABLE persons ADD COLUMN max_concurrency INTEGER",
		"ALTER TABLE persons ADD COLUMN version TEXT",
		"ALTER TABLE persons ADD COLUMN last_seen_at TEXT",
		"ALTER TABLE persons ADD COLUMN status TEXT",
		"ALTER TABLE persons ADD COLUMN endpoint_url TEXT",
		"ALTER TABLE persons ADD COLUMN config_json TEXT",
	} {
		_, _ = db.Exec(q)
	}
	// 迁移：旧 DB 有 runners 表则迁到 persons，workers.runner_id -> person_id
	migrateRunnersToPersons(db)
	// workspaces 补 company_id
	_, _ = db.Exec("ALTER TABLE workspaces ADD COLUMN company_id TEXT")
	// jobs 补 assigned_worker_id（PR3 强指派）
	_, _ = db.Exec("ALTER TABLE jobs ADD COLUMN assigned_worker_id TEXT")
	// 默认公司
	_, _ = db.Exec(`INSERT OR IGNORE INTO companies (id, name, created_at) VALUES ('default', 'Default', datetime('now'))`)
	// 默认 agent + person + worker（用于未指定 worker 时的 enqueue 兼容）
	_, _ = db.Exec(`INSERT OR IGNORE INTO agents (id, company_id, name, is_enabled, created_at, updated_at) VALUES ('default', 'default', 'Default Agent', 1, datetime('now'), datetime('now'))`)
	_, _ = db.Exec(`INSERT OR IGNORE INTO persons (id, company_id, type, status, last_heartbeat) VALUES ('default', 'default', 'self', 'offline', datetime('now'))`)
	_, _ = db.Exec(`INSERT OR IGNORE INTO workers (id, company_id, agent_id, person_id, status, max_concurrency, created_at, updated_at) VALUES ('default', 'default', 'default', 'default', 'offline', 1, datetime('now'), datetime('now'))`)
	return nil
}

// migrateRunnersToPersons 将旧 runners 表数据迁入 persons，workers.runner_id 迁入 person_id
func migrateRunnersToPersons(db *sql.DB) {
	var exists int
	err := db.QueryRow("SELECT 1 FROM sqlite_master WHERE type='table' AND name='runners'").Scan(&exists)
	if err != nil || exists == 0 {
		return
	}
	_, _ = db.Exec(`INSERT OR REPLACE INTO persons (id, company_id, type, name, host, capabilities_json, max_concurrency, version, last_seen_at, status, last_heartbeat) SELECT id, COALESCE(company_id,'default'), 'self', COALESCE(name, id), host, capabilities_json, COALESCE(max_concurrency,1), version, last_seen_at, COALESCE(status,'offline'), last_heartbeat FROM runners`)
	_, _ = db.Exec(`ALTER TABLE workers ADD COLUMN person_id TEXT`)
	_, _ = db.Exec(`UPDATE workers SET person_id = runner_id WHERE person_id IS NULL AND runner_id IS NOT NULL`)
	_, _ = db.Exec(`DROP TABLE runners`)
}
