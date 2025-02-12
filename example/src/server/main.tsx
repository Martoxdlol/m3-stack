import { Hono } from "hono";
import { serve } from '@hono/node-server'
import { createDatabase, type DBType } from './db'
import { type AuthType, createAuth } from "./auth";
import 'dotenv/config'

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
            c.set("db", db)
            c.set("auth", auth)
            return next()
        })
        .get("/api", async (c) => {
            return c.text("Hello, World!")
        })

    app.on(["POST", "GET"], "/api/auth/*", (c) => {
        return auth.handler(c.req.raw);
    });

    const server = serve({
        fetch: app.fetch,
        port: 3999,
        hostname: '0.0.0.0'
    })


    server.on('listening', () => {
        const addr = server.address() as { address: string, port: number }

        console.log('Server listening on', addr)
    })
}

// THIS MUST BE THE ONLY TOP LEVEL CODE EXECUTION
main()