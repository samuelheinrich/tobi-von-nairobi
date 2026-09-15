import { expect, test } from '@playwright/test';
import { leaveNanaStation, walkNana } from '../helpers/nana-route.js';

test('Nana Plaza: bottles refill energy, venues serve drinks and dancers answer compliments', async ({
  page,
}) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const levels = page.getByRole('combobox', { name: 'Level wählen' });
  await expect(levels).toBeEnabled({ timeout: 45000 });
  await levels.selectOption('bangkok_nana_plaza');
  await page.getByRole('button', { name: 'FLUCHT STARTEN' }).press('Enter', { timeout: 45000 });
  await expect(page.getByRole('heading', { name: 'Sammle 16 Flaschen' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Fahndung' })).toBeVisible();
  await page.keyboard.down('ShiftLeft');
  await leaveNanaStation(page);
  await page.keyboard.up('ShiftLeft');
  await expect(page.getByTestId('bottle-count')).toContainText('2 / 16');
  await expect(page.getByTestId('tobi-mood')).toContainText('ANGESCHICKERT');
  for (const [x, z] of [
    [0, 10],
    [19, 10],
    [19, 12],
    [28, 12],
  ] as const)
    await walkNana(page, x, z);
  await page.keyboard.press('KeyF');
  await expect(page.getByTestId('flirt-count')).toContainText('1');
  await expect(page.getByTestId('npc-speech')).toBeVisible();
  await page.keyboard.press('KeyE');
  await expect(page.getByTestId('seat-interaction')).toContainText('BEER 150 THB');
  await page.keyboard.press('KeyE');
  await expect(page.getByTestId('seat-interaction')).toContainText('1050 THB');
  await page.keyboard.press('KeyR');
  await expect(page.getByTestId('chaos')).not.toHaveText('0 / 100');
  await page.screenshot({ path: '.artifacts/screenshots/bangkok-nana-plaza.png' });
  expect(errors).toEqual([]);
});
