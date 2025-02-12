import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { drizzle as drizzlePGLite } from "drizzle-orm/pglite";

import postgres from "postgres";
import { PGlite } from "@electric-sql/pglite";

export type CreateDatabaseOpts<TSchema extends Record<string, unknown>> = {
  url?: string;
  schema: TSchema;
};

export function createDatabasePGDatabase<T extends Record<string, unknown>>(
  opts: CreateDatabaseOpts<T>
): PostgresJsDatabase<T> {
  const url = opts?.url || process.env.DATABASE_URL || "file:./db-data.local";

  const isFile = url.startsWith("file:");

  if (isFile) {
    const sql = new PGlite(url.slice(5));

    const db = drizzlePGLite(sql, { schema: opts.schema });

    return db as unknown as PostgresJsDatabase<T>;
  }

  const sql = postgres(url);

  const db = drizzle(sql, { schema: opts.schema });

  return db;
}
