import { expect, type Page } from '@playwright/test';
/** Reads the live capsule projection and drives ordinary keys; never teleports or edits gameplay. */
export async function walkNana(page: Page, x: number, z: number, tolerance = 0.5) {
  let held = '';
  try {
    await expect(async () => {
      const raw = await page
        .locator('canvas[data-player-position]')
        .getAttribute('data-player-position');
      const [px, , pz] = raw!.split(',').map(Number);
      const dx = x - px!,
        dz = z - pz!;
      const key =
        Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'KeyD' : 'KeyA') : dz > 0 ? 'KeyW' : 'KeyS';
      if (held !== key) {
        if (held) await page.keyboard.up(held);
        await page.keyboard.down(key);
        held = key;
      }
      expect(Math.hypot(dx, dz)).toBeLessThan(tolerance);
    }).toPass({ timeout: 30000, intervals: [80] });
  } finally {
    if (held) await page.keyboard.up(held);
  }
}
export async function leaveNanaStation(page: Page) {
  for (const [x, z] of [
    [60, -49],
    [64, -49],
    [64, -44],
    [0, -44],
  ] as const)
    await walkNana(page, x, z);
}
