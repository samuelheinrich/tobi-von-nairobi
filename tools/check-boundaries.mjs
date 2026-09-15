import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const errors = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (['node_modules', 'dist', 'generated'].includes(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(path);
      continue;
    }
    if (!/\.[cm]?[jt]sx?$/.test(path)) continue;
    // Build configuration runs in Node by definition and never reaches a browser.
    if (/\.config\.[cm]?[jt]s$/.test(entry.name)) continue;
    const source = await readFile(path, 'utf8');
    const imports = [...source.matchAll(/(?:from\s*|import\s*\()['"]([^'"]+)/g)].map(
      (match) => match[1],
    );
    for (const specifier of imports) {
      if (
        path.startsWith('apps/game-client') &&
        /@tobi\/database|@prisma|node:|game-server/.test(specifier)
      )
        errors.push(`${path}: forbidden browser import ${specifier}`);
      if (
        /^packages\/(game-core|contracts)\//.test(path) &&
        /^(?:@babylonjs(?:\/|$)|react(?:-dom)?(?:\/|$)|@nestjs(?:\/|$)|@prisma(?:\/|$)|node:)/.test(
          specifier,
        )
      )
        errors.push(`${path}: non-portable rule import ${specifier}`);
      if (specifier.includes('/src/') && specifier.startsWith('@tobi/'))
        errors.push(`${path}: private package import ${specifier}`);
      if (specifier.includes('apps/')) errors.push(`${path}: cross-app import ${specifier}`);
    }
  }
}
await walk('apps');
await walk('packages');
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else console.log('Package boundaries valid.');
