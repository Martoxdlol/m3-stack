import { readFile, stat } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
import type { BuildServerOptions } from './build-server'

/**
 * Equivalent to node's `require` function, but works in ESM.
 */
export const require = createRequire(import.meta.url)

/**
 * Equivalent to require.resolve, but returns null if the module is not found.
 *
 * For example:
 *  - resolveModulePath('super-lib') -> '/path/to/node_modules/super-lib/dist/index.js'
 *  - resolveModulePath('non-existing-module') -> null
 */
export function resolveModulePath(path: string): string | null {
    try {
        return require.resolve(path)
    } catch {
        return null
    }
}

/**
 * Get the common part of two paths.
 *
 * For example:
 * - getCommonPath('/path/to/file1', '/path/to/file2') -> '/path/to'
 * - getCommonPath('/path/to/file1', '/path/too/file2') -> '/path'
 *
 * The result never ends with '/'.
 */
export function getCommonPath(path1: string, path2: string): string {
    const path1Segments = resolve(path1).split('/')
    const path2Segments = resolve(path2).split('/')

    const commonSegments = []
    for (let i = 0; i < Math.min(path1Segments.length, path2Segments.length); i++) {
        if (path1Segments[i] === path2Segments[i]) {
            commonSegments.push(path1Segments[i])
        } else {
            break
        }
    }

    if (commonSegments[commonSegments.length - 1] === '') {
        commonSegments.pop()
    }

    return resolve(commonSegments.join('/'))
}

/**
 * Return the directory of a module.
 * For example:
 * - resolveModuleDir('super-lib') -> '/path/to/node_modules/super-lib'
 * - resolveModuleDir('non-existing-module') -> null
 */
export function resolveModuleDir(moduleName: string): string | null {
    const path = resolveModulePath(moduleName)

    if (!path) {
        return null
    }

    const commonPath = getCommonPath(process.cwd(), path)

    let nodeModulesDir = resolve(commonPath)
    if (!commonPath.endsWith('/node_modules')) {
        nodeModulesDir = join(commonPath, 'node_modules')
    }

    return join(nodeModulesDir, moduleName)
}

export type M3StackBuildOptions = {
    server?: BuildServerOptions | null
    externalDependencies?: string[]
    copyFiles?: Record<string, string>
}

export type M3StackOptions = {} & M3StackBuildOptions

export type PackageJson = Record<string, any> & {
    name: string
    version: string
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
    peerDependencies?: Record<string, string>

    build?: M3StackBuildOptions | null
    'm3-stack'?: M3StackOptions | null
}

/**
 * Read the package.json of a module or project path.
 */
export async function readPackageJson(moduleName: string): Promise<PackageJson | null> {
    let rootDirPath: string

    if (moduleName.startsWith('.') || moduleName.startsWith('/')) {
        rootDirPath = resolve(moduleName)
    } else {
        const moduleDir = resolveModuleDir(moduleName)
        if (!moduleDir) {
            return null
        }

        rootDirPath = moduleDir
    }

    return await readFile(join(rootDirPath, 'package.json'), 'utf-8')
        .catch(() => null)
        .then((content) => (content ? JSON.parse(content) : null))
        .catch(() => null)
}

/**
 * Find a file that matches the given paths and extensions.
 * Example: findMatchingFile(['./server', './src/server', './server/main'], ['ts', 'js', 'tsx', 'jsx'])
 *
 * Can find:
 * - ./server.ts
 * - ./server.tsx
 * - ./src/server.js
 * - ...
 */
export async function findMatchingFile(basePath: string, possiblePaths: string[], possibleExtensions: string[]) {
    for (const path of possiblePaths) {
        for (const ext of possibleExtensions) {
            const fullPath = resolve(basePath, `${path}.${ext}`)
            const fileStat = await stat(fullPath).catch(() => null)
            if (fileStat?.isFile()) {
                return fullPath
            }
        }
    }

    return null
}

/**
 * Merge two objects recursively.
 *
 * For example:
 * - mergeOptionsDeep({ a: { b: 1 } }, { a: { c: 2 } }) -> { a: { b: 1, c: 2 } }
 */
export function mergeOptionsDeep(target: Record<string, any>, source: Record<string, any>) {
    for (const key in source) {
        if (source[key] instanceof Object) {
            target[key] = mergeOptionsDeep(target[key] ?? {}, source[key])
        } else {
            target[key] = source[key]
        }
    }

    return target
}

/**
 * Resoles a path that may be a inside a module or not.
 */
export function resolvePath(path: string, base?: string): string | null {
    if (path.startsWith('.') || path.startsWith('/')) {
        if (base) {
            return resolve(base, path)
        }

        return resolve(path)
    }

    const segments = path.split('/').filter(Boolean)
    if (segments.length === 0) {
        return null
    }

    let moduleName = segments.shift()!

    if (moduleName.startsWith('@')) {
        moduleName += `/${segments.shift()}`
    }

    const modPath = resolveModuleDir(moduleName)

    if (!modPath) {
        return null
    }

    return join(modPath, ...segments)
}
