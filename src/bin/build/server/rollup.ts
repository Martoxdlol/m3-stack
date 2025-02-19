import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import { mkdir, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { type InputOptions, type OutputOptions, type WatcherOptions, rollup, watch } from 'rollup'
import { type BuildServerOptions, DEFAULT_SERVER_ENTRY_PATHS } from '.'
import { findMatchingFile } from '../../helpers'

export type BuildOptions = {
    rollup: {
        input: InputOptions
        output: OutputOptions
        watcher: WatcherOptions
    }
}

export async function getBuildOptions(options: BuildServerOptions): Promise<BuildOptions | null> {
    const basePath = resolve(options.basePath ?? process.cwd())

    const entryFile = options.entryFile
        ? resolve(basePath, options.entryFile)
        : await findMatchingFile(basePath, DEFAULT_SERVER_ENTRY_PATHS, ['js', 'ts', 'jsx', 'tsx'])

    if (!entryFile) {
        return null
    }

    return {
        rollup: {
            input: {
                input: entryFile,
                plugins: [nodeResolve(), commonjs({ esmExternals: true }), typescript(), json()],
                onLog(level, log, handler) {
                    if (log.code === 'CIRCULAR_DEPENDENCY') {
                        return // Ignore circular dependency warnings
                    }

                    handler(level, log)
                },
            },
            output: {
                format: 'esm',
                dir: 'dist/server',
                name: 'main',
                minifyInternalExports: false,
                sourcemap: true,
            },
            watcher: {},
        },
    }
}

export async function rollupBuildServerBundle(opts: BuildServerOptions) {
    const buildOptions = await getBuildOptions(opts)
    if (!buildOptions) {
        console.info('Server entry file not found. Skipping server build.')
        return
    }

    const bundle = await rollup(buildOptions.rollup.input)
    await bundle.write(buildOptions.rollup.output)
}

export async function rollupWatchBuildServerBundle(opts: BuildServerOptions & { onSuccess?: () => unknown }) {
    const buildOptions = await getBuildOptions(opts)
    if (!buildOptions) {
        console.info('Server entry file not found. Skipping server build.')
        return
    }

    const watcher = watch(buildOptions.rollup.input)
    watcher.on('change', (event) => {
        console.log(event)
    })
    watcher.on('event', async (event) => {
        if (event.code === 'BUNDLE_START') {
            await rm('dist/server', { recursive: true, force: true })
            await mkdir('dist/server', { recursive: true })
        }
        if (event.code === 'BUNDLE_END') {
            opts.onSuccess?.()
        }
    })
}
