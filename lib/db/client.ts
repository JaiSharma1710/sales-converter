import "server-only";
import { createClient, type Client } from "@libsql/client";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { runMigrations } from "./migrations";

// Reuse one client (and one migration run) per server instance, including
// across hot reloads in development.
const globalForDb = globalThis as unknown as {
  salesConverterDb?: { client: Client; ready: Promise<void> };
};

function resolveDatabaseUrl() {
  const url = process.env.TURSO_DATABASE_URL;

  if (url) {
    return url;
  }

  // Serverless hosts have a read-only, per-instance filesystem, so a local
  // database file would fail or silently lose data.
  if (process.env.VERCEL) {
    throw new Error(
      "TURSO_DATABASE_URL is not set. Add the Turso database URL and TURSO_AUTH_TOKEN to the Vercel environment variables.",
    );
  }

  const databasePath = path.join(process.cwd(), "data", "sales-converter.db");

  mkdirSync(path.dirname(databasePath), { recursive: true });

  return `file:${databasePath}`;
}

// The Vercel Turso integration names the token after its custom prefix
// ("TURSO_DATABASE" gives TURSO_DATABASE_TURSO_AUTH_TOKEN).
function resolveAuthToken() {
  return (
    process.env.TURSO_AUTH_TOKEN ??
    process.env.TURSO_DATABASE_TURSO_AUTH_TOKEN
  );
}

function openDatabase() {
  const client = createClient({
    authToken: resolveAuthToken(),
    timeout: 5000,
    url: resolveDatabaseUrl(),
  });
  const ready = runMigrations(client).catch((error: unknown) => {
    // Retry on the next request instead of caching the failure.
    globalForDb.salesConverterDb = undefined;
    throw error;
  });

  return { client, ready };
}

export async function getDb() {
  globalForDb.salesConverterDb ??= openDatabase();

  const { client, ready } = globalForDb.salesConverterDb;

  await ready;

  return client;
}
