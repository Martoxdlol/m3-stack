import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { UserConfig } from 'vite'
import type { M3StackConfig } from '../config'

export const removeUseClientUseServer = {
    name: 'remove-top-level-directives',
    enforce: 'pre',
    transform(code: string) {
        const lines = code.split('\n')

        if (lines.length === 0) {
            return code
        }

        if (lines[0]!.startsWith(`"use `) || lines[0]!.startsWith(`'use `)) {
            lines.shift()
        }

        return lines.join('\n')
    },
} as const

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
        removeUseClientUseServer,
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

export function createViteConfig(config?: UserConfig, m3StackConf?: M3StackConfig): UserConfig {
    const pluginsMap = new Map<string, any>()

    const allPlugins = [...defaultViteConfig.plugins, ...(m3StackConf?.vite?.plugins || []), ...(config?.plugins || [])]

    for (const plugin of allPlugins) {
        if (plugin && typeof plugin === 'object' && 'name' in plugin && typeof plugin.name === 'string') {
            pluginsMap.set(`${plugin.name}`, plugin)
        }
    }

    const conf: UserConfig = {
        ...defaultViteConfig,
        ...config,
        plugins: [...pluginsMap.values()],
    }

    return conf
}
