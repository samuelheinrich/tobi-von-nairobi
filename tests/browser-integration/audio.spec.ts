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

test('spoken lines use the browser synthesiser, respect mute and never block on failure', async ({
  page,
}) => {
  await page.goto('/test/physics.html');
  await page.locator('body').click();
  const result = await page.evaluate(async () => {
    const path = '/test/audio-harness.ts';
    const module = await import(path);
    return {
      live: await module.exerciseSpokenLines(),
      fallback: await module.exerciseSpokenFallback(),
    };
  });
  const detail = JSON.stringify(result);
  // Voice availability depends on the operating system, so speaking is never asserted outright.
  if (result.live.available) {
    expect(result.live.german, detail).toBe(true);
    expect(result.live.english, detail).toBe(true);
    expect(result.live.yoga, detail).toBe(true);
    // Two lines in the same instant would drift behind the plates; only the first is spoken.
    expect(result.live.throttled, detail).toBe(false);
    const [tobi, flirt, calm] = result.live.chosen;
    // The reported bug: a German line read by an English voice. Language must follow the topic.
    expect(tobi.lang, detail).toMatch(/^de/i);
    expect(calm.lang, detail).toMatch(/^de/i);
    expect(flirt.lang, detail).toMatch(/^en/i);
    // Tobi and a yoga teacher must not come out of the same voice.
    expect(tobi.voice, detail).not.toBe(calm.voice);
    // Novelty voices ("Bells", "Zarvox", "Albert") are never acceptable for dialogue.
    for (const pick of result.live.chosen)
      expect(
        ['bells', 'zarvox', 'albert', 'bad news', 'boing', 'bubbles', 'jester'],
        detail,
      ).not.toContain((pick.voice ?? '').toLowerCase().replace(/\s*\(.*\)$/, ''));
  }
  expect(result.live.muted, detail).toBe(false);
  // A browser without speech support degrades quietly instead of throwing.
  expect(result.fallback.available, detail).toBe(false);
  expect(result.fallback.spoke, detail).toBe(false);
});
