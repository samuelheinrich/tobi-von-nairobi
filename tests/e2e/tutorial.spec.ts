import { finishTutorialLessons } from '../helpers/tutorial.js';
import { expect, test } from '@playwright/test';

// Software rendering on CI advances the bounded simulation more slowly than wall time.
// Keep checking real gameplay outcomes, with extra time for those frames to render.

const recoveryTimeoutMs = process.env.CI ? 30000 : 10000;

test('loads the scene, pauses safely, collects real pickups and checks in', async ({ page }) => {
  test.setTimeout(240000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'TUTORIAL STARTEN' })).toBeEnabled({
    timeout: 45000,
  });
  await page.screenshot({ path: '.artifacts/screenshots/landing.png' });
  await page.getByRole('button', { name: 'TUTORIAL STARTEN' }).click();
  await expect(page.getByTestId('tutorial-coach')).toHaveAttribute('data-lesson', 'walk');
  await page.screenshot({ path: '.artifacts/screenshots/tutorial-guide.png' });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Pause und Steuerung' })).toBeVisible();
  // Keyboard activation avoids synthetic cursor movement during pointer-lock transitions.
  await page.getByRole('button', { name: 'WEITER GEHT’S' }).press('Enter');
  await finishTutorialLessons(page);
  await page.screenshot({ path: '.artifacts/screenshots/gameplay.png' });
  await page.keyboard.press('KeyE');
  await expect(page.getByRole('dialog', { name: 'Tutorial abgeschlossen' })).toBeVisible();
  await expect(page.getByRole('dialog').getByText(/^1['’]000$/)).toBeVisible();
  await expect(
    page.getByText('Dieser Durchlauf wird noch nicht gespeichert.', { exact: false }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'NOCH EINE RUNDE' }).click();
  await expect(page.getByRole('button', { name: 'TUTORIAL STARTEN' })).toBeEnabled({
    timeout: 30000,
  });
  expect(errors).toEqual([]);
});

test('sprint drains stamina and pause releases held movement keys', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'TUTORIAL STARTEN' }).click({ timeout: 45000 });
  const stamina = page.getByRole('progressbar', { name: 'Stamina' });
  await page.keyboard.down('KeyA');
  await page.keyboard.down('ShiftLeft');
  await expect
    .poll(async () => Number(await stamina.getAttribute('aria-valuenow')), { timeout: 15000 })
    .toBeLessThan(85);
  await page.keyboard.press('Space');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Pause und Steuerung' })).toBeVisible();
  await page.keyboard.up('KeyA');
  await page.keyboard.up('ShiftLeft');
  // Keyboard activation avoids synthetic cursor movement during pointer-lock transitions.
  await page.getByRole('button', { name: 'WEITER GEHT’S' }).press('Enter');
  await expect(stamina).toHaveAttribute('aria-valuenow', '100', { timeout: recoveryTimeoutMs });
  await expect(page.getByRole('alert')).toHaveCount(0);
});
