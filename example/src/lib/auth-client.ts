import { createAuthClient } from 'better-auth/react'
import { useCacheValue } from 'm3-stack/hooks'

export const authClient = createAuthClient({
    baseURL: new URL('/', window.location.href).href,
})

export type Session = ReturnType<typeof authClient.useSession> & {
    loaded: boolean
}

export type SessionData = NonNullable<Session['data']>

/**
 * This functions provides a way of accessing the session with local caching.
 */
export function useSession(): Session {
    const realSession = authClient.useSession()

    const data: SessionData | null = useCacheValue('session-data', realSession.data, !realSession.isPending) ?? null

    return {
        ...realSession,
        data,
        loaded: data !== undefined,
    }
}

export function useUserData() {
    const session = useSession()

    if (!session.data?.user) {
        throw new Error('User is not logged in. Please use some barrier to prevent this component from rendering.')
    }

    return session.data.user
}
