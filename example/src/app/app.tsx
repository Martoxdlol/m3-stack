import { authClient, useSession } from '../lib/auth-client'

function App() {
    const session = useSession()

    return (
        <div className='size-full border-2 border-dashed border-red-500'>
            <button
                type='button'
                onClick={() => {
                    authClient.signUp
                        .email({
                            email: 'tomascichero@gmail.com',
                            password: 'password',
                            name: 'Tomas Cichero',
                        })
                        .then(console.log)
                }}
            >
                Click me
            </button>
            <div>{session.data?.user?.email}</div>
            <button
                type='button'
                onClick={() => {
                    authClient.signIn
                        .email({
                            email: 'tomascichero@gmail.com',
                            password: 'password',
                        })
                        .then(console.log)
                }}
            >
                Login
            </button>
            <button
                type='button'
                onClick={() => {
                    authClient.signOut().then(console.log)
                }}
            >
                Logout
            </button>
        </div>
    )
}

export default App
