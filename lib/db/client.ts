import "server-only";
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { runMigrations } from "./migrations";

const DEFAULT_DATABASE_PATH = path.join(
  process.cwd(),
  "data",
  "sales-converter.db",
);

// Reuse one connection across hot reloads in development.
const globalForDb = globalThis as unknown as {
  salesConverterDb?: Database.Database;
};

function openDatabase() {
  const databasePath = process.env.DATABASE_PATH ?? DEFAULT_DATABASE_PATH;

  mkdirSync(path.dirname(databasePath), { recursive: true });

  const db = new Database(databasePath);

  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  runMigrations(db);

  return db;
}

export function getDb() {
  globalForDb.salesConverterDb ??= openDatabase();

  return globalForDb.salesConverterDb;
}
