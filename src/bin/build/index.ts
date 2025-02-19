import { type ChildProcess, spawn } from 'node:child_process'
import type { M3StackConfig } from '../../config'
import { buildServerBundle, watchServerBundle } from './server'

export async function buildCommand(config: M3StackConfig, _args: string[]) {
    await buildServerBundle(config.build ?? {})
    console.info('---------------------')
    console.info('dist/')
    console.info('    server/')
    console.info('        main.js')
    console.info('        ...')
    console.info('    public/')
    console.info('        index.html')
    console.info('        ...')
    console.info('    node_modules/')
    console.info('    package.json')
    console.info('---------------------')
}

export async function buildWatchCommand(config: M3StackConfig, _args: string[]) {
    await watchServerBundle(config.build ?? {}, {})
}

export function spawnServer() {
    console.info('> node --watch --enable-source-maps dist/server/main.js')
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
        {
            onEnd: async () => {
                if (!firstSuccess || child?.killed || child?.exitCode !== null) {
                    firstSuccess = true
                    child = spawnServer()
                }
            },
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
