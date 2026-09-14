import { expect, test } from '@playwright/test';
test('the three Bali venues are one selectable coastal adventure and pickups still increase mood', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  const levels = page.getByRole('combobox', { name: 'Level wählen' });
  await expect(levels.locator('option')).toHaveCount(7);
  for (const id of ['bali_beach_bar', 'bali_night_market', 'bali_mvp_escape'])
    await expect(levels.locator(`option[value="${id}"]`)).toHaveCount(0);
  await levels.selectOption('bali_adventure');
  await page.getByRole('button', { name: 'FLUCHT STARTEN' }).press('Enter', { timeout: 60000 });
  await expect(page.getByRole('heading', { name: 'Sammle 18 Flaschen' })).toBeVisible();
  const mood = page.getByRole('progressbar', { name: 'Tobis Pegel' });
  await page.keyboard.down('KeyD');
  await expect(page.getByTestId('bottle-count')).toContainText('3 / 18', { timeout: 30000 });
  await page.keyboard.up('KeyD');
  await expect
    .poll(async () => Number(await mood.getAttribute('aria-valuenow')), { timeout: 15000 })
    .toBeGreaterThanOrEqual(25);
  await page.screenshot({ path: '.artifacts/screenshots/bali-coast-beach.png' });
  await page.keyboard.press('Escape');
  const amount = await mood.getAttribute('aria-valuenow');
  await expect(mood).toHaveAttribute('aria-valuenow', amount!);
  await page.getByRole('button', { name: 'Zurück zum Start', exact: true }).press('Enter');
  await page.getByRole('button', { name: 'FLUCHT STARTEN' }).press('Enter', { timeout: 60000 });
  await expect(mood).toHaveAttribute('aria-valuenow', '0');
  expect(errors).toEqual([]);
});
