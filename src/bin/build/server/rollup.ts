import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import { type InputOptions, type OutputOptions, type WatcherOptions, rollup, watch } from 'rollup'
import { type BuildServerOptions, type BundleOrWatchFunctionOpts, getEntryFile } from './common'

export type BuildOptionsWithRollup = {
    rollup: {
        input: InputOptions
        output: OutputOptions
        watcher: WatcherOptions
    }
}

export async function getBuildOptions(options: BuildServerOptions): Promise<BuildOptionsWithRollup | null> {
    const entryFile = await getEntryFile(options)

    if (!entryFile) {
        return null
    }

    return {
        rollup: {
            input: {
                input: entryFile,
                plugins: [
                    nodeResolve(),
                    commonjs({ esmExternals: true }),
                    typescript(),
                    json(),
                    // del({ targets: 'dist/server/*' }),
                ],
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
                esModule: true,
                minifyInternalExports: false,
                sourcemap: true,
            },
            watcher: {},
        },
    }
}

export async function rollupBuildServerBundle(
    opts: BuildServerOptions,
    bundleOpts: BundleOrWatchFunctionOpts,
): Promise<void> {
    const buildOptions = await getBuildOptions(opts)
    if (!buildOptions) {
        console.info('Server entry file not found. Skipping server build.')
        return
    }

    await bundleOpts.onStart?.({ bundler: 'rollup' })
    const bundle = await rollup(buildOptions.rollup.input)
    await bundle.write(buildOptions.rollup.output)
    await bundleOpts.onEnd?.({ dependencies: new Map(), bundler: 'rollup' })
}

export async function rollupWatchBuildServerBundle(
    opts: BuildServerOptions,
    bundleOpts: BundleOrWatchFunctionOpts,
): Promise<void> {
    const buildOptions = await getBuildOptions(opts)
    if (!buildOptions) {
        console.info('Server entry file not found. Skipping server build.')
        return
    }

    const watcher = watch({
        ...buildOptions.rollup.input,
        output: buildOptions.rollup.output,
        watch: buildOptions.rollup.watcher,
    })
    watcher.on('change', (event) => {
        console.info('file changed:', event)
    })
    watcher.on('event', async (event) => {
        if (event.code === 'ERROR') {
            console.error(event.error)
        }
        if (event.code === 'BUNDLE_START') {
            await bundleOpts.onStart?.({ bundler: 'rollup' })
        }
        if (event.code === 'BUNDLE_END') {
            await bundleOpts.onEnd?.({ dependencies: new Map(), bundler: 'rollup' })
        }
    })
}
