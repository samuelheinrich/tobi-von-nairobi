import { expect, test } from '@playwright/test';
test.use({ baseURL: 'http://127.0.0.1:5173' });
test('Nana: physical route connects BTS, Soi, all floors and open venue entrances', async ({
  page,
}) => {
  await page.goto('/test/nana.html');
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'true');
  const result = await page.evaluate(async () => {
    const url = '/test/nana-harness.ts';
    return (await import(url)).exerciseNanaRoute();
  });
  expect(result.checkpoints).toHaveLength(20);
  expect(result.checkpoints[0][1]).toBeGreaterThan(8);
  expect(result.checkpoints[4][1]).toBeLessThan(1.5);
  expect(result.checkpoints[10][1]).toBeGreaterThan(5);
  expect(result.checkpoints[15][1]).toBeGreaterThan(10);
  expect(result.quietSecurity).toBe('quiet');
  expect(result.watchingSecurity).toBe('watching');
  expect(result.escorted).toBe(true);
  expect(result.completed).toBe(true);
  expect(result.collected).toBe(16);
  expect(result.cameraChecks).toBeGreaterThan(80);
  expect(result.entries).toHaveLength(9);
  expect(result.flirts).toBe(9);
  expect(result.materials).toBeLessThan(190);
});
