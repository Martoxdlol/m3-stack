import type { M3StackConfig } from '../../config'
import { buildServerBundle } from './server'

export async function buildCommand(_config: M3StackConfig, _args: string[]) {
    await buildServerBundle()
}
