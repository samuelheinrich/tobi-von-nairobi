#!/usr/bin/env node
/** Reduces downloaded GLB character models to a size a browser game can carry.
 *
 * Originals are never touched: every result is written next to its source as `<name>-game.glb`.
 * The pipeline is the one validated on `nina-dancer.glb` in
 * docs/development/nina-dancer-optimierung.md — 465'635 → 42'799 triangles, 23,9 → 3,5 MiB, with
 * no visible loss at playing distance.
 *
 *   node tools/models/reduce.mjs                     alle Modelle, Vorgabewerte
 *   node tools/models/reduce.mjs nina-dancer.glb     nur eines (Mehrfachnennung möglich)
 *   node tools/models/reduce.mjs --analyse           nur berichten, nichts schreiben
 *   node tools/models/reduce.mjs --target 18000      anderes Dreiecksbudget
 *   node tools/models/reduce.mjs --force             auch neu bauen, wenn das Ergebnis aktuell ist
 *
 * Needs the gltf-transform CLI. It is fetched through `npx` on first use and cached; set
 * GLTF_TRANSFORM to point at a global install instead.
 */
import { execFileSync } from 'node:child_process';
import {
  mkdtempSync,
  readdirSync,
  rmSync,
  existsSync,
  statSync,
  copyFileSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { summarise, stripUnusedUVs } from './glb.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const MODELS = join(repoRoot, 'models');
const SUFFIX = '-game.glb';

/** Triangle budget. The game's own procedural figure costs 31'616, so this leaves room for
 * several imported characters on screen at once. */
const DEFAULT_TARGET = 25_000;
/** Below target × this, reducing geometry costs quality for nothing. */
const SLACK = 1.2;
/** Texture edge length. Every model in the folder ships 1024² or smaller already. */
const TEXTURE_SIZE = 1024;

/** Per-model overrides, for cases where the default budget is wrong.
 * Key is the source file name. */
const OVERRIDES = {
  // Four dancers share the stage in Nana; each one gets a smaller slice.
  'nina-dancer.glb': { target: 30_000 },
  'kayla-dancer.glb': { target: 30_000 },
  'locker_room_glamour-dancer.glb': { target: 30_000 },
};

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const value = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const ANALYSE = flag('analyse');
const FORCE = flag('force');
const GLOBAL_TARGET = Number(value('target', DEFAULT_TARGET));
const names = argv.filter((a) => !a.startsWith('--') && a !== String(GLOBAL_TARGET));

const cli = process.env.GLTF_TRANSFORM;
function gltf(...args) {
  const [command, ...rest] = cli
    ? [cli, ...args]
    : ['npx', '--yes', '@gltf-transform/cli@4.5.0', ...args];
  return execFileSync(command, rest, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

const broken = [];
const refused = [];
const fmt = (n) => n.toLocaleString('de-CH');
const pct = (before, after) => `${(((before - after) / before) * 100).toFixed(1)} %`;

/** Every .glb under models/, subfolders included, as paths relative to models/. */
function walk(dir = '') {
  const out = [];
  for (const entry of readdirSync(join(MODELS, dir), { withFileTypes: true })) {
    const rel = dir ? `${dir}/${entry.name}` : entry.name;
    // `unused/` is the parking bay tidy.mjs moves things to; it is not part of the stock.
    if (entry.isDirectory()) {
      if (entry.name !== 'unused') out.push(...walk(rel));
    } else if (entry.name.endsWith('.glb') && !entry.name.endsWith(SUFFIX)) out.push(rel);
  }
  return out.sort();
}

function sources() {
  const all = walk();
  if (!names.length) return all;
  // A bare file name is enough; the subfolder is looked up.
  const resolved = names.map((n) => all.find((f) => f === n || basename(f) === n) ?? n);
  names.length = 0;
  names.push(...resolved);
  const missing = names.filter((n) => !all.includes(n));
  if (missing.length) {
    console.error(`Nicht in models/: ${missing.join(', ')}`);
    process.exit(1);
  }
  return names;
}

/** Finds the error tolerance that actually reaches the target.
 *
 * Learned from the Nina test: `--ratio` alone does not get there. Topology — split vertices,
 * open borders — stops the simplifier early unless the error cap is loosened, and past a certain
 * point loosening it further changes nothing.
 */
function simplify(input, output, current, target, tmp) {
  const ratio = Math.min(1, target / current);
  let best = null;
  for (const error of [0.001, 0.005, 0.01, 0.03, 0.08]) {
    const candidate = join(tmp, `simp-${error}.glb`);
    gltf(
      'simplify',
      input,
      candidate,
      '--ratio',
      String(ratio),
      '--error',
      String(error),
      '--lock-border',
      'false',
    );
    const got = summarise(candidate).triangles;
    best = { error, got, path: candidate };
    if (got <= target * 1.05) break;
    // No further gain: the topology, not the error cap, is the limit.
    if (best && got > target * 1.05 && error >= 0.03) break;
  }
  copyFileSync(best.path, output);
  return best;
}

function reduceModel(name) {
  const source = join(MODELS, name);
  const target = join(MODELS, name.replace(/\.glb$/i, SUFFIX));
  let before;
  try {
    before = summarise(source);
  } catch (error) {
    // A stray download or a renamed image must not stop the batch.
    console.log(`  ${name}: ÜBERSPRUNGEN — ${error.message.split(': ').pop()}`);
    broken.push(name);
    return null;
  }
  const budget = OVERRIDES[basename(name)]?.target ?? GLOBAL_TARGET;

  // A NoDerivatives licence forbids exactly what this script does. Reducing and re-exporting a
  // model *is* a derivative work, so these are refused rather than quietly processed.
  if (
    /(^|[^A-Za-z])ND([^A-Za-z]|$)/i.test(before.licence ?? '') ||
    /-ND-/i.test(before.licence ?? '')
  ) {
    console.log(
      `  ${name}: ABGELEHNT — Lizenz ${before.licence?.split(' ')[0]} verbietet Bearbeitung.`,
    );
    refused.push(`${name} (${before.licence?.split(' ')[0]})`);
    return null;
  }

  const line =
    `${name}  ${fmt(before.triangles)} Tri · ${before.megabytes.toFixed(1)} MiB` +
    (before.joints ? ` · ${before.joints} Gelenke` : ' · kein Skelett') +
    (before.animations.length ? ` · ${before.animations.length} Clips` : '');

  if (ANALYSE) {
    const verdict = before.triangles <= budget * SLACK ? 'im Budget' : `→ Ziel ${fmt(budget)}`;
    console.log(`  ${line}   ${verdict}`);
    return null;
  }
  if (existsSync(target)) {
    // Someone may have rigged or animated the output by hand — see the nina-dancer workflow test.
    // Rebuilding from the source would silently throw that away, so refuse regardless of --force.
    let existing = null;
    try {
      existing = summarise(target);
    } catch {
      /* unreadable output: rebuilding it is the right move */
    }
    if (
      existing &&
      (existing.joints > before.joints || existing.animations.length > before.animations.length)
    ) {
      console.log(
        `  ${name}: ÜBERSPRUNGEN — ${basename(target)} hat ${existing.joints} Gelenke und ` +
          `${existing.animations.length} Clips, die Quelle nur ${before.joints}/${before.animations.length}. ` +
          `Von Hand nachbearbeitet; zum Neubau die Datei erst löschen.`,
      );
      return null;
    }
    if (!FORCE && statSync(target).mtimeMs > before.mtime) {
      console.log(`  ${name}: aktuell, übersprungen`);
      return null;
    }
  }

  console.log(`\n▸ ${line}`);
  const tmp = mkdtempSync(join(tmpdir(), 'tobi-reduce-'));
  try {
    let step = join(tmp, 'a.glb');
    const droppedUVs = stripUnusedUVs(source, step);
    if (droppedUVs) console.log(`  ${droppedUVs} ungenutzte UV-Sätze entfernt`);

    const next = (label) => {
      const out = join(tmp, `${label}.glb`);
      return [step, out];
    };

    let [inp, out] = next('dedup');
    gltf('dedup', inp, out);
    step = out;

    // Joining merges Sketchfab's 16-bit index chunks into one primitive. Skinned models keep
    // their split: joining them risks losing the joint bindings.
    if (!before.joints && before.primitives > 1) {
      [inp, out] = next('join');
      gltf('join', inp, out);
      step = out;
      console.log(`  ${before.primitives} Primitive zu einem verbunden`);
    }

    [inp, out] = next('weld');
    gltf('weld', inp, out);
    step = out;

    let simplified = null;
    if (before.triangles > budget * SLACK) {
      [inp, out] = next('simplify');
      simplified = simplify(inp, out, summarise(inp).triangles, budget, tmp);
      step = out;
      console.log(`  vereinfacht auf ${fmt(simplified.got)} Tri (error ${simplified.error})`);
    } else {
      console.log(`  Geometrie schon im Budget, unverändert`);
    }

    [inp, out] = next('resize');
    gltf('resize', inp, out, '--width', String(TEXTURE_SIZE), '--height', String(TEXTURE_SIZE));
    step = out;

    // WebP beats JPEG here and keeps alpha. It registers EXT_texture_webp as *required*, so the
    // engine has to know the extension — glb-preview.ts does.
    [inp, out] = next('webp');
    gltf('webp', inp, out, '--quality', '85');
    step = out;

    [inp, out] = next('prune');
    gltf('prune', inp, out);
    step = out;

    copyFileSync(step, target);
    const after = summarise(target);
    console.log(
      `  ✓ ${basename(target)}  ${fmt(after.triangles)} Tri (−${pct(before.triangles, after.triangles)}) · ` +
        `${after.megabytes.toFixed(2)} MiB (−${pct(before.megabytes, after.megabytes)})`,
    );
    return { name, before, after };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

/** Writes the measured facts of every reduced model for the client catalogue to merge with its
 * hand-kept role assignments. Regenerating this is how a new model enters the game. */
function writeCatalogue() {
  const out = join(repoRoot, 'apps/game-client/src/runtime/character/glb-catalogue.json');
  const entries = walk()
    .map((name) => {
      const game = name.replace(/\.glb$/i, SUFFIX);
      if (!existsSync(join(MODELS, game))) return null;
      const after = summarise(join(MODELS, game));
      const before = summarise(join(MODELS, name));
      return {
        file: game,
        source: name,
        megabytes: Number(after.megabytes.toFixed(2)),
        triangles: after.triangles,
        sourceTriangles: before.triangles,
        joints: after.joints,
        animations: after.animations,
        author: (before.author ?? '').replace(/\s*\(.*\)$/, '') || null,
        licence: (before.licence ?? '').replace(/\s*\(.*\)$/, '') || null,
      };
    })
    .filter(Boolean);
  writeFileSync(out, `${JSON.stringify(entries, null, 2)}\n`);
  console.log(
    `\nKatalog geschrieben: ${entries.length} Einträge → ${out.replace(repoRoot + '/', '')}`,
  );
}

const files = sources();
console.log(
  ANALYSE
    ? `Bestand in models/ (Budget ${fmt(GLOBAL_TARGET)} Dreiecke):`
    : `Reduziere ${files.length} Modell(e) auf ${fmt(GLOBAL_TARGET)} Dreiecke und ${TEXTURE_SIZE}² Texturen.`,
);
const done = files.map(reduceModel).filter(Boolean);

if (refused.length) {
  console.log(`\nWegen Lizenz nicht bearbeitet: ${refused.join(', ')}`);
}
if (broken.length) {
  console.log(`\nNicht lesbar, bitte prüfen: ${broken.join(', ')}`);
}
// Always, not only after a rebuild: deleting a model has to reach the catalogue too.
if (!ANALYSE) writeCatalogue();

if (done.length) {
  const tri = done.reduce((a, r) => a + r.before.triangles, 0);
  const triAfter = done.reduce((a, r) => a + r.after.triangles, 0);
  const mb = done.reduce((a, r) => a + r.before.megabytes, 0);
  const mbAfter = done.reduce((a, r) => a + r.after.megabytes, 0);
  console.log(
    `\n${done.length} Modelle:  ${fmt(tri)} → ${fmt(triAfter)} Dreiecke (−${pct(tri, triAfter)})` +
      `   ${mb.toFixed(1)} → ${mbAfter.toFixed(1)} MiB (−${pct(mb, mbAfter)})`,
  );
  const rigged = done.filter((r) => r.after.joints);
  console.log(
    rigged.length
      ? `Davon mit Skelett: ${rigged.map((r) => r.name).join(', ')}`
      : 'Keines der reduzierten Modelle hat ein Skelett — sie bleiben Standbilder.',
  );
}
