import { nativeModulesPlugin } from '@douglasneuroinformatics/esbuild-plugin-native-modules'
import { EsmExternalsPlugin } from '@esbuild-plugins/esm-externals'
import * as esbuild from 'esbuild'
import { cp, readFile, rm, writeFile } from 'node:fs/promises'
import { builtinModules, createRequire } from 'node:module'
import { join, resolve } from 'node:path'

const require = createRequire(import.meta.url)

function requireResolveSafe(id: string) {
    try {
        return require.resolve(id)
    } catch {
        return null
    }
}

export async function buildServer() {
    await rm('dist', { recursive: true, force: true }).catch((e) => {
        if (e.code !== 'ENOENT') {
            throw e
        }
    })

    const pkgJson = JSON.parse(await readFile('package.json', 'utf-8'))
    const copyFiles = pkgJson.copyFiles as Record<string, string> | undefined

    const peerDepsEntries = Object.entries((pkgJson.peerDependencies as Record<string, string> | undefined) ?? {})

    const currentDir = resolve(process.cwd())

    const newPkgJsonDeps: Record<string, string> = {}

    const copyDeps: { name: string; version: string }[] = []

    for (const [name, version] of peerDepsEntries) {
        copyDeps.push({ name, version })
    }

    while (copyDeps.length > 0) {
        const dep = copyDeps.pop()!
        const depName = dep.name
        const version = dep.version
        const path = requireResolveSafe(depName)

        if (!path) {
            console.log(`Skipping ${depName} as external dep. Could not resolve path`)
            continue
        }

        let basePath = ''

        for (let c = 0; c < path.length; c++) {
            const cdir = currentDir[c]
            const cpath = path[c]
            if (cpath !== cdir) {
                basePath = path.slice(0, c)
                break
            }
        }

        if (!resolve(basePath).endsWith('/node_modules')) {
            basePath = join(basePath, 'node_modules')
        }

        const moduleDir = resolve(basePath, depName)
        const modulePkgJson = JSON.parse(await readFile(resolve(moduleDir, 'package.json'), 'utf-8'))

        console.log(`Using ${depName} as external dep. Copy: ${moduleDir} to dist/node_modules/${depName}`)

        await cp(moduleDir, `dist/node_modules/${depName}`, { recursive: true, force: true })

        newPkgJsonDeps[depName] = version

        const modPeerDeps = Object.entries((modulePkgJson.peerDependencies as Record<string, string> | undefined) ?? {})
        const modProdDeps = Object.entries((modulePkgJson.dependencies as Record<string, string> | undefined) ?? {})
        const modDeps = [...modPeerDeps, ...modProdDeps]
        for (const [name, version] of modDeps) {
            if (newPkgJsonDeps[name] === undefined) {
                copyDeps.push({ name, version })
            }
        }
    }

    const externals = [
        ...builtinModules,
        ...builtinModules.map((n) => `node:${n}`),
        ...Object.entries(newPkgJsonDeps).map(([n]) => n),
    ]

    const r = await esbuild.build({
        entryPoints: ['src/server/main.tsx'],
        bundle: true,
        outdir: 'dist/server',
        sourcemap: 'linked',
        format: 'esm',
        tsconfig: 'tsconfig.json',
        target: 'esnext',
        platform: 'neutral',
        keepNames: true,
        treeShaking: true,
        packages: 'bundle',
        external: externals,
        plugins: [nativeModulesPlugin({ resolveFailure: 'throw' }), EsmExternalsPlugin({ externals })],
    })

    if (r.errors.length > 0) {
        console.error('Server build failed')
        for (const e of r.errors) {
            console.error(e)
        }
        process.exit(1)
    }

    console.log('Server build done')

    for (const f of r.outputFiles ?? []) {
        console.log(f.path, f.text)
    }

    for (const [from, to] of Object.entries(copyFiles ?? {})) {
        if (to.includes('..')) {
            throw new Error(`Invalid path ${to}`)
        }

        const f = resolve(from)

        console.log(`Copying ${f} to dist/${to}`)

        await cp(f, `dist/${to}`, { recursive: true, force: true })
    }

    // create package.json
    await writeFile(
        'dist/package.json',
        JSON.stringify(
            {
                type: 'module',
                main: 'server/main.js',
                scripts: {
                    start: 'node --enable-source-maps server/main.js',
                },
                dependencies: newPkgJsonDeps,
            },
            null,
            2,
        ),
    )
}

//   esbuild src/server/main.tsx --bundle --outdir=dist/server --sourcemap=linked --format=esm
//   --target=esnext --tsconfig=tsconfig.json --platform=node --tree-shaking=true
