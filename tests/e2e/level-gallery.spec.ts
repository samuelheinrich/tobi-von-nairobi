import { finishTutorialLessons } from '../helpers/tutorial.js';
import { expect, test } from '@playwright/test';

test('guests can browse every illustrated level and start the WG with the API offline', async ({
  page,
}) => {
  const writes: string[] = [];
  await page.route('**/api/**', async (route) => {
    if (route.request().method() !== 'GET') writes.push(route.request().url());
    await route.abort('failed');
  });
  await page.goto('/');
  const gallery = page.getByRole('region', { name: 'Levelauswahl' });
  const cards = gallery.getByRole('button');
  await expect(cards).toHaveCount(7);
  await expect(cards.first()).toHaveAccessibleName('Level 1: Tutorial');
  await expect(cards.first()).toHaveAttribute('aria-pressed', 'true');
  await expect(gallery).toContainText('Kein Login nötig.');
  await expect
    .poll(() =>
      gallery
        .locator('img')
        .evaluateAll((images) =>
          images.every(
            (image) =>
              image instanceof HTMLImageElement && image.complete && image.naturalWidth === 640,
          ),
        ),
    )
    .toBe(true);
  for (const card of await cards.all()) {
    await card.press('Enter');
    await expect(card).toHaveAttribute('aria-pressed', 'true');
    await expect(gallery.locator('[aria-pressed="true"]')).toHaveCount(1);
  }
  // Browsing ends on the last card, so pick the WG again before starting it.
  await page.getByRole('button', { name: 'Level 5: Arlesheim Hippie-WG' }).press('Enter');
  const start = page.getByRole('button', { name: 'REIN IN DIE WG' });
  await expect(start).toBeEnabled({ timeout: 45000 });
  await page.screenshot({ path: '.artifacts/screenshots/level-gallery.png' });
  await start.press('Enter');
  await expect(page.getByRole('heading', { name: 'Sammle 18 Flaschen' })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Konto und Fortschritt' })).not.toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Zurück zum Start', exact: true }).press('Enter');
  await cards.first().press('Enter');
  await expect(page.getByRole('button', { name: 'TUTORIAL STARTEN' })).toBeEnabled({
    timeout: 45000,
  });
  expect(writes).toEqual([]);
});

test('level cards stay reachable on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const card = page.getByRole('button', { name: 'Level 3: Thailand Railway' });
  await card.click();
  await expect(card).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'EINSTEIGEN' })).toBeEnabled({ timeout: 45000 });
  await expect
    .poll(() =>
      page.locator('.level-menu').evaluate((menu) => menu.scrollWidth <= menu.clientWidth),
    )
    .toBe(true);
});

test('guest start ignores a pending session lookup and a late login does not claim that run', async ({
  page,
}) => {
  test.setTimeout(240000);
  // Hold just the session response, independently of software-renderer speed and HTTP timeout.
  await page.addInitScript(() => {
    const request = window.fetch.bind(window);
    window.fetch = (input, options) =>
      request(
        input,
        String(input).endsWith('/auth/session') ? { ...options, signal: null } : options,
      );
  });
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let waiting = false;
  const writes: string[] = [];
  await page.route('**/api/v1/runs**', async (route) => {
    writes.push(route.request().url());
    await route.abort();
  });
  await page.route('**/api/v1/progress', (route) =>
    route.fulfill({
      json: {
        saveId: '00000000-0000-4000-8000-000000000007',
        revision: 0,
        score: 0,
        levels: [],
        activeRun: null,
      },
    }),
  );
  await page.route('**/api/v1/auth/session', async (route) => {
    waiting = true;
    await gate;
    await route.fulfill({
      json: {
        user: { id: '00000000-0000-4000-8000-000000000007', username: 'late_login' },
        csrfToken: 'browser-fixture-only',
      },
    });
  });
  try {
    await page.goto('/');
    await expect.poll(() => waiting).toBe(true);
    const start = page.getByRole('button', { name: 'TUTORIAL STARTEN' });
    await expect(start).toBeEnabled({ timeout: 45000 });
    await start.press('Enter');
    await expect(page.getByTestId('tutorial-coach')).toHaveAttribute('data-lesson', 'walk');
    await expect(page.getByRole('dialog', { name: 'Konto und Fortschritt' })).not.toBeVisible();
    release();
    await expect(page.getByRole('button', { name: 'KONTO · late_login' })).toBeVisible();
    await finishTutorialLessons(page);
    await page.keyboard.press('KeyE');
    const result = page.getByRole('dialog', { name: 'Tutorial abgeschlossen' });
    await expect(result).toBeVisible();
    await expect(result).toContainText('Dieser Durchlauf wird noch nicht gespeichert.');
    expect(writes).toEqual([]);
  } finally {
    release();
  }
});
