// One command to run the whole stack in dev: the Express API (server/) and the
// Vite dev server (which proxies /api + /auth to it). Usage: `npm run dev:all`.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const procs = [];

function run(name, cmd, args, cwd) {
  const p = spawn(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], shell: false });
  const tag = `[${name}]`;
  p.stdout.on('data', (d) => process.stdout.write(`${tag} ${d}`));
  p.stderr.on('data', (d) => process.stderr.write(`${tag} ${d}`));
  p.on('exit', (code) => {
    process.stdout.write(`${tag} exited (${code})\n`);
    shutdown();
  });
  procs.push(p);
}

function shutdown() {
  for (const p of procs) { try { p.kill(); } catch { /* ignore */ } }
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

run('api', process.execPath, [join(__dirname, 'server', 'index.js')], join(__dirname, 'server'));
run('web', process.execPath, [join(__dirname, 'node_modules', 'vite', 'bin', 'vite.js')], __dirname);
