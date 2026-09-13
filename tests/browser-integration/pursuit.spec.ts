import { expect, test } from '@playwright/test';

test('Bali escape route uses actual collisions, visibility and mission gates', async ({ page }) => {
  await page.goto('/test/physics.html');
  const result = await page.evaluate(async () => {
    const url = '/test/pursuit-harness.ts';
    const harness = await import(url);
    const stationary = await harness.exerciseEscapeRoute('stand');
    const run = await harness.exerciseEscapeRoute();
    return {
      ...run,
      stationaryCaught: stationary.caught,
      activeEngines: harness.activeEngineCount(),
    };
  });
  expect(result.stationaryCaught).toBe(true);
  expect(result.collected, JSON.stringify(result)).toBe(5);
  expect(result.blockedCheckIn).toBe(true);
  expect(result.wanted).toBe(3);
  expect(result.states).toContain('CHASE');
  expect(result.states).toContain('SEARCH');
  expect(result.caught, JSON.stringify(result)).toBe(false);
  expect(result.completed, JSON.stringify(result)).toBe(true);
  expect(result.score).toBe(1500);
  expect(result.activeEngines).toBe(0);
});
