import { cp, rm, writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { findMatchingFile } from '../../helpers'

export const COMMON_DEFAULT_EXTERNAL_DEPS = ['@electric-sql/pglite']
export const ROLLUP_DEFAULT_EXTERNAL_DEPS = new Set([...COMMON_DEFAULT_EXTERNAL_DEPS])
export const ESBUILD_DEFAULT_EXTERNAL_DEPS = new Set([...COMMON_DEFAULT_EXTERNAL_DEPS, '@libsql/client'])

export type BuildServerOptions = {
    bundler?:
        | 'esbuild'
        | 'rollup'
        | {
              dev?: 'esbuild' | 'rollup'
              prod?: 'esbuild' | 'rollup'
              vercel?: 'esbuild' | 'rollup'
          }
    
    /**
     * Module type
     */
    module?: 'cjs' | 'esm'
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

    /**
     * When bundling to deploy on Vercel, set this to true. It is automatic with `m3-stack vercel-build`
     */
    vercel?: boolean

    /**
     * Minify the output.
     */
    minify?: boolean
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

export async function getEntryFile(options: BuildServerOptions): Promise<string | null> {
    const basePath = resolve(options.basePath ?? process.cwd())

    const entryFile = options.entryFile
        ? resolve(basePath, options.entryFile)
        : await findMatchingFile(basePath, DEFAULT_SERVER_ENTRY_PATHS, ['js', 'ts', 'jsx', 'tsx'])

    if (!entryFile) {
        return null
    }

    return entryFile
}

export type Dependency = {
    name: string
    root: string
    dynamicImport: boolean
}

export type Dependencies = Map<string, Dependency>

export type OnStartResult = {
    bundler: 'esbuild' | 'rollup'
}

export type OnEndResult = {
    bundler: 'esbuild' | 'rollup'
    dependencies: Dependencies
}

export type BundleOrWatchFunctionOpts = {
    onStart?: (r: OnStartResult) => unknown
    onEnd?: (r: OnEndResult) => unknown
}
export type BundleOrWatchFunction = (opts: BuildServerOptions, bundleOpts: BundleOrWatchFunctionOpts) => Promise<void>

export async function writeOutputPackageJson(opts: BuildServerOptions) {
    await mkdir('dist', { recursive: true  })

    await writeFile(
        'dist/package.json',
        JSON.stringify(
            {
                type: opts.module === 'cjs' ? 'commonjs' : 'module',
                main: 'server/main.js',
                scripts: {
                    start: 'node --enable-source-maps server/main.js',
                },
            },
            null,
            2,
        ),
    )
}

export async function copyDependencies(dependencies: Dependencies) {
    await rm('dist/node_modules', { recursive: true }).catch(() => null)

    for (const dep of dependencies.values()) {
        await cp(dep.root, `dist/node_modules/${dep.name}`, { recursive: true }).catch((e) => {
            console.error(`Failed to copy ${dep.name}`, e)
        })
    }
}
