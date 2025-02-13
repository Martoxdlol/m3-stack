import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import type { DBType } from '../db'

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173'

export function createAuth(opts: { db: DBType }) {
    return betterAuth({
        database: drizzleAdapter(opts.db, {
            provider: 'pg',
        }),
        emailAndPassword: {
            enabled: true,
            async sendResetPassword(_data, _request) {
                // TODO: Send an email to the user with a link to reset their password
            },
        },
        baseURL: process.env.BASE_URL || 'http://localhost:5173',
        trustedOrigins: [BASE_URL],
    })
}

export type AuthType = ReturnType<typeof createAuth>
