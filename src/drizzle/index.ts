import type { Config } from 'drizzle-kit'
import { cwd } from 'node:process'
import { findMatchingFileSync } from '../bin/helpers'

function urlWithoutCredentials(url: string) {
    const u = new URL(url)
    if (u.username) {
        u.username = '****'
    }

    if (u.password) {
        u.password = '****'
    }

    return u.href
}

export const DEFAULT_SCHEMA_PATHS = [
    './schema',
    './schema/index',
    './schema/main',
    './src/server/schema',
    './src/server/schema/index',
    './src/server/schema/main',
    './db/schema',
    './db/schema/index',
    './db/schema/main',
    './src/db/schema',
    './src/db/schema/index',
    './src/db/schema/main',
    './database/schema',
    './database/schema/index',
    './database/schema/main',
    './src/database/schema',
    './src/database/schema/index',
    './src/database/schema/main',
    './server/db/schema',
    './server/db/schema/index',
    './server/db/schema/main',
    './server/database/schema',
    './server/database/schema/index',
    './server/database/schema/main',
]

export function getSchemaPath() {
    return findMatchingFileSync(cwd(), DEFAULT_SCHEMA_PATHS, ['ts', 'js', 'tsx', 'jsx', 'mjs', 'cjs', 'mts', 'cts'])
}

export function createDrizzleConfig(opts?: Partial<Config>): Config {
    const DATABASE_URL = process.env.DATABASE_URL || 'file:./db-data.local'

    const isLocal = DATABASE_URL.startsWith('file:')

    const schemaPath = getSchemaPath()

    if (!schemaPath) {
        throw new Error('Could not find a schema file')
    }

    console.info('Using schema file at', schemaPath)

    if (isLocal) {
        console.info('Using', opts?.dialect || 'postgresql', 'PGLite database at', DATABASE_URL)
        console.info()

        return {
            ...opts,
            schema: opts?.schema || schemaPath,
            dialect: opts?.dialect || 'postgresql',
            driver: (opts as any)?.driver || 'pglite',
            dbCredentials: (opts as any)?.dbCredentials || {
                url: './db-data.local',
            },
        } as any
    }

    console.info('Using remote', opts?.dialect || 'postgresql', 'database at', urlWithoutCredentials(DATABASE_URL))
    console.info()

    return {
        ...opts,
        schema: opts?.schema || schemaPath,
        dialect: opts?.dialect || 'postgresql',
        dbCredentials: (opts as any)?.dbCredentials || {
            url: DATABASE_URL,
        },
    } as any
}
