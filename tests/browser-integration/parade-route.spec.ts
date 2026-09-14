import { expect, test } from '@playwright/test';

test('Street Parade: the Zurich route is walkable end to end and the lake is not', async ({
  page,
}) => {
  test.setTimeout(240000);
  await page.goto('/test/physics.html');
  const result = await page.evaluate(async () => {
    const path = '/test/pursuit-harness.ts';
    return (await import(path)).exerciseParadeRoute();
  });
  const detail = JSON.stringify(result);
  // Utoquai, Bellevue, Quaibruecke, Buerkliplatz, General-Guisan-Quai, Hafendamm Enge.
  expect(result.completedRoute, detail).toBe(true);
  expect(result.atDestination, detail).toBe(true);
  expect(result.onBridge, detail).toBeGreaterThan(0);
  expect(result.collected, detail).toBeGreaterThan(0);
  // The quay walls hold: Tobi never stands on the water, and cannot reach the middle of the basin.
  expect(result.onWater, detail).toBe(0);
  expect(result.enteredLake, detail).toBe(false);
  // The bucketed navigation grid still serves the whole 104 x 108 metre plate.
  expect(result.acrossCity, detail).toBeGreaterThan(20);
  expect(result.acrossCityOpen, detail).toBe(true);
  expect(result.lakeTargetOpen, detail).toBe(false);
  expect(result.stepsOnWater, detail).toBe(0);
  expect(result.acrossCityMs, detail).toBeLessThan(400);
});
