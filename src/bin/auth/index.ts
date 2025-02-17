import type { BetterAuthOptions } from 'better-auth'
import { getAdapter } from 'better-auth/db'
import { createJiti } from 'jiti'
import { writeFile } from 'node:fs/promises'
import { cwd } from 'node:process'
import type { M3StackConfig } from '../../config'
import { findMatchingFile } from '../helpers'
import { getGenerator } from './better-auth-generators'
const jiti = createJiti(import.meta.url)

const DEFAULT_AUTH_CONFIG_PATHS = [
    'lib/server/auth',
    'lib/server/auth/index',
    'lib/server/auth/main',
    'server/auth',
    'server/auth/index',
    'server/auth/main',
    'auth',
    'auth/index',
    'auth/main',
    'src/server/auth',
    'src/server/auth/index',
    'src/server/auth/main',
    'src/auth',
    'src/auth/index',
    'src/auth/main',
    'src/server/auth',
    'src/server/auth/index',
    'src/server/auth/main',
    'app/server/auth',
    'app/server/auth/index',
    'app/server/auth/main',
    'app/auth',
    'app/auth/index',
    'app/auth/main',
    'src/app/server/auth',
    'src/app/server/auth/index',
    'src/app/server/auth/main',
    'src/app/auth',
    'src/app/auth/index',
    'src/app/auth/main',
]

export async function betterAuthGenerateCommand(config: M3StackConfig, _args: string[]) {
    let auth = config.betterAuth ?? ({} as Record<string, unknown>)

    if (!config.betterAuth) {
        const authConfigPath = await findMatchingFile(cwd(), DEFAULT_AUTH_CONFIG_PATHS, [
            'ts',
            'js',
            'tsx',
            'jsx',
            'mjs',
            'cjs',
            'mts',
            'cts',
        ])

        try {
            if (authConfigPath) {
                const impAuth = (await jiti.import(authConfigPath).catch((_) => null)) as any

                if (impAuth) {
                    if ('auth' in impAuth) {
                        auth = impAuth.auth
                        console.info('Using auth config from `export const config` at', authConfigPath)
                    } else if ('createAuth' in impAuth) {
                        auth = await impAuth.createAuth({})
                        console.info('Using auth config from `export function createAuth` at', authConfigPath)
                    } else {
                        auth = impAuth
                        console.info('Using auth config from `export default` at', authConfigPath)
                    }
                }
            }
        } catch (error) {
            console.warn(error)
        }
    }

    const options: BetterAuthOptions = 'options' in auth ? auth.options : auth

    const adapter = await getAdapter(options).catch((e) => {
        console.error(e.message)
        process.exit(1)
    })

    console.log('Generating auth schema...')

    const schema = await getGenerator({
        adapter,
        file: './auth-schema.ts',
        options: options,
    })

    if (schema.code) {
        await writeFile(schema.fileName, schema.code)
    }

    console.log('Auth schema generated! See ./auth-schema.ts')
}
