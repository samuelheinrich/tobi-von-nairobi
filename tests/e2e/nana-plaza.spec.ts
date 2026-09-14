import { expect, test } from '@playwright/test';

test('Nana Plaza: bottles refill the energy and the dancers answer a compliment', async ({
  page,
}) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const levels = page.getByRole('combobox', { name: 'Level wählen' });
  await expect(levels).toBeEnabled({ timeout: 45000 });
  await levels.selectOption('bangkok_nana_plaza');
  const start = page.getByRole('button', { name: 'FLUCHT STARTEN' });
  await expect(start).toBeEnabled({ timeout: 45000 });
  await start.press('Enter');
  await expect(page.getByRole('heading', { name: 'Sammle 16 Flaschen' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Fahndung' })).toBeVisible();

  // Sprint the energy down, then walk into the courtyard: every bottle fills it back up.
  await page.keyboard.down('ShiftLeft');
  await page.keyboard.down('KeyW');
  await expect(page.getByTestId('bottle-count')).toContainText('2 / 16', { timeout: 40000 });
  await page.keyboard.up('ShiftLeft');
  await page.keyboard.up('KeyW');
  await expect(page.getByTestId('tobi-mood')).toContainText('ANGESCHICKERT', { timeout: 15000 });

  // F is the new compliment; somebody at the poles or behind the bar answers in kind.
  // The bottles have a pickup radius: stopping at bottle two does not guarantee flirt range.
  // Approach the right-hand bar and ask until an actual visible NPC answers.
  await page.keyboard.down('KeyD');
  try {
    await expect(async () => {
      await page.keyboard.press('KeyF');
      await expect(page.getByTestId('npc-speech')).toBeVisible({ timeout: 500 });
    }).toPass({ timeout: 20000, intervals: [300] });
  } finally {
    await page.keyboard.up('KeyD');
  }
  await expect(page.getByTestId('flirt-count')).toContainText('Komplimente');
  await page.screenshot({ path: '.artifacts/screenshots/bangkok-nana-plaza.png' });

  // Shouting still works and still raises the chaos the pursuit reads.
  await page.keyboard.press('KeyR');
  await expect(page.getByTestId('chaos')).not.toHaveText('0 / 100');
  expect(errors).toEqual([]);
});
