import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const defaultDbPath =
  process.env.SQLITE_PATH ||
  path.join(process.cwd(), "data", "bullboard.db");

function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function openDb(): Database.Database {
  ensureDir(defaultDbPath);
  const db = new Database(defaultDbPath);
  runMigrations(db);
  return db;
}

function runMigrations(db: Database.Database) {
  const migrationsDir = path.join(__dirname, "..", "migrations");
  if (!fs.existsSync(migrationsDir)) return;
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, f), "utf8");
    db.exec(sql);
  }
}

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) _db = openDb();
  return _db;
}
