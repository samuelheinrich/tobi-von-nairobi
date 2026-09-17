#!/usr/bin/env node
/** Snapshots the solid geometry of every level out of the running game.
 *
 * Level worlds are built, not described: they exist only as meshes inside a scene. This drives the
 * dev server, opens each level, reads `window.__levelGeometry()` and writes the bodies to
 * `tools/levels/geometry/<level>.json`, which the validator then checks offline.
 *
 * The snapshots are committed. Regenerate them after changing level geometry:
 *
 *   pnpm --filter @tobi/game-client dev        (in einem zweiten Terminal)
 *   node tools/levels/capture-geometry.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const outDir = join(repoRoot, 'tools/levels/geometry');
const base = process.env.TOBI_DEV_URL ?? 'http://127.0.0.1:5173';
const wanted = process.argv.slice(2).filter((a) => !a.startsWith('--'));

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 900, height: 620 } });
await page.goto(base, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4000);

const cards = (await page.locator('button').allInnerTexts())
  .map((text, index) => ({ text: text.replace(/\n/g, ' '), index }))
  .filter((entry) => /^\d\d/.test(entry.text));

for (const card of cards) {
  const label = card.text.slice(0, 40);
  if (wanted.length && !wanted.some((w) => label.toLowerCase().includes(w.toLowerCase()))) continue;
  await page.locator('button').nth(card.index).click();
  await page.waitForTimeout(600);
  const start = (await page.locator('button').allInnerTexts()).findIndex((t) => /STARTEN/.test(t));
  if (start >= 0)
    await page
      .locator('button')
      .nth(start)
      .click()
      .catch(() => {});
  // Geometry is laid down while the level builds; give it room before reading.
  let snapshot = null;
  for (let attempt = 0; attempt < 40; attempt++) {
    await page.waitForTimeout(1500);
    snapshot = await page.evaluate(() => globalThis.__levelGeometry?.() ?? null).catch(() => null);
    if (snapshot?.bodies?.length) break;
  }
  if (!snapshot?.bodies?.length) {
    console.log(`  ${label}: keine Geometrie gelesen`);
    continue;
  }
  const file = join(outDir, `${snapshot.level}.json`);
  writeFileSync(file, `${JSON.stringify(snapshot, null, 1)}\n`);
  console.log(
    `  ${snapshot.level}: ${snapshot.bodies.length} Körper → ${file.replace(repoRoot + '/', '')}`,
  );
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
}
await browser.close();
