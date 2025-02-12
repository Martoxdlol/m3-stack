import { Screen } from 'm3-stack/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ApiProvider } from '../lib/api-client.tsx'
import './index.css'
import { AppRouter } from './router.tsx'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <Screen>
            <ApiProvider>
                <AppRouter />
            </ApiProvider>
        </Screen>
    </StrictMode>,
)
