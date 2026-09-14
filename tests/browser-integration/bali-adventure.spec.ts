import { expect, test } from '@playwright/test';
test('Bali connects beach, market and escape alleys over real ground and requires a genuine escape', async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.goto('/test/physics.html');
  const r = await page.evaluate(async () => {
    const path = '/test/bali-adventure-harness.ts';
    return (await import(path)).exerciseBaliAdventure();
  });
  expect(r.collected).toBe(18);
  expect(r.completed, JSON.stringify(r)).toBe(true);
  expect(r.water).toBe(0);
  expect(r.contact).toBe(true);
  expect(r.escapes).toBeGreaterThan(0);
  expect(r.oceanOpen).toBe(false);
});
