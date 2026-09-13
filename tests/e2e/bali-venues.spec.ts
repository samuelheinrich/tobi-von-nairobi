import { expect, test } from '@playwright/test';

test('selects the new Bali venues, shows bottle totals and increases Tobis cartoon mood', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const levels = page.getByRole('combobox', { name: 'Level wählen' });
  await expect(levels).toBeEnabled({ timeout: 45000 });
  await expect(levels.locator('option')).toHaveCount(4);
  await levels.selectOption('bali_beach_bar');
  await expect(page.getByRole('button', { name: 'FLUCHT STARTEN' })).toBeEnabled({
    timeout: 45000,
  });
  await page.screenshot({ path: '.artifacts/screenshots/beach-bar.png' });
  await levels.selectOption('bali_night_market');
  await expect(page.getByRole('button', { name: 'FLUCHT STARTEN' })).toBeEnabled({
    timeout: 45000,
  });
  await page.getByRole('button', { name: 'FLUCHT STARTEN' }).press('Enter');
  await expect(page.getByRole('heading', { name: 'Sammle 15 Flaschen' })).toBeVisible();
  const mood = page.getByRole('progressbar', { name: 'Tobis Pegel' });
  await expect(mood).toHaveAttribute('aria-valuenow', '0');
  await page.keyboard.down('KeyW');
  await expect
    .poll(async () => Number(await mood.getAttribute('aria-valuenow')), { timeout: 30000 })
    .toBeGreaterThanOrEqual(25);
  await page.keyboard.up('KeyW');
  await page.screenshot({ path: '.artifacts/screenshots/night-market.png' });
  await page.keyboard.press('Escape');
  const amount = await mood.getAttribute('aria-valuenow');
  await expect(mood).toHaveAttribute('aria-valuenow', amount!);
  await page.getByRole('button', { name: 'Zurück zum Start', exact: true }).press('Enter');
  await expect(page.getByRole('button', { name: 'FLUCHT STARTEN' })).toBeEnabled({
    timeout: 45000,
  });
  await page.getByRole('button', { name: 'FLUCHT STARTEN' }).press('Enter');
  await expect(mood).toHaveAttribute('aria-valuenow', '0');
  expect(errors).toEqual([]);
});
