import type { Config } from "drizzle-kit";

export function createConfig() {
  const DATABASE_URL = process.env.DATABASE_URL || "file:./db-data.local";

  const isLocal = DATABASE_URL.startsWith("file:");

  if (isLocal) {
    return {
      schema: "./src/server/schema/index.ts",
      dialect: "postgresql",
      driver: "pglite",
      dbCredentials: {
        url: "./db-data.local",
      },
    } satisfies Config;
  }

  return {
    schema: "./src/server/schema/index.ts",
    dialect: "postgresql",
    dbCredentials: {
      url: DATABASE_URL,
    },
  } satisfies Config;
}
