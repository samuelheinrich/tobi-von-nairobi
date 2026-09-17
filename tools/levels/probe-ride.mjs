#!/usr/bin/env node
/** Watches a level run instead of measuring it standing still.
 *
 * Geometry checks answer «is there a floor». They cannot answer «does the S16 stop at both
 * stations and open its doors», which is what was actually broken in Zürich. This opens the level
 * in the dev server and samples `window.__levelProbe()` for a while.
 *
 *   pnpm --filter @tobi/game-client dev     (in einem zweiten Terminal)
 *   node tools/levels/probe-ride.mjs "Street Parade" 60
 */
import { chromium } from '@playwright/test';

const wanted = process.argv[2] ?? 'Street Parade';
const seconds = Number(process.argv[3] ?? 60);
const base = process.env.TOBI_DEV_URL ?? 'http://127.0.0.1:5173';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 900, height: 620 } });
page.on('pageerror', (error) => console.log('SEITENFEHLER', String(error).slice(0, 200)));
await page.goto(base, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4000);

const cards = await page.locator('button').allInnerTexts();
const card = cards.findIndex((text) => text.toLowerCase().includes(wanted.toLowerCase()));
if (card < 0) {
  console.error(`Kein Level mit «${wanted}» gefunden.`);
  await browser.close();
  process.exit(1);
}
await page.locator('button').nth(card).click();
await page.waitForTimeout(700);
const start = (await page.locator('button').allInnerTexts()).findIndex((t) => /STARTEN/.test(t));
await page.locator('button').nth(start).click();
await page.waitForTimeout(8000);

// Printed as it happens, not collected and printed at the end: a run that is cut short still
// has to leave something behind.
const last = new Map();
let samples = 0;
const began = Date.now();
for (let tick = 0; tick * 1.5 < seconds; tick++) {
  const probe = await page.evaluate(() => globalThis.__levelProbe?.() ?? null);
  if (probe?.trains) {
    samples++;
    for (const train of probe.trains) {
      const state = `${train.state} · ${train.currentStation} → ${train.nextStation} · Türen ${train.doorState}`;
      if (last.get(train.id) === state) continue;
      last.set(train.id, state);
      const at = ((Date.now() - began) / 1000).toFixed(0).padStart(4);
      console.log(`${at}s  ${train.id}  ${state}`);
    }
  }
  await page.waitForTimeout(1500);
}
if (!samples) console.log('Keine Zugdaten — hat das Level überhaupt Züge?');
await browser.close();
