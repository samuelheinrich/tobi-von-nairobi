import { randomBytes } from 'node:crypto';
import { access, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
async function create(relative, text) {
  const path = join(root, relative);
  if (await exists(path)) {
    console.log(`Kept ${relative}`);
    return;
  }
  await writeFile(path, text, { flag: 'wx', mode: 0o600 });
  console.log(`Created ${relative}`);
}
const password = randomBytes(24).toString('hex');
await create(
  '.env',
  `POSTGRES_DB=tobi\nPOSTGRES_USER=tobi\nPOSTGRES_PASSWORD=${password}\nPOSTGRES_PORT=5432\n`,
);
const source = await readFile(join(root, '.env'), 'utf8');
const env = Object.fromEntries(
  source
    .split('\n')
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const index = line.indexOf('=');
      return [line.slice(0, index), line.slice(index + 1).replace(/^['"]|['"]$/g, '')];
    }),
);
if (!env.POSTGRES_PASSWORD)
  throw new Error(
    'Set POSTGRES_PASSWORD in .env before continuing. Existing files were preserved.',
  );
const databaseUrl = `postgresql://${encodeURIComponent(env.POSTGRES_USER ?? 'tobi')}:${encodeURIComponent(env.POSTGRES_PASSWORD)}@localhost:${env.POSTGRES_PORT ?? '5432'}/${encodeURIComponent(env.POSTGRES_DB ?? 'tobi')}`;
await create(
  'apps/game-server/.env',
  `DATABASE_URL=${databaseUrl}\nSESSION_SECRET=${randomBytes(32).toString('hex')}\nPORT=3000\nCLIENT_URL=http://localhost:5173\nNODE_ENV=development\n`,
);
await create('apps/game-client/.env', 'VITE_API_BASE_URL=/api/v1\n');
console.log('Next: docker compose up -d --wait, then pnpm dev.');
