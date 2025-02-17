import type { Auth, BetterAuthOptions } from 'better-auth'
import { type LoadConfigOptions, loadConfig } from 'c12'
import type { Config as DrizzleConfig } from 'drizzle-kit'
import type { UserConfig } from 'vite'
import type { BuildServerOptions } from '../bin/build/server'

export function loadM3StackConfigOptions(): LoadConfigOptions {
    return {
        name: 'm3-stack',
        packageJson: true,
    }
}

export async function loadM3StackConfig(): Promise<M3StackConfig> {
    const data = await loadConfig(loadM3StackConfigOptions())

    if (data.configFile) {
        console.info('Loaded m3-stack config from', data.configFile)
    } else {
        console.info('No m3-stack config found. Using defaults.')
    }

    if (data.config.message) {
        console.info('Config debug message:', data.config.message)
    }

    return data.config
}

export type M3StackConfig = {
    message?: string
    vite?: UserConfig
    drizzle?: Partial<DrizzleConfig>
    betterAuth?: Auth | BetterAuthOptions | any
    build?: BuildServerOptions | null
    apiRoute?: false | null
    backendRoutes?: string[]
    vercel?: {
        runtime: 'nodejs22.x' | 'nodejs20.x' | 'edge' | string
        regions?: string[]
        environment?: Record<string, string>[]
        memory?: number
        maxDuration?: number
        routes?: Record<string, string | number | boolean | null>[]
    }
}

export function createConfig(config?: M3StackConfig) {
    return {
        ...config,
    }
}
