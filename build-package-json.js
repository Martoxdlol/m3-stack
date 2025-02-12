import { writeFile, readFile } from 'node:fs/promises'

const pkg = JSON.parse(await readFile('./package.json', 'utf-8'))

const exportsNames = Object.keys(pkg.tsup.entry)

const pkgExports = {
    ...pkg['publish-exports'],
}

for (const name of exportsNames) {
    pkgExports[`./${name}`] = {
        types: {
            import: `./${name}.d.ts`,
            require: `./${name}.d.ts`
        },
        require: `./${name}.js`,
        import: `./${name}.js`
    }
}

export const publishablePkgJson = {
    name: pkg['publish-name'] ?? pkg.name,
    version: pkg.version,
    description: pkg.description,
    license: pkg.license,
    author: pkg.author,
    module: pkg.module,
    type: pkg.type,
    exports: pkgExports,
    dependencies: pkg.dependencies,
}

await writeFile('./dist/package.json', JSON.stringify(publishablePkgJson, null, 2))