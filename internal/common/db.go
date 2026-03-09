package common

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
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
		"ALTER TABLE tasks ADD COLUMN workflow_template_id TEXT",
	} {
		_, _ = db.Exec(q)
	}

	return initSchemaWorkforceV2(db)
}

func initSchemaWorkforceV2(db *sql.DB) error {
	schemaBytes, err := readSchemaV2()
	if err != nil {
		return err
	}
	for _, stmt := range strings.Split(string(schemaBytes), ";") {
		s := strings.TrimSpace(stmt)
		if s == "" || strings.HasPrefix(strings.ToUpper(s), "PRAGMA") {
			continue
		}
		upper := strings.ToUpper(s)
		switch {
		case strings.HasPrefix(upper, "CREATE TABLE"):
			tbl, ok := tableNameFromCreate(s)
			if !ok || !isWorkforceTable(tbl) {
				continue
			}
			s = strings.Replace(s, "CREATE TABLE "+tbl, "CREATE TABLE IF NOT EXISTS "+tbl, 1)
		case strings.HasPrefix(upper, "CREATE UNIQUE INDEX"), strings.HasPrefix(upper, "CREATE INDEX"):
			tbl, ok := tableNameFromIndex(s)
			if !ok || !isWorkforceTable(tbl) {
				continue
			}
			s = strings.Replace(s, "CREATE UNIQUE INDEX", "CREATE UNIQUE INDEX IF NOT EXISTS", 1)
			s = strings.Replace(s, "CREATE INDEX", "CREATE INDEX IF NOT EXISTS", 1)
		default:
			continue
		}
		if _, err := db.Exec(s); err != nil {
			return fmt.Errorf("apply workforce schema statement: %w", err)
		}
	}
	if err := seedDefaultWorkforceData(db); err != nil {
		return err
	}
	return validateWorkforceSchema(db)
}

func seedDefaultWorkforceData(db *sql.DB) error {
	seedStatements := []struct {
		name string
		sql  string
		args []any
	}{
		{name: "default home", sql: `INSERT OR IGNORE INTO homes (id,name) VALUES ('default','Default Home')`},
		{name: "default workspace", sql: `INSERT OR IGNORE INTO workspaces (id,home_id,name) VALUES ('default-workspace','default','Default Workspace')`},
		{name: "default group", sql: `INSERT OR IGNORE INTO groups (id,home_id,workspace_id,name) VALUES ('default-group','default','default-workspace','Default Group')`},
		{name: "openclaw connector", sql: `INSERT OR IGNORE INTO connectors (id,home_id,code,name,category) VALUES ('openclaw','default','openclaw','OpenClaw','execution_backend')`},
	}
	for _, stmt := range seedStatements {
		if _, err := db.Exec(stmt.sql, stmt.args...); err != nil {
			return fmt.Errorf("seed %s: %w", stmt.name, err)
		}
	}

	for _, role := range []string{"Planner", "Researcher", "Coder", "Reviewer", "Writer", "Operator"} {
		if _, err := db.Exec(`INSERT OR IGNORE INTO roles (id,home_id,name,code) VALUES (lower(replace(?,' ', '-')),'default',?,lower(replace(?,' ', '_')))`, role, role, role); err != nil {
			return fmt.Errorf("seed role %s: %w", role, err)
		}
	}
	return nil
}

func validateWorkforceSchema(db *sql.DB) error {
	required := map[string][]string{
		"homes":                   {"id", "name"},
		"workspaces":              {"id", "home_id", "name"},
		"groups":                  {"id", "home_id", "workspace_id", "name"},
		"roles":                   {"id", "home_id", "name", "code"},
		"model_profiles":          {"id", "home_id", "name"},
		"integration_instances":   {"id", "home_id", "connector_code"},
		"agent_apps":              {"id", "home_id", "name"},
		"execution_backends":      {"id", "home_id", "connector_code"},
		"workers":                 {"id", "role_id", "agent_app_id", "execution_backend_id"},
		"workflow_templates":      {"id", "workspace_id", "name", "config_json"},
		"workflow_step_templates": {"id", "workflow_template_id", "step_type", "step_order"},
		"workflow_runs":           {"id", "workspace_id", "workflow_template_id", "status"},
		"step_runs":               {"id", "workflow_run_id", "status"},
	}
	for table, columns := range required {
		if err := ensureTableColumns(db, table, columns); err != nil {
			return err
		}
	}
	return nil
}

func ensureTableColumns(db *sql.DB, table string, columns []string) error {
	rows, err := db.Query(`PRAGMA table_info(` + table + `)`)
	if err != nil {
		return fmt.Errorf("check table %s: %w", table, err)
	}
	defer rows.Close()

	existing := map[string]bool{}
	for rows.Next() {
		var cid int
		var name, colType string
		var notNull, pk int
		var dflt sql.NullString
		if err := rows.Scan(&cid, &name, &colType, &notNull, &dflt, &pk); err != nil {
			return fmt.Errorf("scan table %s columns: %w", table, err)
		}
		existing[name] = true
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate table %s columns: %w", table, err)
	}
	if len(existing) == 0 {
		return fmt.Errorf("missing required table: %s", table)
	}
	for _, col := range columns {
		if !existing[col] {
			return fmt.Errorf("table %s missing required column %s", table, col)
		}
	}
	return nil
}

func readSchemaV2() ([]byte, error) {
	if b, err := os.ReadFile("db/schema_v2.sql"); err == nil {
		return b, nil
	}
	_, currentFile, _, ok := runtime.Caller(0)
	if !ok {
		return nil, fmt.Errorf("resolve schema_v2.sql path")
	}
	repoRoot := filepath.Clean(filepath.Join(filepath.Dir(currentFile), "..", ".."))
	return os.ReadFile(filepath.Join(repoRoot, "db", "schema_v2.sql"))
}

func tableNameFromIndex(statement string) (string, bool) {
	upper := strings.ToUpper(statement)
	onPos := strings.Index(upper, " ON ")
	if onPos == -1 {
		return "", false
	}
	afterOn := strings.TrimSpace(statement[onPos+4:])
	for i, r := range afterOn {
		if r == ' ' || r == '(' {
			return strings.TrimSpace(afterOn[:i]), true
		}
	}
	return "", false
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
	case "homes", "workspaces", "groups", "roles", "model_profiles", "connectors", "integration_instances", "execution_backends", "agent_apps", "agent_app_skills", "agent_app_plugins", "workers", "workflow_templates", "workflow_step_templates", "workflow_runs", "step_runs":
		return true
	default:
		return false
	}
}
