import { nativeModulesPlugin } from '@douglasneuroinformatics/esbuild-plugin-native-modules'
import * as esbuild from 'esbuild'
import { rm, writeFile } from 'node:fs/promises'

export async function buildServer() {
    await rm('dist/server', { recursive: true, force: true }).catch((e) => {
        if (e.code !== 'ENOENT') {
            throw e
        }
    })

    const r = await esbuild.build({
        entryPoints: ['src/server/main.tsx'],
        bundle: true,
        outdir: 'dist/server',
        sourcemap: 'linked',
        format: 'esm',
        tsconfig: 'tsconfig.json',
        target: 'esnext',
        platform: 'node',
        treeShaking: true,
        packages: 'external',
        plugins: [nativeModulesPlugin({ resolveFailure: 'throw' })],
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

    // create package.json
    await writeFile(
        'dist/server/package.json',
        JSON.stringify(
            {
                type: 'module',
                main: 'main.js',
            },
            null,
            2,
        ),
    )
}

//   esbuild src/server/main.tsx --bundle --outdir=dist/server --sourcemap=linked --format=esm
//   --target=esnext --tsconfig=tsconfig.json --platform=node --tree-shaking=true
