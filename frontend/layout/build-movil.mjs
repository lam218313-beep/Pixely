// Builds the mobile version (frontend/app) and puts it inside this site at /m/,
// so one Vercel deployment serves both: desktop at /, phones at /m/.
import { execSync } from 'node:child_process';
import { cpSync, rmSync } from 'node:fs';

const app = new URL('../app/', import.meta.url).pathname;
const run = (cmd) => execSync(cmd, { cwd: app, stdio: 'inherit' });
run('npm ci --no-audit --no-fund');
run('npm run build:web');
rmSync('dist/m', { recursive: true, force: true });
cpSync(`${app}dist-web`, 'dist/m', { recursive: true });
console.log('Versión móvil copiada a dist/m');
