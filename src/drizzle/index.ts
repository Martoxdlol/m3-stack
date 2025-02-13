import type { Config } from 'drizzle-kit'

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

export function createConfig() {
    const DATABASE_URL = process.env.DATABASE_URL || 'file:./db-data.local'

    const isLocal = DATABASE_URL.startsWith('file:')

    if (isLocal) {
        console.log('Using local PGLite database at', DATABASE_URL)

        return {
            schema: './src/server/schema/index.ts',
            dialect: 'postgresql',
            driver: 'pglite',
            dbCredentials: {
                url: './db-data.local',
            },
        } satisfies Config
    }

    console.log('Using remote PostgreSQL database at', urlWithoutCredentials(DATABASE_URL))

    return {
        schema: './src/server/schema/index.ts',
        dialect: 'postgresql',
        dbCredentials: {
            url: DATABASE_URL,
        },
    } satisfies Config
}
