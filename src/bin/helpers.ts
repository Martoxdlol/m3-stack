import { type StdioOptions, spawn } from 'node:child_process'
import { statSync } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import type { BuildServerOptions } from './build/server'

type ParsedImport =
    | {
          moduleName: null
          path: string
      }
    | {
          moduleName: string
          path: string | null
      }

/**
 * Parse an import statement and return the module name and path.
 * For example:
 * - parseImportFrom('super-lib') -> { moduleName: 'super-lib', path: null }
 * - parseImportFrom('super-lib/some-path') -> { moduleName: 'super-lib', path: 'some-path' }
 * - parseImportFrom('./server') -> { moduleName: null, path: './server' }
 * - parseImportFrom('@mega-lib/core') -> { moduleName: '@mega-lib/core', path: null }
 * - parseImportFrom('@mega-lib/core/some-path') -> { moduleName: '@mega-lib/core', path: 'some-path' }
 */
export function parseImportFrom(from: string): ParsedImport | null {
    // if starts with './' or '../'
    if (from.startsWith('./') || from.startsWith('../') || from.startsWith('/')) {
        return {
            moduleName: null,
            path: from,
        }
    }

    if (/^@?[\w_\-]+/.test(from)) {
        const segments = from.split('/')
        let moduleName = segments.shift()!
        if (moduleName?.startsWith('@')) {
            if (!segments.length) {
                return null
            }

            moduleName += `/${segments.shift()}`
        }

        return {
            moduleName,
            path: segments.length ? segments.join('/') : null,
        }
    }

    return null
}

/**
 * Get the root path of a module. For example:
 * - getModuleRootPath('super-lib') -> '/path/to/node_modules/super-lib'
 * - getModuleRootPath('non-existing-module') -> null
 * - getModuleRootPath('super-lib/some-other-import/x') -> '/path/to/node_modules/super-lib'
 * - getModuleRootPath('@mega-lib/core') -> '/path/to/node_modules/@mega-lib/core'
 */
export async function getModuleRootPath(importPath: string, base?: string): Promise<string | null> {
    const baseResolved = base ? resolve(base) : process.cwd()

    const parsed = parseImportFrom(importPath)
    if (!parsed?.moduleName) {
        return null
    }

    const mod = parsed.moduleName

    const s = await stat(baseResolved).catch(() => null)

    let dir: string | null = s?.isFile() ? dirname(baseResolved) : baseResolved

    while (dir) {
        const p = join(dir, 'node_modules', mod)
        const s = await stat(p).catch(() => null)

        if (s?.isDirectory()) {
            return p
        }

        const parent = dirname(dir)
        if (parent === dir) {
            break
        }

        dir = parent
    }

    return null
}

export type M3StackBuildOptions = {
    server?: BuildServerOptions | null
    externalDependencies?: string[]
    copyFiles?: Record<string, string>
}

export type M3StackOptions = {} & M3StackBuildOptions

export type PackageJson = Record<string, any> & {
    bin?: string | Record<string, string>
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
export async function readPackageJson(importPath: string): Promise<PackageJson | null> {
    let rootDirPath: string

    if (importPath.startsWith('.') || importPath.startsWith('/')) {
        rootDirPath = resolve(importPath)
    } else {
        const moduleDir = await getModuleRootPath(importPath)
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

export function findMatchingFileSync(basePath: string, possiblePaths: string[], possibleExtensions: string[]) {
    for (const path of possiblePaths) {
        for (const ext of possibleExtensions) {
            const fullPath = resolve(basePath, `${path}.${ext}`)
            try {
                const fileStat = statSync(fullPath)
                if (fileStat?.isFile()) {
                    return fullPath
                }
            } catch (error) {
                // Do nothing
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
export async function resolvePath(path: string, base?: string): Promise<string | null> {
    const parsed = parseImportFrom(path)

    if (!parsed) {
        return resolve(path)
    }

    if (!parsed?.moduleName && parsed?.path) {
        return resolve(parsed.path)
    }

    if (!parsed.moduleName) {
        return resolve(path)
    }

    const root = await getModuleRootPath(path, base)

    if (!root) {
        return null
    }

    return join(root, ...(parsed.path ? [parsed.path] : []))
}

export function runCommand(cmd: string, args: string[], stdio?: StdioOptions): Promise<number> {
    return new Promise((resolve) => {
        spawn(`${cmd} ${args.join(' ')}`.trim(), {
            stdio: stdio ?? 'inherit',
            shell: true,
        }).addListener('exit', (code) => resolve(code ?? -1))
    })
}

export async function resolveRunModuleBinary(moduleName: string, command?: string) {
    const cmd = command ?? moduleName

    const kitPkgJson = await readPackageJson(moduleName)

    const pkgJsonBin = typeof kitPkgJson?.bin === 'string' ? kitPkgJson.bin : kitPkgJson?.bin?.[cmd]
    let bin: string | null = null
    if (pkgJsonBin) {
        const mod = await getModuleRootPath(cmd)
        if (mod) {
            bin = join(mod, pkgJsonBin)
        }
    }

    return bin ? `node ${bin}` : cmd
}

// find package.json recursively
export async function findModuleRootFrom(path: string): Promise<string | null> {
    const r = resolve(path)
    const name = dirname(r)
    const subName = dirname(name)

    const s = await stat(join(name, 'package.json')).catch(() => null)

    if (s?.isFile() && subName.endsWith('node_modules')) {
        return name
    }

    if (name.endsWith('node_modules')) {
        return null
    }

    return findModuleRootFrom(name)
}
