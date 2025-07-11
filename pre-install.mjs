import { existsSync, mkdirSync } from 'fs';
import { writeFile } from 'fs/promises';

if (!existsSync('dist')) {
    mkdirSync('dist')
}

if (!existsSync('dist/package.json')) {
    writeFile('dist/package.json', JSON.stringify({ type: 'module', name: 'm3-stack' }));
}