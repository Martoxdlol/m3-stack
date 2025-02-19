import { type BuildServerOptions, type BundleOrWatchFunction, type Dependencies, copyDependencies } from './common'
import { esbuildWatchBuildServerBundle } from './esbuild'
import { rollupWatchBuildServerBundle } from './rollup'

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
            return [esbuildWatchBuildServerBundle, 'esbuild']
        }

        return [rollupWatchBuildServerBundle, 'rollup']
    }

    throw new Error(`Unknown mode: ${mode}`)
}

function onStart(_opts: BuildServerOptions, bundler: 'esbuild' | 'rollup'): void {
    console.info(`Building server bundle with ${bundler}`)
}

function onEnd(_opts: BuildServerOptions, dependencies: Dependencies, bundler: 'esbuild' | 'rollup'): void {
    console.info(`Server bundle built with ${bundler}`)
    console.info(
        'External dependencies',
        Array.from(dependencies.values()).map(
            (d) => `${d.name} -> ${d.root}, ${d.dynamicImport ? 'dynamic' : 'static'}`,
        ),
    )
}

export async function buildServerBundle(opts: BuildServerOptions): Promise<void> {
    const [fn, bundler] = await getFunction(opts, 'build')
    await fn(opts, {
        onEnd: async (d) => {
            onEnd(opts, d.dependencies, bundler)
            await copyDependencies(d.dependencies)
        },
        onStart: () => onStart(opts, bundler),
    })
}

export async function watchServerBundle(opts: BuildServerOptions, onSuccess?: () => unknown): Promise<void> {
    const [fn, bundler] = await getFunction(opts, 'watch')
    await fn(opts, {
        onEnd: (d) => {
            onEnd(opts, d.dependencies, bundler)
            onSuccess?.()
        },
        onStart: () => onStart(opts, bundler),
    })
}
