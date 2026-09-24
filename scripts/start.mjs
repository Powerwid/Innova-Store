import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const backendPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'backend');
const backend = spawn(process.execPath, ['dist/main.js'], {
  cwd: backendPath,
  env: { ...process.env, NODE_ENV: 'production' },
  stdio: 'inherit',
});

backend.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
backend.on('exit', (code) => {
  process.exitCode = code ?? 1;
});

process.on('SIGINT', () => backend.kill('SIGINT'));
process.on('SIGTERM', () => backend.kill('SIGTERM'));
