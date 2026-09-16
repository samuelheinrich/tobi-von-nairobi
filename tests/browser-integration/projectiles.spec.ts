import { expect, test } from '@playwright/test';
test('swept bottles hit and stagger guards once; a wall blocks the hit and stun expires', async ({
  page,
}) => {
  await page.goto('/test/physics.html');
  const result = await page.evaluate(async () => {
    const path = '/test/projectile-harness.ts';
    const m = await import(path);
    return { open: await m.exerciseProjectiles(false), wall: await m.exerciseProjectiles(true) };
  });
  expect(result.open).toEqual({
    hits: 1,
    staggered: true,
    recovered: true,
    remaining: 0,
    impacts: 1,
  });
  expect(result.wall).toEqual({
    hits: 0,
    staggered: false,
    recovered: true,
    remaining: 0,
    impacts: 1,
  });
});

test('bottles hit all four directions when Tobi turns, even with a fixed camera', async ({
  page,
}) => {
  await page.goto('/test/physics.html');
  const hits = await page.evaluate(async () => {
    const path = '/test/projectile-harness.ts';
    return (await import(path)).exerciseThrowDirections();
  });
  expect(hits).toEqual([0, 1, 2, 3]);
});
