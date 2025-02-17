import { nativeModulesPlugin } from '@douglasneuroinformatics/esbuild-plugin-native-modules'
import { EsmExternalsPlugin } from '@esbuild-plugins/esm-externals'
import type { BuildOptions } from 'esbuild'
import * as esbuild from 'esbuild'
import { cp, readdir, rm, writeFile } from 'node:fs/promises'
import { builtinModules } from 'node:module'
import { join, resolve } from 'node:path'
import { findMatchingFile, readPackageJson, resolveModuleDir, resolvePath } from '../helpers'

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
}

export const DEFAULT_SERVER_ENTRY_PATHS = [
    'src/server/index',
    'src/server/main',
    'src/server',
    'server/index',
    'server/main',
    'server',
]

export async function buildServerBundleGetOpts(options: BuildServerOptions): Promise<{
    esbuild: RunEsbuildOptions
    newPkgJsonDeps: Record<string, string>
    basePath: string
    external: string[]
}> {
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
        throw new Error('Server entry file not found')
    }

    const external = new Set<string>()

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

    await removeDistServerDir()

    await runEsbuildBuildServer(opts.esbuild)

    await buildOutputPackageJson({ dependencies: opts.newPkgJsonDeps })

    await copyFilesToOutputDir(opts.basePath, options.copyFiles ?? {})

    await removeDistCopiedFiles()

    await copyModulesToDist(Array.from(new Set([...opts.external, ...(options.internalDependencies ?? [])])))
}

export async function watchBuildServerBundle(
    options: BuildServerOptions & { onSuccess?: () => void; onFail?: () => void; onStartBuild?: () => void },
) {
    const opts = await buildServerBundleGetOpts(options)

    await removeDistServerDir()

    await runEsbuildBuildServer({
        ...opts.esbuild,
        watch: true,
        onWatchBuildStart: async () => {
            console.info('Building server...')
            options.onStartBuild?.()
        },
        async onWatchBuildEnd(result) {
            if (result.errors.length > 0) {
                console.error('Server build failed. Check errors above')

                options.onFail?.()

                return
            }

            await buildOutputPackageJson({ dependencies: opts.newPkgJsonDeps })
            await copyFilesToOutputDir(opts.basePath, options.copyFiles ?? {}, true)
            await removeDistCopiedFiles()
            await copyModulesToDist(
                Array.from(new Set([...opts.external, ...(options.internalDependencies ?? [])])),
                true,
            )

            console.info('Server build done')
            options.onSuccess?.()
        },
    })
}

export type RunEsbuildOptions = {
    entryPoint: string
    sourcemap?: boolean | 'linked' | 'inline' | 'external' | 'both'
    external?: string[]
    watch?: boolean
    onWatchBuildStart?: () => void
    onWatchBuildEnd?: (result: esbuild.BuildResult) => void
}

export async function runEsbuildBuildServer(opts: RunEsbuildOptions) {
    const external = new Set<string>(opts.external)

    for (const btin of builtinModules) {
        external.add(btin)
        external.add(`node:${btin}`)
    }

    const esbuildOpts: BuildOptions = {
        entryPoints: ['src/server/main.tsx'],
        bundle: true,
        outfile: 'dist/server/main.js',
        sourcemap: opts.sourcemap ?? 'linked',
        format: 'esm',
        tsconfig: 'tsconfig.json',
        target: 'esnext',
        platform: 'neutral',
        keepNames: true,
        treeShaking: true,
        packages: 'bundle',
        external: Array.from(external),
        plugins: [
            nativeModulesPlugin({ resolveFailure: 'throw' }),
            EsmExternalsPlugin({ externals: Array.from(external) }),
            {
                name: 'watch-events',
                setup(build) {
                    build.onStart(() => {
                        opts.onWatchBuildStart?.()
                    })
                    build.onEnd((result) => {
                        opts.onWatchBuildEnd?.(result)
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

        const fromResolved = resolvePath(from, basePath)
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

export async function copyModulesToDist(modules: string[], silent = false) {
    await rm('dist/node_modules', { recursive: true, force: true }).catch((e) => {
        if (e.code !== 'ENOENT') {
            throw e
        }
    })

    for (const m of modules) {
        const resolved = resolveModuleDir(m)
        if (!resolved) {
            throw new Error(`Module not found: ${m}`)
        }

        if (!silent) {
            console.info(`Adding module ${m} to output. ${resolved} -> dist/node_modules/${m}`)
        }
        await cp(resolved, `dist/node_modules/${m}`, { recursive: true, force: true })
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
