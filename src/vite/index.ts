import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { Plugin, PluginOption, UserConfig } from 'vite'
import type { M3StackConfig } from '../config'

export const removeUseClientUseServer = {
    name: 'remove-top-level-directives',
    enforce: 'pre',
    transform(code: string) {
        const lines = code.split('\n')

        if (lines.length === 0) {
            return code
        }

        const firstLine = lines[0] ?? ''

        if (firstLine.startsWith(`"use `) || firstLine.startsWith(`'use `)) {
            lines[0] = ''
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

function flatMapDeep(arr: PluginOption[]): Plugin[] {
    const result: Plugin[] = []

    for (const item of arr) {
        if (Array.isArray(item)) {
            if (item.length > 0) {
                result.push(...flatMapDeep(item)) // Recursive call for nested arrays
            }
        } else if (item && typeof item === 'object' && 'name' in item) {
            result.push(item) // Add C type objects to the result
        }
        // else ignore null, undefined, false, and empty arrays
    }

    return result
}
export function createViteConfig(config?: UserConfig, m3StackConf?: M3StackConfig): UserConfig {
    const pluginsMap = new Map<string, any>()

    const allPlugins: PluginOption[] = flatMapDeep([
        ...defaultViteConfig.plugins,
        ...(m3StackConf?.vite?.plugins || []),
        ...(config?.plugins || []),
    ])

    for (const plugin of allPlugins) {
        if (plugin && typeof plugin === 'object' && 'name' in plugin && typeof plugin.name === 'string') {
            pluginsMap.set(`${plugin.name}`, plugin)
        }
    }

    const serverRoutes: Record<string, string> = {}

    for (const route of m3StackConf?.backendRoutes ?? []) {
        serverRoutes[route] = 'http://localhost:3999'
    }

    const conf: UserConfig = {
        ...defaultViteConfig,
        ...m3StackConf?.vite,
        ...config,
        plugins: [...pluginsMap.values()],
        server: {
            ...defaultViteConfig.server,
            ...m3StackConf?.vite?.server,
            ...config?.server,
            proxy: {
                ...defaultViteConfig.server.proxy,
                ...m3StackConf?.vite?.server?.proxy,
                ...config?.server?.proxy,
                ...serverRoutes,
            },
        },
    }

    return conf
}
