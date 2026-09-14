import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { playableLevels } from '../../packages/game-data/dist/index.js';

const base = process.env.PREVIEW_BASE_URL ?? 'http://127.0.0.1:5173';
const directory = new URL('../../apps/game-client/src/assets/level-previews/', import.meta.url);
await mkdir(directory, { recursive: true });
const selected = process.env.PREVIEW_LEVEL;
const levels = selected ? playableLevels.filter((level) => level.id === selected) : playableLevels;
if (!levels.length) throw new Error(`Unknown PREVIEW_LEVEL: ${selected}`);
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  for (const level of levels) {
    await page.goto(`${base}/test/level-previews.html?level=${encodeURIComponent(level.id)}`);
    await page.waitForSelector('body[data-preview-ready="true"]', { timeout: 45000 });
    const data = await page
      .locator('canvas')
      .evaluate((canvas) => canvas.toDataURL('image/webp', 0.82));
    const file = Buffer.from(data.split(',')[1], 'base64');
    await writeFile(new URL(`${level.id}.webp`, directory), file);
    console.log(`${level.id}: ${(file.byteLength / 1024).toFixed(1)} KiB`);
  }
} finally {
  await browser.close();
}
