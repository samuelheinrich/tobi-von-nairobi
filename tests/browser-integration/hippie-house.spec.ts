import { expect, test } from '@playwright/test';
test('Hippie-WG: eighteen rooms on three storeys, stairs, garden and Arlesheim neighbourhood', async ({
  page,
}) => {
  await page.goto('/test/physics.html');
  const result = await page.evaluate(async () => {
    const path = '/test/house-harness.ts';
    return (await import(path)).exerciseHouseRoute();
  });
  expect(result.floors.map((f: { collected: number }) => f.collected)).toEqual([6, 12, 18]);
  for (const [index, floor] of result.floors.entries())
    expect(floor.height).toBeCloseTo((2 - index) * 4.5 + 1, 0);
  expect(result.blockedExit).toBe(true);
  expect(result.backtrackHeight).toBeCloseTo(10, 0);
  expect(result.hiddenUpper).toBe(true);
  expect(result.groundVisible).toBe(true);
  expect(result.completed).toBe(true);
  expect(result.score).toBe(4100);
  expect(result.collected).toBe(36);
  expect(result.exteriorVisible).toBe(true);
  expect(result.interiorRestored).toBe(true);
  expect(result.position[1]).toBeCloseTo(1, 0);
});
