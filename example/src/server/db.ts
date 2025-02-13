import type { ExtractTablesWithRelations } from 'drizzle-orm'
import type { PgTransaction } from 'drizzle-orm/pg-core'
import type { PostgresJsDatabase, PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js'
import { createDatabasePGDatabase } from 'm3-stack/server'
import * as schema from './schema'

/**
 * !  IMPORTANT ¡¡¡
 * !  You can't export db instance from here, you should always pass it as context
 * !  from hono tRPC or just from the main function.
 *
 * `server/main.ts`
 *
 * ```
 * function main() {
 *    ...
 *    const db = createDatabase()
 *    ...
 *
 *    someFunction(db)
 * }
 */
export function createDatabase() {
    return createDatabasePGDatabase({ schema })
}

/**
 * The type of the database.
 *
 * Useful when you need to pass a db into a function (do not import database globally).
 */
export type DBType = PostgresJsDatabase<typeof schema>
/**
 * The type of a transaction. Useful when you need to pass a tx into a function.
 */
export type TXType = PgTransaction<PostgresJsQueryResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>>

/**
 * Represents a database or a database transaction (they are very similar).
 *
 * Useful when you need to pass a db into a function and you don't know if it is running inside a transaction (so the db is a tx)
 * or not (so the db is a db).
 */
export type DBTX = DBType | TXType

export { schema }
