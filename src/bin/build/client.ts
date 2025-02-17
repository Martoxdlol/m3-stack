import { cwd } from 'node:process'
import { type UserConfig, build, createServer, loadConfigFromFile } from 'vite'
import type { M3StackConfig } from '../../config'
import { createViteConfig } from '../../vite'
import { findMatchingFile } from '../helpers'

export async function buildClientAppCommand(config: M3StackConfig, _args: string[]) {
    const customConfigFile = await findMatchingFile(cwd(), ['vite.config'], ['js', 'mjs', 'ts', 'cjs', 'mts', 'cts'])

    let viteConf: UserConfig = createViteConfig(undefined, config)

    if (customConfigFile) {
        const viteImpConf = await loadConfigFromFile({ command: 'build', mode: 'production' }, customConfigFile)

        if (viteImpConf?.config) {
            viteConf = createViteConfig(viteImpConf.config, config)
        }
    }

    await build(viteConf)
}

export async function devClientAppCommand(config: M3StackConfig, _args: string[]) {
    const customConfigFile = await findMatchingFile(cwd(), ['vite.config'], ['js', 'mjs', 'ts', 'cjs', 'mts', 'cts'])

    let viteConf: UserConfig = createViteConfig(undefined, config)

    if (customConfigFile) {
        const viteImpConf = await loadConfigFromFile({ command: 'serve', mode: 'development' }, customConfigFile)

        if (viteImpConf?.config) {
            viteConf = createViteConfig(viteImpConf.config, config)
        }
    }
    const server = await createServer(viteConf)

    server.bindCLIShortcuts()

    console.info('Starting Vite server on port', viteConf.server?.port ?? 5173)
    console.info('Open http://localhost:5173 on your browser')

    await server.listen()
}
