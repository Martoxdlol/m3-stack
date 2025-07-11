import { cwd } from 'node:process'
import { getModuleRootPath, readPackageJson } from '../../helpers'
import {
    type BuildServerOptions,
    type BundleOrWatchFunction,
    type BundleOrWatchFunctionOpts,
    type Dependencies,
    copyDependencies,
    writeOutputPackageJson,
} from './common'
import { esbuildBuildServerBundle, esbuildWatchBuildServerBundle } from './esbuild'
import { rollupBuildServerBundle, rollupWatchBuildServerBundle } from './rollup'

async function getFunction(
    opts: BuildServerOptions,
    mode: 'watch' | 'build',
): Promise<[BundleOrWatchFunction, 'esbuild' | 'rollup']> {
    let dev = 'esbuild'
    let prod = 'esbuild'

    if (opts.vercel) {
        prod = 'esbuild'
    }

    if (opts.bundler) {
        if (typeof opts.bundler === 'string') {
            dev = opts.bundler
            prod = opts.bundler
        }

        if (typeof opts.bundler === 'object' && opts.bundler.dev) {
            dev = opts.bundler.dev
        }

        if (typeof opts.bundler === 'object' && opts.bundler.prod) {
            prod = opts.bundler.prod
        }

        if (typeof opts.bundler === 'object' && opts.bundler.vercel && opts.vercel) {
            prod = opts.bundler.vercel
        }
    }

    if (mode === 'watch') {
        if (dev === 'rollup') {
            return [rollupWatchBuildServerBundle, 'rollup']
        }

        return [esbuildWatchBuildServerBundle, 'esbuild']
    }

    if (mode === 'build') {
        if (prod === 'rollup') {
            return [rollupBuildServerBundle, 'rollup']
        }

        return [esbuildBuildServerBundle, 'esbuild']
    }

    throw new Error(`Unknown mode: ${mode}`)
}

export async function buildServerBundle(opts: BuildServerOptions): Promise<void> {
    const [fn, bundler] = await getFunction(opts, 'build')
    let dependencies: Dependencies = new Map()

    if (opts.bundleDependencies === false) {
        const pkgJson = await readPackageJson(cwd())

        for (const name of Object.keys(pkgJson?.dependencies ?? {})) {
            const root = await getModuleRootPath(name)

            if (!root) {
                continue
            }

            dependencies.set(name, {
                dynamicImport: false,
                name,
                root,
            })
        }
    }

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

    await writeOutputPackageJson(opts)
}

export async function watchServerBundle(
    opts: BuildServerOptions,
    bundleOpts: BundleOrWatchFunctionOpts,
): Promise<void> {
    await writeOutputPackageJson(opts)
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
