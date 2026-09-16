import { expect, test } from '@playwright/test';

test('Hippie-WG opens on the top floor and collects only that storeys bottle', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const levels = page.getByRole('combobox', { name: 'Level wählen' });
  await expect(levels).toBeEnabled({ timeout: 45000 });
  await levels.selectOption('arlesheim_hippie_wg');
  const start = page.getByRole('button', { name: 'REIN IN DIE WG' });
  await expect(start).toBeEnabled({ timeout: 45000 });
  await start.press('Enter');
  await expect(page.getByTestId('interior-floor')).toContainText('2. OBERGESCHOSS');
  await page.keyboard.down('KeyW');
  await expect(page.getByTestId('bottle-count')).toContainText('1 / 36', { timeout: 15000 });
  await page.keyboard.up('KeyW');
  await expect(page.getByTestId('empty-bottles')).toHaveText('1', { timeout: 10000 });
  await page.screenshot({ path: '.artifacts/screenshots/arlesheim-hippie-wg.png' });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Zurück zum Start', exact: true }).press('Enter');
  await expect(start).toBeEnabled({ timeout: 45000 });
  await start.press('Enter');
  await expect(page.getByTestId('interior-floor')).toContainText('2. OBERGESCHOSS');
  await expect(page.getByTestId('bottle-count')).toContainText('0 / 36');
  expect(errors).toEqual([]);
});
