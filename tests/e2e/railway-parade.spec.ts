import { expect, test } from '@playwright/test';

test('Thailand Railway: drink, hold, throw and reach the first carriage', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  const select = page.getByRole('combobox', { name: 'Level wählen' });
  await expect(select).toBeEnabled({ timeout: 45000 });
  await select.selectOption('thailand_railway');
  await expect(page.getByRole('button', { name: 'EINSTEIGEN' })).toBeEnabled({ timeout: 45000 });
  await page.getByRole('button', { name: 'EINSTEIGEN' }).press('Enter');
  await expect(page.getByRole('heading', { name: 'Sammle 8 Flaschen' })).toBeVisible();
  await page.keyboard.down('KeyW');
  await expect(page.getByTestId('bottle-count')).toContainText('1 / 8', { timeout: 20000 });
  await page.keyboard.up('KeyW');
  await expect(page.getByTestId('bottle-hand')).toHaveText('FLASCHE IN DER HAND', {
    timeout: 15000,
  });
  await expect(page.getByTestId('empty-bottles')).toHaveText('1');
  await page.screenshot({ path: '.artifacts/screenshots/thailand-railway.png' });
  await page.keyboard.press('KeyG');
  await expect(page.getByTestId('empty-bottles')).toHaveText('0');
  await page.keyboard.down('KeyW');
  await expect(page.getByTestId('bottle-count')).toContainText('8 / 8', { timeout: 90000 });
  await expect(page.getByText('WAGEN 1 ERREICHT', { exact: false })).toBeVisible({
    timeout: 20000,
  });
  await page.keyboard.up('KeyW');
  await page.keyboard.press('KeyE');
  await expect(page.getByRole('dialog', { name: 'Zugfahrt abgeschlossen' })).toBeVisible();
  await expect(page.getByRole('dialog').getByText(/^1['’]300$/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('Street Parade: 240 people react and a tablet changes only the game colors', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  const select = page.getByRole('combobox', { name: 'Level wählen' });
  await expect(select).toBeEnabled({ timeout: 45000 });
  await select.selectOption('zurich_street_parade');
  await expect(page.getByRole('button', { name: 'FLUCHT STARTEN' })).toBeEnabled({
    timeout: 45000,
  });
  await page.getByRole('button', { name: 'FLUCHT STARTEN' }).press('Enter');
  await expect(page.getByTestId('crowd-count')).toContainText('0 / 240');
  await page.keyboard.press('KeyR');
  await expect(page.getByTestId('crowd-count')).not.toContainText('· 0 /');
  await page.keyboard.down('KeyW');
  await expect(page.getByTestId('bottle-count')).toContainText('2 / 20', { timeout: 20000 });
  await page.keyboard.up('KeyW');
  await page.keyboard.down('KeyD');
  await expect(page.getByTestId('color-trip')).toBeVisible({ timeout: 12000 });
  await page.keyboard.up('KeyD');
  await expect(page.getByTestId('game-canvas')).not.toHaveCSS('filter', 'none');
  await page.screenshot({ path: '.artifacts/screenshots/zurich-street-parade.png' });
  await page.keyboard.press('Escape');
  const pause = page.getByRole('dialog', { name: 'Pause und Steuerung' });
  await pause.getByRole('button', { name: 'Farbeffekte reduzieren' }).click();
  await expect(pause.getByRole('button', { name: 'Farbeffekte reduzieren' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await pause.getByRole('button', { name: 'WEITER GEHT’S' }).press('Enter');
  await expect(pause).not.toBeVisible();
  await expect(page.getByTestId('game-canvas')).toHaveCSS('filter', 'none');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Zurück zum Start', exact: true }).press('Enter');
  await expect(page.getByRole('button', { name: 'FLUCHT STARTEN' })).toBeEnabled({
    timeout: 45000,
  });
  await expect(page.getByTestId('game-canvas')).toHaveCSS('filter', 'none');
  expect(errors).toEqual([]);
});
