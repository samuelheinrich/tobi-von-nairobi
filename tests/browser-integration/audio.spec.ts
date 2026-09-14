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

test('the shipped CC0 recordings decode, register as variants and rotate', async ({ page }) => {
  await page.goto('/test/physics.html');
  await page.locator('body').click();
  const result = await page.evaluate(async () => {
    const path = '/test/audio-harness.ts';
    return (await import(path)).exerciseSamples();
  });
  const detail = JSON.stringify(result);
  expect(result.declared, detail).toBeGreaterThan(0);
  expect(result.cues, detail).toBeGreaterThan(0);
  expect(result.smashTakes, detail).toBe(3);
  expect(result.stepTakes, detail).toBe(3);
  expect(result.distinctSmash, detail).toBe(3);
  expect(result.wrapsAround, detail).toBe(true);
  expect(result.allDecoded, detail).toBe(true);
  // A cue without files stays synthesized rather than falling silent.
  expect(result.synthesizedCue, detail).toBe(0);
});
