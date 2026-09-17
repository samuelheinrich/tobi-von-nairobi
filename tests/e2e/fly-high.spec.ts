import { expect, test } from '@playwright/test';

test('Fly High starts seated and exposes the cockpit takeover objective', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('combobox', { name: 'Level wählen' }).selectOption('fly_high');
  const start = page.getByRole('button', { name: 'COCKPIT STÜRMEN' });
  await expect(start).toBeEnabled({ timeout: 60000 });
  await start.press('Enter');
  await expect(page.getByTestId('posture')).toContainText('TOBI SITZT');
  await expect(page.getByTestId('cabin-status')).toContainText('COCKPITTÜR');
  await expect(page.getByRole('region', { name: 'Fahndung' })).not.toBeVisible();
  await page.keyboard.press('KeyE');
  await expect(page.getByTestId('posture')).not.toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Finde den Servicewagen im Oberdeck' }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('the shared sitting action still works on an empty train seat', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('combobox', { name: 'Level wählen' }).selectOption('thailand_railway');
  const start = page.getByRole('button', { name: 'EINSTEIGEN' });
  await expect(start).toBeEnabled({ timeout: 60000 });
  await start.press('Enter');
  await expect(page.getByTestId('seat-interaction')).toContainText('FREIER SITZ');
  await page.keyboard.press('KeyE');
  await expect(page.getByTestId('posture')).toContainText('TOBI SITZT');
  await page.keyboard.press('KeyE');
  await expect(page.getByTestId('posture')).not.toBeVisible();
  await expect(page.getByTestId('railway-status')).toContainText('RUNNING');
});
