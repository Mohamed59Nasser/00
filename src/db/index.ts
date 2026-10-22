import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

type Database = ReturnType<typeof drizzle>;
type DatabaseState = { pool: Pool; db: Database };

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlState?: DatabaseState;
};

function getDatabase(): DatabaseState {
  if (globalForDb.__arenaNextJsPostgresqlState) return globalForDb.__arenaNextJsPostgresqlState;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required for database operations.");
  const pool = new Pool({ connectionString: databaseUrl });
  const state = { pool, db: drizzle(pool) };
  globalForDb.__arenaNextJsPostgresqlState = state;
  return state;
}

/**
 * Resolve the connection only when a query is made. This keeps builds and the
 * public login shell independent of secrets while preserving a pooled server connection.
 */
export const db = new Proxy({} as Database, {
  get(_target, property) {
    const database = getDatabase().db;
    const value = Reflect.get(database as object, property);
    return typeof value === "function" ? value.bind(database) : value;
  },
});
