#!/usr/bin/env node

import cac from 'cac'
import { createRequire } from 'node:module'
import { argv } from 'node:process'
import sourceMapSupport from 'source-map-support'
import { loadM3StackConfig } from '../config'
import { betterAuthGenerateCommand } from './auth'
import { buildCommand, buildDevCommand, buildWatchCommand } from './build'
import { drizzleKitCommand } from './drizzle-kit'
import { vercelBuildCommand } from './vercel'

sourceMapSupport.install()

global.require = createRequire(import.meta.url)

const cli = cac('m3-stack')

cli.command('build', 'Build the app').action(async () => {
    const config = await loadM3StackConfig()
    await buildCommand(config, argv.slice(3))
})

cli.command('build-watch', 'Build the app and watch for changes').action(async () => {
    const config = await loadM3StackConfig()
    await buildWatchCommand(config, argv.slice(3))
})

cli.command('dev', 'Build the app and watch for changes').action(async () => {
    const config = await loadM3StackConfig()
    await buildDevCommand(config, argv.slice(3))
})

cli.command('auth-generate-schema', 'Generate the better-auth schema').action(async () => {
    const config = await loadM3StackConfig()
    await betterAuthGenerateCommand(config, argv.slice(3))
})

cli.command('drizzle-kit', 'Run drizzle-kit with auto detected config').action(async () => {
    const config = await loadM3StackConfig()
    await drizzleKitCommand(config, argv.slice(3))
})

cli.command('vercel-build', 'Run drizzle-kit with auto detected config').action(async () => {
    const config = await loadM3StackConfig()
    await buildCommand(config, argv.slice(3))
    await vercelBuildCommand(config, argv.slice(3))
})

cli.help()

cli.parse()

if (argv.length === 2) {
    cli.outputHelp()
}
