import { expect, test } from '@playwright/test';
test('the train has endless moving scenery with a bounded pool and stationary gameplay colliders', async ({
  page,
}) => {
  await page.goto('/test/physics.html');
  const result = await page.evaluate(async () => {
    const path = '/test/railway-motion-harness.ts';
    return (await import(path)).exerciseRailwayMotion();
  });
  expect(result).toEqual({
    moved: true,
    strips: 16,
    bounded: true,
    stableMeshes: true,
    stablePhysics: true,
  });
});
