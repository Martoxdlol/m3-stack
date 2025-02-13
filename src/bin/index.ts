#!/usr/bin/env node

import { spawn } from 'node:child_process'

type CMD = string | ((args: string[]) => Promise<void>)

function runCmd(cmd: CMD, args: string[]): Promise<number> {
    return new Promise((resolve) => {
        if (typeof cmd === 'function') {
            cmd(args)
                .then(() => resolve(0))
                .catch((e) => {
                    console.error(e)
                    resolve(1)
                })
            return
        }

        spawn(`${cmd} ${args.join(' ')}`.trim(), {
            stdio: 'inherit',
            shell: true,
        }).addListener('exit', (code) => resolve(code ?? -1))
    })
}

const BUILD_APP_SCRIPT = 'tsc -b && vite build'
const BUILD_SERVER_SCRIPT =
    'npx tsup src/server/main.tsx --out-dir dist/server --sourcemap false --format esm --target=esnext --tsconfig tsconfig.json'

//  --env-file-if-exists=.env

const DEV_APP_SCRIPT = 'vite'
const DEV_SERVER_SCRIPT = `${BUILD_SERVER_SCRIPT} --watch --onSuccess 'node --enable-source-maps dist/server/main.js'`

const START_SCRIPT = 'node --enable-source-maps dist/server/main.js'

const AUTH_GENERATE_SCRIPT = 'npx @better-auth/cli generate'

const DRIZZLE_DB_PUSH_SCRIPT = 'drizzle-kit push'

const scripts: Record<string, CMD[][]> = {
    dev: [[DEV_APP_SCRIPT, DEV_SERVER_SCRIPT]],
    'dev:app': [[DEV_APP_SCRIPT]],
    'dev:server': [[DEV_SERVER_SCRIPT]],
    build: [[BUILD_APP_SCRIPT, BUILD_SERVER_SCRIPT], ['echo build ready!']],
    'build:app': [[BUILD_APP_SCRIPT]],
    'build:server': [[BUILD_SERVER_SCRIPT]],
    preview: [['vite preview', DEV_SERVER_SCRIPT]],
    'auth:generate': [[AUTH_GENERATE_SCRIPT]],
    'db:push': [[DRIZZLE_DB_PUSH_SCRIPT]],
    start: [[START_SCRIPT]],
}

async function main() {
    const command = process.argv[2]
    const subArgs = process.argv.slice(3)

    if (!command) {
        console.error('No command provided')
        process.exit(1)
    }

    const cmds = scripts[command]

    if (!cmds) {
        console.error(`Command ${command} not found`)
        process.exit(1)
    }

    for (const c of cmds) {
        for (const s of c) {
            console.log(`Running: ${s}`)
        }

        await Promise.all(c.map((c) => runCmd(c, subArgs)))
    }
}

main()
