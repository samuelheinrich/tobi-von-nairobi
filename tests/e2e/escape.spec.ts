import { expect, test } from '@playwright/test';

test('selects escape, dispatches police, catches Tobi and resets the next run', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Level 4: Bali Escape' })).toBeEnabled({
    timeout: 45000,
  });
  await page
    .getByRole('button', { name: 'Level 4: Bali Escape' })
    .press('Enter', { timeout: 45000 });
  await expect(page.getByRole('button', { name: 'FLUCHT STARTEN' })).toBeEnabled({
    timeout: 45000,
  });
  await page.getByRole('button', { name: 'FLUCHT STARTEN' }).press('Enter', { timeout: 45000 });
  await expect(page.getByRole('region', { name: 'Fahndung' })).toBeVisible();
  await page.keyboard.down('KeyW');
  await expect(page.getByTestId('bottle-count')).toContainText('5 / 5', { timeout: 60000 });
  await page.keyboard.up('KeyW');
  await expect(page.getByRole('heading', { name: 'Hänge die Polizei ab' })).toBeVisible();
  await expect(page.getByTestId('wanted')).toHaveAttribute('aria-label', 'Fahndungslevel 3');
  await page.screenshot({ path: '.artifacts/screenshots/bali-escape.png' });
  // Standing in full sight must eventually lose the run; the test never spawns or teleports a guard.
  await expect(page.getByRole('dialog', { name: 'Erwischt' })).toBeVisible({ timeout: 60000 });
  await page.getByRole('button', { name: 'NOCH EIN VERSUCH' }).press('Enter');
  await expect(page.getByRole('button', { name: 'FLUCHT STARTEN' })).toBeEnabled({
    timeout: 45000,
  });
  await page.getByRole('button', { name: 'FLUCHT STARTEN' }).press('Enter', { timeout: 45000 });
  await expect(page.getByTestId('chaos')).toHaveText('0 / 100');
  await expect(page.getByTestId('wanted')).toHaveAttribute('aria-label', 'Fahndungslevel 0');
  await expect(page.getByTestId('bottle-count')).toContainText('0 / 5');
  expect(errors).toEqual([]);
});
