import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { createConfig } from 'm3-stack/config'
import { createAuth } from '../src/server/auth'
import { createDatabase } from '../src/server/db'

const db = createDatabase()

export default createConfig({
    betterAuth: createAuth({ db }),
    vite: {
        plugins: [react(), tailwindcss()],
    },
})
