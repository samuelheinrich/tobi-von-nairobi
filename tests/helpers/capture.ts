import { expect, type Page } from '@playwright/test';
/** A real public level and normal input; no debug spawning or teleporting. */
export async function getCaughtAtNana(page: Page) {
  await page.goto('/');
  await page.getByRole('combobox', { name: 'Level wählen' }).selectOption('bangkok_nana_plaza');
  await page.getByRole('button', { name: 'FLUCHT STARTEN' }).press('Enter', { timeout: 60000 });
  // Leave the entrance alley: its side walls correctly hide the stationary spawn from guards.
  await page.keyboard.down('KeyW');
  await expect(page.getByTestId('bottle-count')).toContainText('1 / 16', { timeout: 25000 });
  await page.keyboard.up('KeyW');
  const wanted = page.getByTestId('wanted');
  await expect(async () => {
    await page.keyboard.press('KeyR');
    await expect(wanted).toHaveAttribute('aria-label', 'Fahndungslevel 2', { timeout: 700 });
  }).toPass({ timeout: 70000, intervals: [1000] });
  await expect(page.getByRole('dialog', { name: 'Erwischt' })).toBeVisible({ timeout: 60000 });
}
