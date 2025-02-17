import { type ChildProcess, spawn } from 'node:child_process'
import type { M3StackConfig } from '../../config'
import { buildServerBundle, watchBuildServerBundle } from './server'

export async function buildCommand(config: M3StackConfig, _args: string[]) {
    await buildServerBundle(config.build ?? {})
}

export async function buildWatchCommand(config: M3StackConfig, _args: string[]) {
    await watchBuildServerBundle(config.build ?? {})
}

export function spawnServer() {
    return spawn('node', ['--watch', '--enable-source-maps', 'dist/server/main.js'], {
        stdio: 'inherit',
        shell: true,
        env: {
            ...process.env,
            NODE_ENV: 'development',
        },
    })
}

export async function buildDevCommand(config: M3StackConfig, _args: string[]) {
    let child: ChildProcess | undefined

    let firstSuccess = false

    await watchBuildServerBundle({
        ...config.build,

        onSuccess: async () => {
            console.log('> node --enable-source-maps dist/server/main.js')
            if (!firstSuccess) {
                firstSuccess = true
                child = spawnServer()
            }
        },
    })

    process.on('SIGINT', async () => {
        child?.kill()
        process.exit(0)
    })

    process.on('SIGTERM', async () => {
        child?.kill()
        process.exit(0)
    })

    process.on('exit', async () => {
        child?.kill()
        child?.kill()
    })
}
