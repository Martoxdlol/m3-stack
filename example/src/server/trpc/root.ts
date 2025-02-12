import { protectedProcedure, router } from './trpc'

export const appRouter = router({
    hello: protectedProcedure.query(({ ctx }) => {
        return `Hello, ${ctx.session.user.name}!`
    }),
})

export type AppRouter = typeof appRouter
