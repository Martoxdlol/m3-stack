import type { Auth, BetterAuthOptions } from 'better-auth'
import { type LoadConfigOptions, loadConfig } from 'c12'
import type { Config as DrizzleConfig } from 'drizzle-kit'
import type { UserConfig } from 'vite'
import type { BuildServerOptions } from '../bin/build/server'

export function loadM3StackConfigOptions(): LoadConfigOptions {
    return {
        name: 'm3-stack',
    }
}

export async function loadM3StackConfig(): Promise<M3StackConfig> {
    const data = await loadConfig(loadM3StackConfigOptions())

    if (data.configFile) {
        console.info('Loaded m3-stack config from', data.configFile)
    } else {
        console.info('No m3-stack config found. Using defaults.')
    }

    return data.config
}

export type M3StackConfig = {
    vite?: UserConfig
    drizzle?: Partial<DrizzleConfig>
    betterAuth?: Auth | BetterAuthOptions | any
    build?: BuildServerOptions | null
}

export function createConfig(config?: M3StackConfig) {
    return {
        ...config,
    }
}
