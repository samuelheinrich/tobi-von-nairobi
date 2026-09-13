import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

let compressed = 0;
let files = 0;
for (const entry of await readdir('apps/game-client/dist/assets')) {
  const data = await readFile(join('apps/game-client/dist/assets', entry));
  if (entry.endsWith('.js') && data.includes(Buffer.from('DEVELOPER TOOLS'))) {
    throw new Error('Developer panel leaked into production assets');
  }
  compressed += gzipSync(data).byteLength;
  files++;
}
const mebibytes = compressed / 1024 / 1024;
console.log(
  `All ${files} client assets: ${mebibytes.toFixed(2)} MiB with gzip; developer panel excluded.`,
);
if (mebibytes > 15) throw new Error('Client exceeds the initial 15 MiB transfer budget');
