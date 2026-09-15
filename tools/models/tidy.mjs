#!/usr/bin/env node
/** Sorts the local `models/` folder into what is worth keeping and what was only ever scratch.
 *
 * Nothing is deleted: everything that goes is moved to `models/unused/`, keeping its relative
 * path, so any decision here can be undone with a move back.
 *
 *   node tools/models/tidy.mjs          zeigt den Plan, ändert nichts
 *   node tools/models/tidy.mjs --apply  verschiebt
 *
 * Kept:
 *   - anything whose bytes are currently shipped in `public/characters/`
 *   - every Tobi, Chris and Sam variant, used or not
 *   - everything under `skellet-rigged/` that actually carries a skeleton, plus its Mixamo FBX
 *   - any other rigged model that could still be cast
 *   - the Quaternius kit, which the character composer reads
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const MODELS = join(repoRoot, 'models');
const UNUSED = join(MODELS, 'unused');
const APPLY = process.argv.includes('--apply');

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'unused' ? [] : walk(path);
    return [path];
  });

const md5 = (path) => createHash('md5').update(readFileSync(path)).digest('hex');

/** Joint count, or null when the file is not a readable GLB. */
function joints(path) {
  try {
    const buffer = readFileSync(path);
    if (buffer.readUInt32LE(0) !== 0x46546c67) return null;
    const json = JSON.parse(buffer.toString('utf8', 20, 20 + buffer.readUInt32LE(12)));
    return (json.skins ?? []).reduce((sum, skin) => sum + skin.joints.length, 0);
  } catch {
    return null;
  }
}

const shipped = new Set(
  walk(join(repoRoot, 'apps/game-client/public/characters'))
    .filter((path) => path.endsWith('.glb'))
    .map(md5),
);

/** Why a file stays, or null to move it. */
function verdict(path) {
  const rel = relative(MODELS, path);
  const name = rel.toLowerCase();
  // Conversion leftovers never earn a reprieve, whatever they are named after.
  if (/\.(ds_store|log)$/.test(name) || name.endsWith('.conversion.json')) return null;
  if (name.includes('pipeline-smoke')) return null;
  if (rel.startsWith('work/remaining-fbx/') || rel.startsWith('work/tpose-fbx/')) return null;
  if (path.endsWith('.glb') && shipped.has(md5(path))) return 'ausgeliefert';
  // Model files only — an owner's likeness is worth keeping even unused, a log about it is not.
  if (/\.(glb|fbx)$/.test(name) && /(^|[/_-])(tobi|chris|sam)([/_.-]|$)/.test(name))
    return 'Tobi/Chris/Sam';
  if (rel.startsWith('Universal Base Characters')) return 'Quaternius-Kit';
  const inKeeperFolder = rel.startsWith('skellet-rigged/') || rel.startsWith('tpose/');
  // A Mixamo download is rigged by definition; a GLB has to prove it.
  if (inKeeperFolder && path.endsWith('.fbx')) return 'Mixamo-FBX';
  const bones = path.endsWith('.glb') ? joints(path) : null;
  // One joint is a wrapper, not a skeleton.
  if (bones !== null && bones > 1 && !rel.startsWith('work/')) return `gerigged (${bones} Gelenke)`;
  return null;
}

const rows = walk(MODELS).map((path) => ({
  path,
  rel: relative(MODELS, path),
  keep: verdict(path),
  size: statSync(path).size,
}));
const keep = rows.filter((r) => r.keep);
const move = rows.filter((r) => !r.keep);
const mib = (n) => (n / 1048576).toFixed(1);
const sum = (list) => list.reduce((a, r) => a + r.size, 0);

const reasons = {};
for (const r of keep) (reasons[r.keep] ??= []).push(r);
console.log(`BLEIBT — ${keep.length} Dateien, ${mib(sum(keep))} MiB`);
for (const [why, list] of Object.entries(reasons).sort((a, b) => b[1].length - a[1].length))
  console.log(
    `  ${String(list.length).padStart(4)} Dateien  ${mib(sum(list)).padStart(7)} MiB  ${why}`,
  );

const byDir = {};
for (const r of move) {
  const dir = r.rel.includes('/') ? r.rel.split('/').slice(0, -1).join('/') : '(oberste Ebene)';
  (byDir[dir] ??= []).push(r);
}
console.log(
  `\nWIRD VERSCHOBEN nach models/unused/ — ${move.length} Dateien, ${mib(sum(move))} MiB`,
);
for (const [dir, list] of Object.entries(byDir).sort((a, b) => sum(b[1]) - sum(a[1])))
  console.log(
    `  ${String(list.length).padStart(4)} Dateien  ${mib(sum(list)).padStart(7)} MiB  ${dir}`,
  );

if (!APPLY) {
  console.log('\nTrockenlauf. Mit --apply verschieben.');
  process.exit(0);
}
for (const row of move) {
  const target = join(UNUSED, row.rel);
  mkdirSync(dirname(target), { recursive: true });
  if (existsSync(target)) {
    console.warn(`  übersprungen, Ziel existiert: ${row.rel}`);
    continue;
  }
  renameSync(row.path, target);
}
console.log(`\n${move.length} Dateien nach models/unused/ verschoben.`);
