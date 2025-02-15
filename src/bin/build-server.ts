import { nativeModulesPlugin } from '@douglasneuroinformatics/esbuild-plugin-native-modules'
import { EsmExternalsPlugin } from '@esbuild-plugins/esm-externals'
import * as esbuild from 'esbuild'
import { cp, rm, writeFile } from 'node:fs/promises'
import { builtinModules } from 'node:module'
import { join, resolve } from 'node:path'
import { findMatchingFile, mergeOptionsDeep, readPackageJson, resolvePath } from './helpers'

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

export async function buildServerBundle(opts?: BuildServerOptions) {
    const basePath = resolve(opts?.basePath ?? process.cwd())

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

    let options: BuildServerOptions = { ...opts }

    if (!opts || opts.includePackageJsonOptions) {
        const pkgJsonServerBuildOpts = pkgJsonContent['m3-stack']?.server ?? pkgJsonContent.build?.server
        if (pkgJsonServerBuildOpts) {
            options = mergeOptionsDeep(pkgJsonServerBuildOpts, options)
        }
    }

    const entryFile = options.entryFile
        ? resolve(basePath, options.entryFile)
        : await findMatchingFile(basePath, DEFAULT_SERVER_ENTRY_PATHS, ['js', 'ts', 'jsx', 'tsx'])

    if (!entryFile) {
        throw new Error('Server entry file not found')
    }

    const external = new Set<string>()

    for (const btin of builtinModules) {
        external.add(btin)
        external.add(`node:${btin}`)
    }

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

    await rm('dist/server', { recursive: true, force: true }).catch((e) => {
        if (e.code !== 'ENOENT') {
            throw e
        }
    })

    await runEsbuildBuildServer({
        entryPoint: entryFile,
        sourcemap: options.sourcemap,
        external: Array.from(external),
    })

    await buildOutputPackageJson({ dependencies: newPkgJsonDeps })

    await copyFilesToOutputDir(basePath, options.copyFiles ?? {})
}

export type RunEsbuildOptions = {
    entryPoint: string
    sourcemap?: boolean | 'linked' | 'inline' | 'external' | 'both'
    external?: string[]
}

export async function runEsbuildBuildServer(opts: RunEsbuildOptions) {
    const r = await esbuild.build({
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
        external: opts.external,
        plugins: [
            nativeModulesPlugin({ resolveFailure: 'throw' }),
            EsmExternalsPlugin({ externals: opts.external ?? [] }),
        ],
    })

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

export async function copyFilesToOutputDir(basePath: string, copyFiles: Record<string, string>) {
    for (const [from, to] of Object.entries(copyFiles)) {
        if (to.includes('..') || to.startsWith('/')) {
            throw new Error(`Invalid copy-to path ${to}`)
        }

        const fromResolved = resolvePath(from, basePath)
        const toResolved = join(basePath, 'dist', to)

        if (!fromResolved) {
            throw new Error(`Invalid copy-from path ${from}`)
        }

        console.log(`Copying ${fromResolved} to ${toResolved}`)
        await cp(fromResolved, toResolved, { recursive: true, force: true }).catch((err) => {
            console.error(`Failed to copy ${fromResolved} to ${toResolved}`, err)
            throw err
        })
    }
}
