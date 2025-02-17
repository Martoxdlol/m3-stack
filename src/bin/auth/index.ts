import type { BetterAuthOptions } from 'better-auth'
import { getAdapter } from 'better-auth/db'
import { writeFile } from 'node:fs/promises'
import type { M3StackConfig } from '../../config'
import { getGenerator } from './better-auth-generators'

export async function betterAuthGenerateCommand(config: M3StackConfig, _args: string[]) {
    const auth = config.betterAuth ?? {}

    const options: BetterAuthOptions = 'options' in auth ? auth : auth

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
