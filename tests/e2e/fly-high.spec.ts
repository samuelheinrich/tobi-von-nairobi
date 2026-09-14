import { expect, test } from '@playwright/test';

test('Fly High starts seated without police, stands up and sends a disruptive Tobi back to his seat', async ({
  page,
}) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('combobox', { name: 'Level wählen' }).selectOption('fly_high');
  const start = page.getByRole('button', { name: 'ABHEBEN' });
  await expect(start).toBeEnabled({ timeout: 60000 });
  await start.press('Enter');
  await expect(page.getByTestId('posture')).toContainText('TOBI SITZT');
  await expect(page.getByRole('region', { name: 'Fahndung' })).not.toBeVisible();
  await page.screenshot({ path: '.artifacts/screenshots/fly-high-seated.png' });
  await page.keyboard.press('KeyE');
  await expect(page.getByTestId('posture')).not.toBeVisible();
  await expect(page.getByTestId('seat-interaction')).toContainText('TOBIS PLATZ');
  await page.keyboard.press('KeyE');
  await expect(page.getByTestId('posture')).toContainText('TOBI SITZT');
  // Deliberately remain hidden: the social reset must override the safe-seat immunity.
  for (let strike = 1; strike <= 3; strike++) {
    await expect(async () => {
      await page.keyboard.press('KeyR');
      await expect(page.getByTestId('cabin-status')).toContainText(
        strike === 3 ? 'ZURÜCKGESCHICKT 1' : `BESCHWERDEN ${strike}/3`,
      );
    }).toPass({ timeout: 25000, intervals: [1000] });
  }
  await expect(page.getByTestId('posture')).toContainText('TOBI SITZT');
  await expect(page.getByTestId('cabin-status')).toContainText('BESCHWERDEN 0/3');
  // A second reset comes from actual crew perception, not a police or debug command.
  await page.keyboard.press('KeyE');
  await page.keyboard.down('KeyW');
  await expect(page.getByTestId('cabin-status')).toContainText('ZURÜCKGESCHICKT 2', {
    timeout: 45000,
  });
  await page.keyboard.up('KeyW');
  await expect(page.getByTestId('posture')).toContainText('TOBI SITZT');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Zurück zum Start', exact: true }).press('Enter');
  await page.getByRole('combobox', { name: 'Level wählen' }).selectOption('thailand_railway');
  await expect(page.getByRole('button', { name: 'EINSTEIGEN' })).toBeEnabled({ timeout: 60000 });
  expect(errors).toEqual([]);
});

test('the same sitting action works on an empty train seat and releases Tobi back into the aisle', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('combobox', { name: 'Level wählen' }).selectOption('thailand_railway');
  const start = page.getByRole('button', { name: 'EINSTEIGEN' });
  await expect(start).toBeEnabled({ timeout: 60000 });
  await start.press('Enter');
  await expect(page.getByTestId('seat-interaction')).toContainText('FREIER SITZ');
  await page.keyboard.press('KeyE');
  await expect(page.getByTestId('posture')).toContainText('TOBI SITZT');
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(500);
  await page.keyboard.up('KeyW');
  await expect(page.getByTestId('posture')).toContainText('TOBI SITZT');
  await page.screenshot({ path: '.artifacts/screenshots/train-seated.png' });
  await page.keyboard.press('KeyE');
  await expect(page.getByTestId('posture')).not.toBeVisible();
  await page.keyboard.down('KeyW');
  await expect(page.getByTestId('bottle-count')).toContainText('1 / 12', { timeout: 15000 });
  await page.keyboard.up('KeyW');
});
