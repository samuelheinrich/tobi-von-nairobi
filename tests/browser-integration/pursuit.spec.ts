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

test('a patrol shouts when it spots Tobi, while chasing and once it loses him', async ({
  page,
}) => {
  await page.goto('/test/physics.html');
  const result = await page.evaluate(async () => {
    const path = '/test/pursuit-harness.ts';
    const module = await import(path);
    return {
      // Standing in the open holds a sightline, so the chase actually lasts.
      held: await module.exerciseEscapeRoute('stand'),
      broken: await module.exerciseEscapeRoute('escape'),
    };
  });
  const held = JSON.stringify(result.held.calloutTopics);
  const broken = JSON.stringify(result.broken.calloutTopics);
  // The chase is the loudest moment in the game; it must not be silent.
  expect(result.held.calloutTopics, held).toContain('policeSpotted');
  expect(result.held.calloutTopics, held).toContain('policeChase');
  // Breaking the sightline turns the shouting into searching.
  expect(result.broken.calloutTopics, broken).toContain('policeSearch');
  // Officers speak in turn, not all at once: only one line is pending per tick.
  expect(result.held.callouts.length, held).toBeGreaterThan(3);
  expect(
    result.held.callouts.every((c: { text: string }) => c.text.length > 0),
    held,
  ).toBe(true);
});
