import { expect, test } from '@playwright/test';
test('Bali connects interiors, roofs, scooter roads, terraces and boat island without police', async ({
  page,
}) => {
  test.setTimeout(30000);
  await page.goto('/test/physics.html');
  const r = await page.evaluate(async () => {
    const path = '/test/bali-adventure-harness.ts';
    return (await import(path)).exerciseBaliAdventure();
  });
  expect(r.collected).toBe(36);
  expect(r.total).toBe(36);
  expect(r.missing).toEqual([]);
  expect(r.completed, JSON.stringify(r)).toBe(true);
  expect(r.police).toBe(0);
  expect(r.seaExitBlocked).toBe(true);
});
