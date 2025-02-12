import { useState } from 'react'
import { useNavigate } from 'react-router'
import { authClient } from '../../lib/auth-client'

export function SignUpScreen() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [name, setName] = useState('')

    const navigate = useNavigate()

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        authClient.signUp.email({ email, password, name }).then(() => {
            navigate('/')
        })
    }

    return (
        <div>
            <form onSubmit={handleSubmit}>
                <div>
                    <input
                        placeholder='name'
                        className='border'
                        type='text'
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>
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
                        SignUp
                    </button>
                </div>
            </form>
        </div>
    )
}
