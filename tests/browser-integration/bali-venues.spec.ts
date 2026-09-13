import { expect, test } from '@playwright/test';

for (const [id, bottles] of [
  ['bali_beach_bar', 10],
  ['bali_night_market', 15],
] as const) {
  test(`${id}: every bottle and the complete escape route are reachable`, async ({ page }) => {
    await page.goto('/test/physics.html');
    const result = await page.evaluate(async (levelId) => {
      const path = '/test/pursuit-harness.ts';
      return (await import(path)).exerciseEscapeRoute('escape', levelId);
    }, id);
    expect(result.collected, JSON.stringify(result)).toBe(bottles);
    expect(result.caught, JSON.stringify(result)).toBe(false);
    expect(result.completed, JSON.stringify(result)).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(bottles * 100 + 1000);
  });
}
