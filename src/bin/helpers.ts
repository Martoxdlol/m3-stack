import { readFile, stat } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'

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

export type PackageJson = Record<string, any> & {
    name: string
    version: string
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
    peerDependencies?: Record<string, string>
}

/**
 * Read the package.json of a module.
 */
export async function readModulesPackageJson(moduleName: string): Promise<Record<string, PackageJson> | null> {
    const moduleDir = resolveModuleDir(moduleName)
    if (!moduleDir) {
        return null
    }

    return await readFile(join(moduleDir, 'package.json'), 'utf-8')
        .then((content) => JSON.parse(content))
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
export async function findMatchingFile(possiblePaths: string[], possibleExtensions: string[]) {
    for (const path of possiblePaths) {
        for (const ext of possibleExtensions) {
            const fullPath = resolve(`${path}.${ext}`)
            const fileStat = await stat(fullPath).catch(() => null)
            if (fileStat?.isFile()) {
                return fullPath
            }
        }
    }

    return null
}
