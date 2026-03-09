package common

import (
	"database/sql"
	"path/filepath"
	"testing"
)

func TestSchemaV2BootstrapAndColumns(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("SQLITE_PATH", filepath.Join(tmp, "bb.sqlite"))

	db, _, err := OpenDB(tmp)
	if err != nil {
		t.Fatalf("OpenDB failed: %v", err)
	}
	defer db.Close()

	requireHasColumn(t, db, "workspaces", "home_id")
	requireHasColumn(t, db, "workers", "role_id")
	requireHasColumn(t, db, "workers", "agent_app_id")
	requireHasColumn(t, db, "workers", "execution_backend_id")

	if tableExists(t, db, "persons") {
		t.Fatalf("persons table must not be required for Bull-Board 2.0 bootstrap")
	}

	assertSeedExists(t, db, "homes", "id = 'default'")
	assertSeedExists(t, db, "workspaces", "id = 'default-workspace' AND home_id = 'default'")
	assertSeedExists(t, db, "groups", "id = 'default-group' AND workspace_id = 'default-workspace'")
	assertSeedExists(t, db, "connectors", "id = 'openclaw' AND code = 'openclaw'")
}

func requireHasColumn(t *testing.T, db *sql.DB, table, column string) {
	t.Helper()
	if err := ensureTableColumns(db, table, []string{column}); err != nil {
		t.Fatalf("table %s column %s missing: %v", table, column, err)
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
