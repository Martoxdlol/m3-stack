import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { UserConfig } from 'vite'

// https://vite.dev/config/
export const defaultViteConfig = {
    plugins: [
        react({
            babel: {
                plugins: [
                    [
                        'babel-plugin-react-compiler',
                        {
                            target: '19',
                        },
                    ],
                ],
            },
        }),
        tailwindcss(),
    ],
    server: {
        host: '0.0.0.0',
        proxy: {
            '/api': 'http://localhost:3999',
        },
    },
    build: {
        outDir: 'dist/public',
    },
} satisfies UserConfig
