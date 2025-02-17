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
    return spawn('node', ['--enable-source-maps', 'dist/server/main.js'], {
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

    let childRestarting: Promise<void> | null = null

    function stopChild() {
        return new Promise<void>((resolve) => {
            if (!child) {
                resolve()
                return
            }

            if (child.exitCode !== null) {
                resolve()
                return
            }

            child.on('exit', () => {
                resolve()
            })

            child.kill('SIGTERM')
        })
    }

    async function restartChild() {
        if (childRestarting) {
            await childRestarting
        }

        childRestarting = new Promise<void>((resolve) => {
            stopChild().then(() => {
                child = spawnServer()

                resolve()
            })
        })

        return await childRestarting
    }

    await watchBuildServerBundle({
        ...config.build,
        onSuccess: async () => {
            console.log('> node --enable-source-maps dist/server/main.js')

            restartChild()
        },
    })

    process.on('SIGINT', async () => {
        await stopChild()
        process.exit(0)
    })

    process.on('SIGTERM', async () => {
        await stopChild()
        process.exit(0)
    })

    process.on('exit', async () => {
        await stopChild()
        child?.kill()
    })
}
