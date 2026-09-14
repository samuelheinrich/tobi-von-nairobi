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
  await page.getByRole('button', { name: 'Oder direkt nochmal versuchen' }).press('Enter');
  await expect(page.getByRole('button', { name: 'FLUCHT STARTEN' })).toBeEnabled({
    timeout: 45000,
  });
  await page.getByRole('button', { name: 'FLUCHT STARTEN' }).press('Enter', { timeout: 45000 });
  await expect(page.getByTestId('chaos')).toHaveText('0 / 100');
  await expect(page.getByTestId('wanted')).toHaveAttribute('aria-label', 'Fahndungslevel 0');
  await expect(page.getByTestId('bottle-count')).toContainText('0 / 5');
  expect(errors).toEqual([]);
});

test('being caught leads into the drunk tank, where only the bunk ends the night', async ({
  page,
}) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  const start = page.getByRole('button', { name: 'Level 4: Bali Escape' });
  await expect(start).toBeEnabled({ timeout: 45000 });
  await start.press('Enter');
  await page.getByRole('button', { name: 'FLUCHT STARTEN' }).press('Enter', { timeout: 45000 });
  await page.keyboard.down('KeyW');
  await expect(page.getByTestId('bottle-count')).toContainText('5 / 5', { timeout: 60000 });
  await page.keyboard.up('KeyW');
  await expect(page.getByRole('dialog', { name: 'Erwischt' })).toBeVisible({ timeout: 60000 });

  await page.getByRole('button', { name: 'AB IN DIE ZELLE' }).press('Enter');
  const cell = page.getByRole('dialog', { name: 'Ausnüchterungszelle' });
  await expect(cell).toBeVisible({ timeout: 45000 });
  await cell.getByRole('button', { name: 'ZELLE BETRETEN' }).press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Ausnüchtern und die Nacht beenden' }),
  ).toBeVisible();
  // No bottles, no score, no way out but the bunk.
  await expect(page.getByTestId('score')).toHaveText('0');
  await page.keyboard.press('KeyR');
  await expect(page.getByTestId('npc-speech')).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: '.artifacts/screenshots/ausnuechterungszelle.png' });
  // The bunk fills the corner, so simply walking into it is enough; no exact spot to hit.
  await page.keyboard.down('KeyA');
  await page.keyboard.down('KeyS');
  await expect(page.getByText('HINLEGEN UND AUSNÜCHTERN', { exact: false })).toBeVisible({
    timeout: 20000,
  });
  await page.keyboard.press('KeyE');
  await page.keyboard.up('KeyA');
  await page.keyboard.up('KeyS');
  const result = page.getByRole('dialog', { name: 'Nacht beendet' });
  await expect(result).toBeVisible();
  await expect(result).toContainText('werden nicht gespeichert');
  await result.getByRole('button', { name: 'ZURÜCK AN DEN ANFANG' }).press('Enter');
  await expect(page.getByRole('button', { name: 'TUTORIAL STARTEN' })).toBeEnabled({
    timeout: 45000,
  });
  expect(errors).toEqual([]);
});
