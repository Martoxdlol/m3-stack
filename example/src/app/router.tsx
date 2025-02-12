import { BrowserRouter, Outlet, Route, Routes } from 'react-router'
import { useSession } from '../lib/auth-client'
import App from './app'

function RequiresAuth(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    const session = useSession()

    if (session.error) {
        return <div>Error: {session.error.message}</div>
    }

    if (!session.loaded) {
        return <div>Loading...</div>
    }

    if (session.data?.user) {
        return <>{props.children}</>
    }

    return <>{props.fallback}</>
}

function RequiresNotAuth(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    const session = useSession()

    if (session.error) {
        return <div>Error: {session.error.message}</div>
    }

    if (!session.loaded) {
        return <div>Loading...</div>
    }

    if (!session.data?.user) {
        return <>{props.children}</>
    }

    return <>{props.fallback}</>
}

export function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                <Route
                    element={
                        <RequiresAuth fallback='Please login'>
                            <Outlet />
                        </RequiresAuth>
                    }
                >
                    <Route path='/' element={<App />} />
                </Route>
                <Route
                    element={
                        <RequiresNotAuth fallback='Please logout'>
                            <Outlet />
                        </RequiresNotAuth>
                    }
                >
                    <Route path='/login' element={<App />} />
                </Route>
            </Routes>
        </BrowserRouter>
    )
}
