import { execSync } from 'child_process';
import { existsSync } from 'fs';

if (!existsSync('dist')) {
    execSync('bun run build', { stdio: 'inherit' });
    execSync('bun install', { stdio: 'inherit' });
}