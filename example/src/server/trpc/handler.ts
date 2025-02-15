import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import type { Context } from 'hono'
import { appRouter } from './root'

/**
 * HTTP handler for tRPC, must be mounted on the server at /api/trpc
 */
export function tRPCHandler(c: Context): Promise<Response> {
    return fetchRequestHandler({
        endpoint: '/api/trpc',
        req: c.req.raw,
        router: appRouter,
        createContext: (opts) => ({
            auth: c.get('auth'),
            db: c.get('db'),
            req: opts.req,
            strings: c.get('strings'),
        }),
        onError:
            process.env.NODE_ENV === 'development'
                ? ({ path, error }) => {
                      console.error(`❌ tRPC failed on ${path ?? '<no-path>'}: ${error.message}`)
                  }
                : undefined,
    })
}
