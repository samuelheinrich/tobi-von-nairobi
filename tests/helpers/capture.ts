import { leaveNanaStation, walkNana } from './nana-route.js';
import { expect, type Page } from '@playwright/test';
/** A real public level and normal input; no debug spawning or teleporting. */
export async function getCaughtAtNana(page: Page) {
  await page.goto('/');
  await page.getByRole('combobox', { name: 'Level wählen' }).selectOption('bangkok_nana_plaza');
  await page.getByRole('button', { name: 'FLUCHT STARTEN' }).press('Enter', { timeout: 60000 });
  await leaveNanaStation(page);
  await walkNana(page, 0, -29);
  const wanted = page.getByTestId('wanted');
  await expect(async () => {
    await page.keyboard.press('KeyR');
    await expect(wanted).toHaveAttribute('aria-label', /Fahndungslevel [12]/, { timeout: 250 });
  }).toPass({ timeout: 45000, intervals: [4200] });
  await expect(page.getByRole('dialog', { name: 'Erwischt' })).toBeVisible({ timeout: 60000 });
}
