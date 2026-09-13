import { expect, test } from '@playwright/test';

test('Havok supports grounding, jumping, wall blocking and camera clearance without leaking engines', async ({
  page,
}) => {
  await page.goto('/test/physics.html');
  await expect(page.locator('body')).toHaveAttribute('data-physics-ready', 'true');
  const result = await page.evaluate(async () => {
    const moduleUrl = '/test/physics-harness.ts';
    const harness = await import(moduleUrl);
    const first = await harness.exercisePhysics();
    const second = await harness.exercisePhysics();
    return { first, second, activeEngines: harness.activeEngineCount() };
  });
  for (const run of [result.first, result.second]) {
    expect(run.grounded).toBe(true);
    expect(run.settledHeight).toBeGreaterThan(0.8);
    expect(run.settledHeight).toBeLessThan(1.2);
    expect(run.highestJump - run.settledHeight).toBeGreaterThan(1);
    expect(Math.abs(run.landedHeight - run.settledHeight)).toBeLessThan(0.1);
    expect(run.stoppedZ).toBeGreaterThan(2.5);
    expect(run.stoppedZ).toBeLessThan(3.2);
    expect(run.cameraZ, JSON.stringify(run)).toBeLessThan(3.5);
    expect(run.automaticPhysics).toBe(false);
  }
  expect(result.activeEngines).toBe(0);
});
