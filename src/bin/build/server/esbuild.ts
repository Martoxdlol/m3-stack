import commonjsPlugin from '@chialab/esbuild-plugin-commonjs'
import type { BuildOptions, Plugin } from 'esbuild'
import * as esbuild from 'esbuild'
import { rm } from 'node:fs/promises'
import { builtinModules } from 'node:module'
import { getModuleRootPath, parseImportFrom } from '../../helpers'
import type { BuildServerOptions, BundleOrWatchFunctionOpts, Dependencies } from './common'
import { ESBUILD_DEFAULT_EXTERNAL_DEPS, getEntryFile } from './common'

export type BuildOptionsWithRollup = {
    esbuild: BuildOptions
}

export type PluginOptions = {
    onStart?: () => void
    onEnd?: (dependencies: Map<string, string>) => void
}

export async function getBuildOptions(
    options: BuildServerOptions,
    bundleOpts: BundleOrWatchFunctionOpts,
): Promise<BuildOptionsWithRollup | null> {
    const entryFile = await getEntryFile(options)

    if (!entryFile) {
        return null
    }

    const external = new Set<string>(builtinModules)

    if (options.externalDependencies) {
        for (const dep of options.externalDependencies) {
            external.add(dep)
        }
    }

    if (options.internalDependencies) {
        for (const dep of options.internalDependencies) {
            external.delete(dep)
        }
    }

    return {
        esbuild: {
            entryPoints: [entryFile],
            bundle: true,
            outdir: 'dist/server',
            entryNames: 'main',
            assetNames: 'assets/[name]',
            sourcemap: options.sourcemap ?? 'linked',
            splitting: true,
            format: 'esm',
            tsconfig: 'tsconfig.json',
            target: 'esnext',
            platform: 'node',
            keepNames: true,
            treeShaking: true,
            packages: 'bundle',
            minify: options.minify,
            minifyWhitespace: options.minify,
            plugins: [
                commonjsPlugin(),
                customPlugin(options, {
                    external,
                    onStart: () => bundleOpts.onStart?.({ bundler: 'esbuild' }),
                    onEnd: (dependencies) => bundleOpts.onEnd?.({ bundler: 'esbuild', dependencies }),
                }),
            ],
        },
    }
}

export type CustomPluginOptions = {
    onStart?: () => void
    onEnd?: (dependencies: Dependencies) => void
    external: Set<string>
}

export function customPlugin(opts: BuildServerOptions, pluginOpts: CustomPluginOptions): Plugin {
    const dependencies: Dependencies = new Map()
    const dependenciesAndImporter = new Map<string, { importer: string; isDynamic: boolean }>()

    return {
        name: 'm3-stack-esbuild-plugin',
        setup(build) {
            build.onStart(() => {
                dependenciesAndImporter.clear()
                dependencies.clear()
                pluginOpts.onStart?.()
            })
            build.onResolve({ filter: /^@?\w+/ }, (args) => {
                const p = parseImportFrom(args.path)

                if (!p?.moduleName) {
                    return null
                }

                const moduleName = p.moduleName

                if (opts.bundleDependencies && args.kind === 'import-statement') {
                    if (!pluginOpts.external.has(moduleName) && !ESBUILD_DEFAULT_EXTERNAL_DEPS.has(moduleName)) {
                        return null
                    }
                }

                dependenciesAndImporter.set(moduleName, { importer: args.importer, isDynamic: false })

                if (args.kind === 'dynamic-import') {
                    dependenciesAndImporter.get(args.path)!.isDynamic = true
                }

                return {
                    path: args.path,
                    external: true,
                }
            })
            build.onEnd(async () => {
                for (const [dep, data] of dependenciesAndImporter) {
                    const root = await getModuleRootPath(dep, data.importer)
                    if (!root) {
                        console.warn(`Failed to resolve module root for ${dep}`)
                        continue
                    }
                    dependencies.set(dep, {
                        dynamicImport: data.isDynamic,
                        name: dep,
                        root,
                    })
                    pluginOpts.onEnd?.(dependencies)
                }
            })
        },
    }
}

export async function esbuildBuildServerBundle(
    opts: BuildServerOptions,
    bundleOpts: BundleOrWatchFunctionOpts,
): Promise<void> {
    const buildOptions = await getBuildOptions(opts, bundleOpts)

    if (!buildOptions) {
        console.info('Server entry file not found. Skipping server build.')
        return
    }

    await rm('dist/server', { recursive: true }).catch(() => null)
    await rm('dist/node_modules', { recursive: true }).catch(() => null)
    await esbuild.build(buildOptions.esbuild)
}

export async function esbuildWatchBuildServerBundle(
    opts: BuildServerOptions,
    bundleOpts: BundleOrWatchFunctionOpts,
): Promise<void> {
    const buildOptions = await getBuildOptions(opts, bundleOpts)

    if (!buildOptions) {
        console.info('Server entry file not found. Skipping server build.')
        return
    }

    await rm('dist/server', { recursive: true }).catch(() => null)
    await rm('dist/node_modules', { recursive: true }).catch(() => null)

    const ctx = await esbuild.context(buildOptions.esbuild)

    await ctx.watch()
}
