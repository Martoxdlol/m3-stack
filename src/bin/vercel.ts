import fs from 'node:fs/promises'

export async function createVercelOutput() {
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
                runtime: 'nodejs22.x',
                handler: 'main.js',
                maxDuration: 3,
                launcherType: 'Nodejs',
                shouldAddHelpers: true,
                shouldAddSourcemapSupport: true,
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
                    { src: '/api/(.*)', dest: '/api' },
                    { src: '/(.*)', dest: '/$1' },
                    { src: '/(.*)', dest: '/index.html' },
                ],
            },
            null,
            2,
        ),
        'utf-8',
    )
}
