import { expect, test } from '@playwright/test';

// Opt-in local physics checks. No hosted CI configuration is added.
test('physical furniture, ceiling, stairs and moving-car jump/ride', async ({ page }) => {
  await page.goto('/test/physics.html');
  const r = await page.evaluate(async () => {
    const url = '/test/physics-playground-harness.ts';
    return (await import(url)).exercisePlayground();
  });
  expect(r.tableStop[2]).toBeLessThan(-1.3);
  expect(r.tableLand).toBeGreaterThan(1);
  expect(r.tableLand).toBeLessThan(1.13);
  expect(r.roofLand).toBeGreaterThan(1.57);
  expect(r.roofLand).toBeLessThan(1.7);
  expect(r.ceilingPeak).toBeLessThan(1.32);
  expect(r.stairHeight).toBeGreaterThan(1.5);
  expect(r.carLand).toBeGreaterThan(1.19);
  // Capsule retains Babylon contact skin; rendered feet are projected to the surface.
  expect(r.carLand).toBeLessThan(1.37);
  expect(r.carVisualFeet).toBeCloseTo(1.21, 2);
  expect(r.rideError).toBeLessThan(0.1);
  expect(r.takeoff[0]).toBeCloseTo(2, 1);
  expect(r.takeoff[1]).toBeGreaterThan(0);
  expect(r.push).toBeGreaterThan(1);
  expect(r.lifted).toBeCloseTo(1, 1);
  expect(r.rotated).toBeLessThan(-0.2);
});

test('Nana colliders, crowd grounding, elevated bottle and instanced traffic', async ({ page }) => {
  await page.goto('/test/physics.html');
  const r = await page.evaluate(async () => {
    const url = '/test/physics-nana-harness.ts';
    return (await import(url)).exerciseNanaPhysics();
  });
  for (const [i, y] of [0, 4.8, 9.6].entries()) {
    expect(r.floors[i]).toBeGreaterThanOrEqual(y);
    expect(r.floors[i]).toBeLessThan(y + 0.17);
    expect(r.visualFloors[i]).toBeCloseTo(y + 0.01, 2);
    expect(r.floorHits[i]).toBeCloseTo(y, 2);
  }
  expect(r.table).toBeGreaterThanOrEqual(1);
  expect(r.roof).toBeGreaterThan(3.35);
  expect(r.barBlocked).toBeLessThan(29);
  expect(r.tableBlocked).toBeGreaterThan(-2.9);
  expect(r.unresolved).toBe(0);
  expect(r.npcFeet).toBeGreaterThanOrEqual(9.6);
  expect(r.npcFeet).toBeLessThan(9.7);
  expect(r.nearCapsules).toBe(1);
  expect(r.bottleImpacts).toBe(1);
  expect(r.rideError).toBeLessThan(0.1);
});

test('physical custody bunk remains reachable for ending the night', async ({ page }) => {
  await page.goto('/test/physics.html');
  const r = await page.evaluate(async () => {
    const url = '/test/physics-custody-harness.ts';
    return (await import(url)).exerciseCustodyPhysics();
  });
  expect(r.bunkBody).toBe(true);
  expect(r.feet[2]).toBeGreaterThan(-1);
  expect(r.distance).toBeLessThan(r.radius);
});
