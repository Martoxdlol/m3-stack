import fs from 'node:fs/promises'
import type { M3StackConfig } from '../config'

export async function vercelBuildCommand(config: M3StackConfig, _args: string[]) {
    await fs.rm('./.vercel/output', { force: true, recursive: true }).catch((e) => {
        if (e.code !== 'ENOENT') throw e
    })

    await fs.mkdir('./.vercel/output/functions/api.func/', { recursive: true }).catch((e) => {
        if (e.code !== 'EEXIST') throw e
    })

    await fs.mkdir('./.vercel/output/', { recursive: true }).catch((e) => {
        if (e.code !== 'EEXIST') throw e
    })

    await fs.cp('./dist/public', './.vercel/output/static', { recursive: true })
    await fs.cp('./dist/server', './.vercel/output/functions/api.func', { recursive: true })

    await fs.cp('./package.json', './.vercel/output/functions/api.func/package.json', { recursive: true })

    await fs.writeFile(
        './.vercel/output/functions/api.func/.vc-config.json',
        JSON.stringify(
            {
                runtime: config.vercel?.runtime ?? 'nodejs22.x',
                regions: config.vercel?.regions,
                handler: 'main.js',
                shouldAddHelpers: true,
                shouldAddSourcemapSupport: true,
                maxDuration: config.vercel?.maxDuration,
                environment: config.vercel?.environment,
                memory: config.vercel?.memory,
            },
            null,
            2,
        ),
        'utf-8',
    )

    await fs.cp('./dist/package.json', './.vercel/output/functions/api.func/package.json', { recursive: true })
    await fs.cp('./dist/node_modules', './.vercel/output/functions/api.func/node_modules', { recursive: true })

    await fs.writeFile(
        './.vercel/output/config.json',
        JSON.stringify(
            {
                version: 3,
                routes: [
                    ...(config.backendRoutes?.map((route) => ({ src: `${route}/?(.*)`, dest: '/api' })) ?? []),
                    { src: '/api/?(.*)', dest: '/api' },
                    { src: '/[^.]+', dest: '/', status: 200 },
                    ...(config.vercel?.routes ?? []),
                ],
            },
            null,
            2,
        ),
        'utf-8',
    )
}
