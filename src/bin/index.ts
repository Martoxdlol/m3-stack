#!/usr/bin/env node

import { createRequire } from 'node:module'
import { argv } from 'node:process'
import cac from 'cac'
import sourceMapSupport from 'source-map-support'
import { loadM3StackConfig } from '../config'
import { betterAuthGenerateCommand } from './auth'
import { buildCommand, buildDevCommand, buildWatchCommand } from './build'
import { buildClientAppCommand, devClientAppCommand } from './build/client'
import { buildServerBundle } from './build/server'
import { createCommand } from './create'
import { drizzleKitCommand } from './drizzle-kit'
import { runCommand } from './helpers'
import { vercelBuildCommand } from './vercel'
import 'dotenv/config'

sourceMapSupport.install()

global.require = createRequire(import.meta.url)

const cli = cac('m3-stack')

cli.command('build', 'Build the app').action(async () => {
    const config = await loadM3StackConfig()
    await Promise.all([buildCommand(config, argv.slice(3)), buildClientAppCommand(config, argv.slice(3))])
})

cli.command('build-watch', 'Build the app and watch for changes').action(async () => {
    const config = await loadM3StackConfig()
    await buildWatchCommand(config, argv.slice(3))
})

cli.command('dev', 'Build the app and watch for changes').action(async () => {
    const config = await loadM3StackConfig()
    await Promise.all([buildDevCommand(config, argv.slice(3)), devClientAppCommand(config, argv.slice(3))])
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
    await buildServerBundle({ bundleDependencies: true, ...config.build, vercel: true })
    await vercelBuildCommand(config, argv.slice(3))
})

cli.command('start', 'Start the app. Must be built first').action(async () => {
    await runCommand('node', ['--enable-source-maps', 'dist/server/main.js', ...argv.slice(3)])
})

cli.command('create', 'Create a new m3-stack app').action(async () => {
    await createCommand(argv.slice(3))
})

cli.help()

cli.parse()

if (argv.length === 2) {
    cli.outputHelp()
}
