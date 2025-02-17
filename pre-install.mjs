import { existsSync } from 'fs';
import { writeFile } from 'fs/promises';

if (!existsSync('dist') && !existsSync('dist/package.json')) {
    writeFile('dist/package.json', JSON.stringify({ type: 'module', name: 'm3-stack' }));
}