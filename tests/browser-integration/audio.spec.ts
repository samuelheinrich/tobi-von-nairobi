import { expect, test } from '@playwright/test';

test('real audio graph emits cues, mutes immediately, pauses, resumes and closes', async ({
  page,
}) => {
  await page.goto('/test/physics.html');
  await page.locator('body').click();
  const result = await page.evaluate(async () => {
    const path = '/test/audio-harness.ts';
    return (await import(path)).exerciseAudio();
  });
  expect(result.audible).toBeGreaterThan(0);
  expect(result.muted).toBe(0);
  expect(result.unmuted).toBeGreaterThan(0);
  expect(result.paused).toBe('suspended');
  expect(result.resumed).toBe('running');
  expect(result.closed).toBe('closed');
  expect(result.factoryCalls).toBe(1);
});
