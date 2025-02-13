import { serve } from '@hono/node-server'
import 'dotenv/config'
import { Hono } from 'hono'
import { type AuthType, createAuth } from './auth'
import { type DBType, createDatabase } from './db'
import { tRPCHandler } from './trpc/handler'

declare module 'hono' {
    interface ContextVariableMap {
        db: DBType
        auth: AuthType
    }
}

export async function main() {
    const db = createDatabase()
    const auth = createAuth({ db })

    const app = new Hono()
        .use(async (c, next) => {
            c.set('db', db)
            c.set('auth', auth)
            return next()
        })
        .get('/api', async (c) => {
            return c.text('Hello, World!')
        })
        .use('/api/trpc/*', async (c) => {
            return tRPCHandler(c)
        })

    app.on(['POST', 'GET'], '/api/auth/*', (c) => {
        return auth.handler(c.req.raw)
    })

    if (!process.env.VERCEL && !process.env.NO_LISTEN) {
        const server = serve({
            fetch: app.fetch,
            port: 3999,
            hostname: '0.0.0.0',
        })

        server.on('listening', () => {
            const addr = server.address() as { address: string; port: number }

            console.log('Server listening on', addr)
        })
    }

    return app
}

const app = await main()

export const GET = app.fetch
export const POST = app.fetch
export const PUT = app.fetch
export const PATCH = app.fetch
export const DELETE = app.fetch
export const HEAD = app.fetch
export const OPTIONS = app.fetch
