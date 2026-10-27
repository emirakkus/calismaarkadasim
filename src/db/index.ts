import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const parsedDatabaseUrl = new URL(databaseUrl);
const isLocal =
  parsedDatabaseUrl.hostname === "localhost" ||
  parsedDatabaseUrl.hostname === "127.0.0.1" ||
  parsedDatabaseUrl.hostname === "[::1]";
const sslMode = parsedDatabaseUrl.searchParams.get("sslmode")?.toLowerCase();

if (
  !isLocal ||
  (sslMode !== undefined && sslMode !== "disable") ||
  process.env.PGSSLMODE === "require"
) {
  parsedDatabaseUrl.searchParams.set("sslmode", "verify-full");
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: parsedDatabaseUrl.toString(),
    max: process.env.VERCEL ? 1 : 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
