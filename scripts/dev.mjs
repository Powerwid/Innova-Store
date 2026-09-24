import { spawn } from 'node:child_process';

const processes = [
  ['backend', ['run', 'dev:back']],
  ['frontend', ['run', 'dev:front']],
].map(([name, args]) => ({
  name,
  child: spawn('npm', args, { stdio: 'inherit', shell: true }),
}));

let stopping = false;

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const { child } of processes) child.kill();
  process.exitCode = exitCode;
}

for (const { name, child } of processes) {
  child.on('error', (error) => {
    console.error(`${name}: ${error.message}`);
    stop(1);
  });
  child.on('exit', (code) => {
    if (!stopping) stop(code ?? 1);
  });
}

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
