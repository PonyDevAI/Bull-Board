package common

import (
	"database/sql"
	"path/filepath"
	"testing"

	_ "modernc.org/sqlite"
)

func TestSchemaV2BootstrapAndColumns(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("SQLITE_PATH", filepath.Join(tmp, "bb.sqlite"))

	db, _, err := OpenDB(tmp)
	if err != nil {
		t.Fatalf("OpenDB failed: %v", err)
	}
	defer db.Close()

	for _, table := range []string{"homes", "workspaces", "groups", "roles", "model_profiles", "integration_instances", "agent_apps", "execution_backends", "workers"} {
		if !tableExists(t, db, table) {
			t.Fatalf("expected canonical table %s to exist", table)
		}
	}

	requireHasColumns(t, db, "workspaces", "id", "home_id", "name", "created_at", "updated_at")
	requireHasColumns(t, db, "workers", "role_id", "agent_app_id", "execution_backend_id")

	if tableExists(t, db, "persons") {
		t.Fatalf("persons table must not be required for Bull-Board 2.0 bootstrap")
	}

	assertSeedExists(t, db, "homes", "id = 'default'")
	assertSeedExists(t, db, "workspaces", "id = 'default-workspace' AND home_id = 'default'")
	assertSeedExists(t, db, "groups", "id = 'default-group' AND workspace_id = 'default-workspace'")
	assertSeedExists(t, db, "connectors", "id = 'openclaw' AND code = 'openclaw'")

	if tableExists(t, db, "legacy_workspaces") {
		t.Fatalf("legacy workspace table must not exist")
	}
}

func TestSchemaV2ExecutesOnFreshSQLite(t *testing.T) {
	tmp := t.TempDir()
	db, err := sql.Open("sqlite", filepath.Join(tmp, "fresh.sqlite"))
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	defer db.Close()

	schema, err := readSchemaV2()
	if err != nil {
		t.Fatalf("read schema_v2.sql: %v", err)
	}
	if _, err := db.Exec(string(schema)); err != nil {
		t.Fatalf("execute schema_v2.sql: %v", err)
	}

	requireHasColumns(t, db, "workspaces", "id", "home_id", "name", "created_at", "updated_at")
}

func requireHasColumns(t *testing.T, db *sql.DB, table string, columns ...string) {
	t.Helper()
	if err := ensureTableColumns(db, table, columns); err != nil {
		t.Fatalf("table %s columns missing: %v", table, err)
	}
}

func tableExists(t *testing.T, db *sql.DB, table string) bool {
	t.Helper()
	var count int
	err := db.QueryRow(`SELECT count(*) FROM sqlite_master WHERE type='table' AND name = ?`, table).Scan(&count)
	if err != nil {
		t.Fatalf("table exists query failed: %v", err)
	}
	return count > 0
}

func assertSeedExists(t *testing.T, db *sql.DB, table, where string) {
	t.Helper()
	q := `SELECT count(*) FROM ` + table + ` WHERE ` + where
	var count int
	if err := db.QueryRow(q).Scan(&count); err != nil {
		t.Fatalf("seed check failed for %s: %v", table, err)
	}
	if count == 0 {
		t.Fatalf("expected seed row in %s with predicate %s", table, where)
	}
}
