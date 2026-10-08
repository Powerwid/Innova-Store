import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const directory = fileURLToPath(new URL('../recognition-service/', import.meta.url));
const python = join(directory, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
if (!existsSync(python)) {
  console.error('Prepara recognition-service/.venv siguiendo recognition-service/README.md.');
  process.exit(1);
}
const args = ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8001', '--workers', '1'];
if (existsSync(join(directory, '.env'))) args.push('--env-file', '.env');
const child = spawn(python, args, { cwd: directory, stdio: 'inherit' });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 0; });
process.on('SIGINT', () => child.kill());
process.on('SIGTERM', () => child.kill());
