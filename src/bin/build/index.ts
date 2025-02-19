import { type ChildProcess, spawn } from 'node:child_process'
import type { M3StackConfig } from '../../config'
import { buildServerBundle, watchServerBundle } from './server'

export async function buildCommand(config: M3StackConfig, _args: string[]) {
    await buildServerBundle(config.build ?? {})
    console.info('Built server bundle. See ./dist')
}

export async function buildWatchCommand(config: M3StackConfig, _args: string[]) {
    await watchServerBundle(config.build ?? {})
}

export function spawnServer() {
    return spawn('node', ['--watch', '--enable-source-maps', 'dist/server/main.js'], {
        stdio: 'inherit',
        shell: true,
        env: {
            ...process.env,
            NODE_ENV: 'development',
            ENABLE_SOURCE_MAPS: 'true',
        },
    })
}

export async function buildDevCommand(config: M3StackConfig, _args: string[]) {
    let child: ChildProcess | undefined

    let firstSuccess = false

    await watchServerBundle(
        {
            ...config.build,
        },
        async () => {
            console.info('> node --enable-source-maps dist/server/main.js')
            if (!firstSuccess) {
                firstSuccess = true
                child = spawnServer()
            }
        },
    )

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
