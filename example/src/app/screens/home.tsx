import { useNavigate } from 'react-router'
import { api } from '../../lib/api-client'
import { authClient, useUserData } from '../../lib/auth-client'

export function HomeScreen() {
    const user = useUserData()

    const { data: message } = api.hello.useQuery()

    const navigate = useNavigate()

    return (
        <div>
            <h1>Home</h1>
            <p>{message}</p>
            <p>{user?.email}</p>
            <div>
                <button
                    type='button'
                    onClick={() => {
                        authClient.signOut().then(() => navigate('/login'))
                    }}
                >
                    Sign Out
                </button>
            </div>
        </div>
    )
}
