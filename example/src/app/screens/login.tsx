import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { authClient } from '../../lib/auth-client'
import { getString } from '../../lib/strings-client'

export function LoginScreen() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    const navigate = useNavigate()

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        authClient.signIn.email({ email, password }).then(() => {
            navigate('/')
        })
    }

    return (
        <div>
            <form onSubmit={handleSubmit}>
                <div>
                    <input
                        placeholder='email'
                        className='border'
                        type='email'
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
                <div>
                    <input
                        className='border'
                        type='password'
                        value={password}
                        placeholder='password'
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
                <div>
                    <button className='border' type='submit'>
                        {getString('login')}
                    </button>
                </div>
            </form>
            <div>
                <Link to='/signup'>SignUp</Link>
            </div>
        </div>
    )
}
