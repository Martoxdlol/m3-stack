#!/usr/bin/env node

import type { M3StackConfig } from '../config'

import sourceMapSupport from 'source-map-support'
sourceMapSupport.install()

import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { createDrizzleConfig, getSchemaPath } from '../drizzle'
import { readPackageJson, resolveModuleDir, runCommand } from './helpers'

global.require = createRequire(import.meta.url)

import type { Config } from 'drizzle-kit'
import { MySqlTable } from 'drizzle-orm/mysql-core'
import { PgTable } from 'drizzle-orm/pg-core'
import { SQLiteTable } from 'drizzle-orm/sqlite-core'
import { createJiti } from 'jiti'
const jiti = createJiti(import.meta.url)

export async function drizzleKitCommand(config: M3StackConfig, args: string[]) {
    const schemaPath = getSchemaPath()

    const drizzleOpts: Partial<Config> = { ...config.drizzle }

    let detectedDialect: 'mysql' | 'sqlite' | 'postgresql' | 'turso' | undefined

    if (schemaPath && !drizzleOpts.dialect) {
        const schema = ((await jiti.import(schemaPath).catch(() => null)) ?? {}) as Record<string, unknown>

        for (const key of Object.keys(schema ?? {})) {
            try {
                const table = schema[key]

                if (!table) {
                    continue
                }

                if (table instanceof PgTable) {
                    detectedDialect = 'postgresql'
                    break
                }

                if (table instanceof SQLiteTable) {
                    detectedDialect = 'sqlite'
                    break
                }

                if (table instanceof MySqlTable) {
                    detectedDialect = 'mysql'
                    break
                }
            } catch (e) {
                console.warn(e)
                // Ignore
            }
        }
    }

    const databaseUrl = (config.drizzle as any)?.dbCredentials?.url ?? process.env.DATABASE_URL

    if (databaseUrl) {
        if (databaseUrl.startsWith('mysql') && !detectedDialect) {
            detectedDialect = 'mysql'
        }

        if (
            (databaseUrl.startsWith('libsql') || databaseUrl.startsWith('http')) &&
            (!detectedDialect || detectedDialect === 'sqlite')
        ) {
            detectedDialect = 'turso'
        }
    }

    if (detectedDialect) {
        drizzleOpts.dialect = detectedDialect

        console.info(`Using detected dialect: ${detectedDialect}`)
    }

    const drizzleConfig = 'dialect' in (config.drizzle ?? {}) ? config.drizzle : createDrizzleConfig(drizzleOpts)

    const tmpDrizzleConfPath = './node_modules/.tmp-m3-stack/drizzle-config.js'
    const tmpPkgJsonPath = './node_modules/.tmp-m3-stack/package.json'

    await mkdir('./node_modules/.tmp-m3-stack', { recursive: true })
    await writeFile(tmpDrizzleConfPath, `export default ${JSON.stringify(drizzleConfig, null, 4)}`)
    await writeFile(tmpPkgJsonPath, `{"type": "module"}`)

    const kitPkgJson = await readPackageJson('drizzle-kit')

    const pkgJsonBin = typeof kitPkgJson?.bin === 'string' ? kitPkgJson.bin : kitPkgJson?.bin?.['drizzle-kit']
    let bin: string | null = null
    if (pkgJsonBin) {
        const mod = resolveModuleDir('drizzle-kit')
        if (mod) {
            bin = join(mod, pkgJsonBin)
        }
    }

    await runCommand(bin ? `node ${bin}` : 'drizzle-kit', ['--config', tmpDrizzleConfPath, ...args])
}
