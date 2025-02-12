import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { createTRPCReact } from '@trpc/react-query'
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server'
import type * as React from 'react'
import { useState } from 'react'
import SuperJSON from 'superjson'
import type { AppRouter } from '../server/trpc/root'

export const api = createTRPCReact<AppRouter>()

export function ApiProvider(props: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient())
    const [trpcClient] = useState(() =>
        api.createClient({
            links: [
                httpBatchLink({
                    transformer: SuperJSON,
                    url: '/api/trpc',
                }),
            ],
        }),
    )

    return (
        <api.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>{props.children}</QueryClientProvider>
        </api.Provider>
    )
}

export type RouterInputs = inferRouterInputs<AppRouter>
export type RouterOutputs = inferRouterOutputs<AppRouter>
