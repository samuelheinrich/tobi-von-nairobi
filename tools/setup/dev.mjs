import { spawn } from 'node:child_process';

const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`pnpm ${args.join(' ')} failed (${code})`)),
    );
  });
}
try {
  await run(['db:migrate']);
  await run(['build']);
  const children = [
    ['--filter', '@tobi/contracts', 'dev'],
    ['--filter', '@tobi/game-data', 'dev'],
    ['--filter', '@tobi/game-core', 'dev'],
    ['--filter', '@tobi/api-client', 'dev'],
    ['--filter', '@tobi/game-server', 'dev'],
    ['--filter', '@tobi/game-server', 'start:watch'],
    ['--filter', '@tobi/game-client', 'dev'],
  ].map((args) => spawn(command, args, { stdio: 'inherit' }));
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    for (const child of children) child.kill('SIGTERM');
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  for (const child of children) {
    child.on('error', (error) => {
      console.error(error.message);
      process.exitCode = 1;
      stop();
    });
    child.on('exit', (code) => {
      if (!stopping) {
        process.exitCode = code ?? 1;
        stop();
      }
    });
  }
} catch (error) {
  console.error(`${error.message}\nCheck pnpm run setup and docker compose up -d --wait.`);
  process.exitCode = 1;
}
