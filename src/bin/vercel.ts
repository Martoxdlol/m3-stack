import fs from 'node:fs/promises'

export async function createVercelOutput() {
    await fs.cp('./dist/public', './.vercel/output/static', { recursive: true })
    await fs.cp('./dist/server', './.vercel/output/functions/api', { recursive: true })

    fs.writeFile(
        './.vercel/output/functions/api/.vc-config.json',
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
}
