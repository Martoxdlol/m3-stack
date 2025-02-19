import { serve } from '@hono/node-server'
import { createClient } from '@libsql/client/web'
import 'dotenv/config'
import { Hono } from 'hono'
import { type Strings, createStrings } from '../lib/strings'
import { type AuthType, createAuth } from './auth'
import { type DBType, createDatabase, type schema } from './db'
import { tRPCHandler } from './trpc/handler'

declare global {
    interface M3StackGlobals {
        db: DBType
        auth: AuthType
        i18n: Strings
        strings: ReturnType<Strings['withLang']>
        lang: Strings['supportedLanguages'][number]
        schema: typeof schema
    }
}
export async function main() {
    const db = createDatabase()
    const auth = createAuth({ db })
    const i18n = createStrings()
    console.log(createClient)
    const app = new Hono()
        .use(async (c, next) => {
            const lang = i18n.matchLang(c.req.header('Accept-Language'))
            c.set('db', db)
            c.set('auth', auth)
            c.set('i18n', i18n)
            c.set('lang', lang)
            c.set('strings', i18n.withLang(lang))
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
            console.log('Server listening on', server.address())
        })
    } else {
        console.log('Server not listening, using app.fetch with serverless provider')
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
