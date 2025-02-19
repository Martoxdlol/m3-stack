import commonjsPlugin from '@chialab/esbuild-plugin-commonjs'
import type { BuildOptions } from 'esbuild'
import * as esbuild from 'esbuild'
import { cp, readdir, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { findMatchingFile, getModuleRootPath, parseImportFrom, readPackageJson, resolvePath } from '../helpers'

export type BuildServerOptions = {
    /**
     * The path of the project root.
     *
     * The default is current working directory.
     */
    basePath?: string
    /**
     * Entry file of the server.
     */
    entryFile?: string
    /**
     * Copy dependencies to the output directory.
     */
    copyDependencies?: string[]
    /**
     * Copy files to the output directory.
     * Including module files.
     *
     * For example:
     * - { 'components-lib/button.css' : './public/styles/button.css' } -> will copy to: ./public/styles/button.css
     */
    copyFiles?: Record<string, string>
    /**
     * External dependencies. These dependencies will not be bundled.
     * And will be copied to the output directory.
     */
    externalDependencies?: string[]
    /**
     * Internal dependencies. These dependencies will be bundled even if added as peerDependencies of the project
     * or if they are a dependency of an external dependency.
     */
    internalDependencies?: string[]
    /**
     * Read 'build.server' field from package.json and merge it with the options.
     *
     * If options not provided (called from CLI), default is true. Otherwise, default is false.
     */
    includePackageJsonOptions?: boolean
    /**
     * Sourcemap type.
     *
     * Documentation: https://esbuild.github.io/api/#sourcemap
     */
    sourcemap?: boolean | 'linked' | 'inline' | 'external' | 'both'

    /**
     * Bundle dependencies. If true, all dependencies will be bundled into the output.
     * If false, the will be copied to the output directory node_modules.
     */
    bundleDependencies?: boolean
}

export const DEFAULT_SERVER_ENTRY_PATHS = [
    'src/server/index',
    'src/server/main',
    'src/server',
    'server/index',
    'server/main',
    'server',
    'lib/server/index',
    'lib/server/main',
    'lib/server',
    'src/index',
    'src/main',
    'src',
]

export const DEFAULT_EXTERNAL_LIBS = ['@electric-sql/pglite', '@libsql/client']

export async function buildServerBundleGetOpts(options: BuildServerOptions): Promise<{
    esbuild: RunEsbuildOptions
    newPkgJsonDeps: Record<string, string>
    basePath: string
    external: string[]
} | null> {
    const basePath = resolve(options.basePath ?? process.cwd())

    const pkgJsonContent = await readPackageJson(basePath)

    const allDepsEntries = [
        Object.entries(pkgJsonContent?.dependencies ?? {}),
        Object.entries(pkgJsonContent?.devDependencies ?? {}),
        Object.entries(pkgJsonContent?.peerDependencies ?? {}),
    ]

    // Will use this to get dependencies versions
    const allDepsMap = allDepsEntries.reduce((acc, entries) => {
        for (const [name, version] of entries) {
            acc.set(name, version)
        }
        return acc
    }, new Map<string, string>())

    if (!pkgJsonContent) {
        throw new Error('Project package.json not found')
    }

    const entryFile = options.entryFile
        ? resolve(basePath, options.entryFile)
        : await findMatchingFile(basePath, DEFAULT_SERVER_ENTRY_PATHS, ['js', 'ts', 'jsx', 'tsx'])

    if (!entryFile) {
        console.info('Server entry file not found. Skipping server build.')
        return null
    }

    const external = new Set<string>(DEFAULT_EXTERNAL_LIBS)

    for (const dep of options.externalDependencies ?? []) {
        external.add(dep)
    }

    for (const name of Object.keys(pkgJsonContent.peerDependencies ?? {})) {
        external.add(name)
    }

    // output package.json
    const newPkgJsonDeps: Record<string, string> = {}
    for (const dep of external) {
        const version = allDepsMap.get(dep)
        if (version) {
            newPkgJsonDeps[dep] = version
        }
    }

    return {
        esbuild: {
            entryPoint: entryFile,
            sourcemap: options.sourcemap,
            external: Array.from(external),
            bundleDependencies: options.bundleDependencies !== false,
        },
        newPkgJsonDeps,
        basePath,
        external: Array.from(external),
    }
}

export async function removeDistServerDir() {
    await rm(join('dist/server'), { recursive: true, force: true }).catch((e) => {
        if (e.code !== 'ENOENT') {
            throw e
        }
    })
}

export async function buildServerBundle(options: BuildServerOptions) {
    const opts = await buildServerBundleGetOpts(options)

    if (!opts) {
        return
    }

    await removeDistServerDir()

    await deleteDistNodeModules()

    await runEsbuildBuildServer({
        ...opts.esbuild,
        onBuildEnd: async (r) => {
            await copyModulesToDist(Array.from(r.dependencies.entries()).map(([name, root]) => ({ name, root })))
        },
    })

    await buildOutputPackageJson({ dependencies: opts.newPkgJsonDeps })

    await copyFilesToOutputDir(opts.basePath, options.copyFiles ?? {})

    await removeDistCopiedFiles()
}

export async function watchBuildServerBundle(
    options: BuildServerOptions & { onSuccess?: () => void; onFail?: () => void; onStartBuild?: () => void },
) {
    const opts = await buildServerBundleGetOpts(options)

    if (!opts) {
        return
    }

    await removeDistServerDir()

    await runEsbuildBuildServer({
        ...opts.esbuild,
        watch: true,
        onWatchBuildStart: async () => {
            console.info('Building server...')
            options.onStartBuild?.()
        },
        async onWatchBuildEnd(result, o) {
            if (result.errors.length > 0) {
                console.error('Server build failed. Check errors above')

                options.onFail?.()

                return
            }

            await buildOutputPackageJson({ dependencies: opts.newPkgJsonDeps })
            await copyFilesToOutputDir(opts.basePath, options.copyFiles ?? {}, true)
            await removeDistCopiedFiles()
            await deleteDistNodeModules()
            await copyModulesToDist(Array.from(o.dependencies.entries()).map(([name, root]) => ({ name, root })))

            console.info('Server build done')
            options.onSuccess?.()
        },
    })
}

export type BuildOutput = {
    dynamicImports: string[]
    dependencies: Map<string, string>
}

export type RunEsbuildOptions = {
    entryPoint: string
    sourcemap?: boolean | 'linked' | 'inline' | 'external' | 'both'
    external?: string[]
    bundleDependencies?: boolean
    watch?: boolean
    onWatchBuildStart?: () => void
    onWatchBuildEnd?: (result: esbuild.BuildResult, output: BuildOutput) => unknown
    onBuildEnd?: (output: BuildOutput) => unknown
}

export async function runEsbuildBuildServer(opts: RunEsbuildOptions) {
    const external = new Set<string>(opts.external)

    const dependencies = new Map<string, string>()
    const dependenciesAndImporter = new Map<string, string>()

    const dynamicImports = new Set<string>()

    const esbuildOpts: BuildOptions = {
        entryPoints: [opts.entryPoint],
        bundle: true,
        outdir: 'dist/server',
        entryNames: 'main',
        assetNames: 'assets/[name]',
        sourcemap: opts.sourcemap ?? 'linked',
        splitting: true,
        format: 'esm',
        tsconfig: 'tsconfig.json',
        target: 'esnext',
        platform: 'node',
        keepNames: true,
        treeShaking: true,
        packages: 'bundle',
        external: Array.from(external),
        plugins: [
            {
                name: 'find-require',
                setup(build) {
                    build.onStart(() => {
                        dependenciesAndImporter.clear()
                        dependencies.clear()
                        dynamicImports.clear()
                    })
                    build.onResolve({ filter: /^@?\w+/ }, (args) => {
                        if (opts.bundleDependencies && args.kind === 'import-statement') {
                            const p = parseImportFrom(args.path)
                            if (!p?.moduleName || !external.has(p.moduleName)) {
                                return null
                            }
                        }

                        dependenciesAndImporter.set(args.path, args.importer)

                        if (args.kind === 'dynamic-import') {
                            dynamicImports.add(args.path)
                        }

                        return {
                            path: args.path,
                            external: true,
                        }
                    })
                    build.onEnd(async () => {
                        for (const [dep, importer] of dependenciesAndImporter) {
                            const root = await getModuleRootPath(dep, importer)
                            if (!root) {
                                console.warn(`Failed to resolve module root for ${dep}`)
                                continue
                            }
                            dependencies.set(dep, root)
                        }
                    })
                },
            },
            // nativeModulesPlugin({ resolveFailure: 'throw' }),
            commonjsPlugin(),
            {
                name: 'watch-events',
                setup(build) {
                    build.onStart(() => {
                        opts.onWatchBuildStart?.()
                    })
                    build.onEnd((result) => {
                        opts.onWatchBuildEnd?.(result, { dynamicImports: Array.from(dynamicImports), dependencies })
                        opts.onBuildEnd?.({ dynamicImports: Array.from(dynamicImports), dependencies })
                    })
                },
            },
        ],
    }

    if (opts.watch) {
        const ctx = await esbuild.context(esbuildOpts)

        await ctx.watch()

        return
    }

    const r = await esbuild.build(esbuildOpts)

    if (r.errors.length > 0) {
        console.error('Server build failed')
        let errorsInfo = 'esbuild errors:\n'
        for (const e of r.errors) {
            errorsInfo += `${JSON.stringify(e)}\n`
        }

        throw new Error(errorsInfo.trimEnd())
    }
}

export type BuildOutPkgJsonOpts = {
    dependencies: Record<string, string>
}

export async function buildOutputPackageJson(opts: BuildOutPkgJsonOpts) {
    await writeFile(
        'dist/package.json',
        JSON.stringify(
            {
                type: 'module',
                main: 'server/main.js',
                scripts: {
                    start: 'node --enable-source-maps server/main.js',
                },
                dependencies: opts.dependencies,
            },
            null,
            2,
        ),
    )
}

export async function copyFilesToOutputDir(basePath: string, copyFiles: Record<string, string>, silent = false) {
    for (const [from, to] of Object.entries(copyFiles)) {
        if (to.includes('..') || to.startsWith('/')) {
            throw new Error(`Invalid copy-to path ${to}`)
        }

        const fromResolved = await resolvePath(from, basePath)
        const toResolved = join(basePath, 'dist', to)

        if (!fromResolved) {
            throw new Error(`Invalid copy-from path ${from}`)
        }

        if (!silent) {
            console.info(`Copying ${fromResolved} to ${toResolved}`)
        }

        await cp(fromResolved, toResolved, { recursive: true, force: true }).catch((err) => {
            console.error(`Failed to copy ${fromResolved} to ${toResolved}`, err)
            throw err
        })
    }
}

export type CopyModule = {
    name: string
    base?: string
    root?: string
}

export async function deleteDistNodeModules() {
    await rm('dist/node_modules', { recursive: true, force: true }).catch((e) => {
        if (e.code !== 'ENOENT') {
            throw e
        }
    })
}

export async function copyModulesToDist(modules: CopyModule[], silent = false) {
    for (const m of modules) {
        const resolved = m.root ?? (await getModuleRootPath(m.name, m.base))
        if (!resolved) {
            throw new Error(`Module not found: ${m}`)
        }

        if (!silent) {
            console.info(`Adding module ${m.name} to output. ${resolved} -> dist/node_modules/${m.name}`)
        }
        await cp(resolved, `dist/node_modules/${m.name}`, { recursive: true, force: true })
    }
}

export async function removeDistCopiedFiles() {
    const distFiles = await readdir('dist')
    for (const f of distFiles) {
        if (['public', 'server', 'node_modules', 'package.json'].includes(f)) {
            continue
        }

        await rm(`dist/${f}`, { recursive: true, force: true })
    }
}
