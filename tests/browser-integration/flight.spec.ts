import { expect, test } from '@playwright/test';
test('Fly High is solvable through seats, toilet, trolley detours and real A380 stairs', async ({
  page,
}) => {
  test.setTimeout(240000);
  await page.goto('/test/physics.html');
  const result = await page.evaluate(async () => {
    const path = '/test/flight-harness.ts';
    return (await import(path)).exerciseFlight();
  });
  expect(result.stage).toBe(2);
  expect(result.ready).toBe(true);
  expect(result.returns).toBe(0);
  expect(result.upstairs).toBeGreaterThan(5);
  expect(result.aftUp).toBeGreaterThan(5);
  expect(result.aftDown).toBeLessThan(1.2);
  expect(result.police).toBe(0);
  expect(result.cloudCount).toBe(30);
  expect(result.seats).toBe(204);
});
