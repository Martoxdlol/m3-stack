import { BrowserRouter, Link, Outlet, Route, Routes } from 'react-router'
import { useSession } from '../lib/auth-client'
import { HomeScreen } from './screens/home'
import { LoginScreen } from './screens/login'
import { SignUpScreen } from './screens/signup'

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
                        <RequiresAuth fallback={<Link to='/login'>Please login</Link>}>
                            <Outlet />
                        </RequiresAuth>
                    }
                >
                    <Route path='/' element={<HomeScreen />} />
                </Route>
                <Route
                    element={
                        <RequiresNotAuth fallback={<Link to='/'>Please logout</Link>}>
                            <Outlet />
                        </RequiresNotAuth>
                    }
                >
                    <Route path='/login' element={<LoginScreen />} />
                    <Route path='/signup' element={<SignUpScreen />} />
                </Route>
            </Routes>
        </BrowserRouter>
    )
}
