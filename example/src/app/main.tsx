import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app.tsx'
import { Screen } from 'm3-stack/react'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Screen>
      <App />
    </Screen>
  </StrictMode>,
)
