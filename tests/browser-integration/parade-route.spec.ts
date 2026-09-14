import { expect, test } from '@playwright/test';
test('Street Parade: collect twenty bottles and escape behind a music float', async ({ page }) => {
  await page.goto('/test/physics.html');
  const result = await page.evaluate(async () => {
    const path = '/test/pursuit-harness.ts';
    return (await import(path)).exerciseEscapeRoute('escape', 'zurich_street_parade');
  });
  expect(result.collected, JSON.stringify(result)).toBe(20);
  expect(result.caught, JSON.stringify(result)).toBe(false);
  expect(result.completed, JSON.stringify(result)).toBe(true);
});
