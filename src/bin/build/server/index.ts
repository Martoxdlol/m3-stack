import {
    type BuildServerOptions,
    type BundleOrWatchFunction,
    type BundleOrWatchFunctionOpts,
    type Dependencies,
    copyDependencies,
} from './common'
import { esbuildBuildServerBundle, esbuildWatchBuildServerBundle } from './esbuild'
import { rollupBuildServerBundle, rollupWatchBuildServerBundle } from './rollup'

async function getFunction(
    opts: BuildServerOptions,
    mode: 'watch' | 'build',
): Promise<[BundleOrWatchFunction, 'esbuild' | 'rollup']> {
    if (mode === 'watch') {
        if (opts.bundler === 'rollup') {
            return [rollupWatchBuildServerBundle, 'rollup']
        }

        return [esbuildWatchBuildServerBundle, 'esbuild']
    }

    if (mode === 'build') {
        if (opts.bundler === 'esbuild') {
            return [esbuildBuildServerBundle, 'esbuild']
        }

        return [rollupBuildServerBundle, 'rollup']
    }

    throw new Error(`Unknown mode: ${mode}`)
}

export async function buildServerBundle(opts: BuildServerOptions): Promise<void> {
    const [fn, bundler] = await getFunction(opts, 'build')
    let dependencies: Dependencies = new Map()

    await fn(opts, {
        onEnd: async (d) => {
            dependencies = d.dependencies
        },
    })
    console.info('Server bundle built with', bundler)
    await copyDependencies(dependencies)
    console.info('Copied external dependencies')
    for (const dep of dependencies.keys()) {
        console.info(`- ${dep}`)
    }
}

export async function watchServerBundle(
    opts: BuildServerOptions,
    bundleOpts: BundleOrWatchFunctionOpts,
): Promise<void> {
    const [fn] = await getFunction(opts, 'watch')
    await fn(opts, {
        onEnd: (d) => {
            bundleOpts.onEnd?.(d)
        },
        onStart: (d) => {
            bundleOpts.onStart?.(d)
        },
    })
}
