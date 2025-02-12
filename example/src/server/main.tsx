import { Hono } from "hono";
import { serve } from '@hono/node-server'

const app = new Hono()
    .use(async (_c, next) => {
        console.log("Request received")
        return next()
    })
    .get("/api", async (c) => {
        return c.text("Hello, World!")
    })

serve({
    fetch: app.fetch,
    port: 3999
})