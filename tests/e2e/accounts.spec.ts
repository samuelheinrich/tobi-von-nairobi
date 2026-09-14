import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { createDatabase } from '../../packages/database/dist/index.js';

if (existsSync('apps/game-server/.env')) process.loadEnvFile('apps/game-server/.env');

test('registers, finishes a real level, survives a lost save response and restores progress on reload', async ({
  page,
}) => {
  const username = `browser-${randomUUID().slice(0, 12)}`;
  const password = 'Das ist nur ein Browser-Testpasswort!';
  const db = createDatabase(process.env.DATABASE_URL!);
  try {
    await page.goto('/');
    await page.getByRole('button', { name: 'ANMELDEN', exact: true }).click();
    await page.getByRole('button', { name: 'NEUES KONTO ERSTELLEN' }).click();
    await page.getByLabel('Benutzername', { exact: true }).fill(username);
    await page.getByLabel('Passwort', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'KONTO ERSTELLEN', exact: true }).click();
    await expect(page.getByRole('button', { name: `KONTO · ${username}` })).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Konto und Fortschritt' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'TUTORIAL STARTEN' })).toBeEnabled({
      timeout: 45000,
    });
    await page.getByRole('button', { name: 'TUTORIAL STARTEN' }).press('Enter');
    await expect(page.getByRole('heading', { name: 'Sammle 5 Flaschen' })).toBeVisible();
    await page.keyboard.down('KeyW');
    await expect(page.getByTestId('bottle-count')).toContainText('5 / 5', { timeout: 60000 });
    await expect(page.getByText('EINCHECKEN', { exact: false })).toBeVisible({ timeout: 20000 });
    await page.keyboard.up('KeyW');
    let sent = false;
    await page.route('**/api/v1/runs/*/complete', async (route) => {
      if (!sent) {
        sent = true;
        const response = await route.fetch();
        expect(response.status()).toBe(200);
      }
      await route.abort('failed');
    });
    await page.keyboard.press('KeyE');
    await expect(page.getByRole('dialog', { name: 'Tutorial abgeschlossen' })).toBeVisible();
    await expect.poll(() => sent).toBe(true);
    await expect(page.getByTestId('save-status')).toContainText('lokal gesichert');
    // The database committed, but the client never received the receipt. Reload must replay once.
    await page.reload();
    await page.unroute('**/api/v1/runs/*/complete');
    await page.getByRole('button', { name: `KONTO · ${username}` }).click();
    await expect(page.getByTestId('saved-total')).toHaveText(/^1['’]000$/);
    await expect(page.getByText('1× geschafft', { exact: false })).toBeVisible();
    await expect(
      page.getByRole('dialog').getByText('Fortschritt gespeichert.', { exact: true }),
    ).toBeVisible({ timeout: 15000 });
    const saved = await db.user.findUniqueOrThrow({
      where: { usernameNormalized: username },
      include: { saves: { include: { levels: true } } },
    });
    expect(saved.saves[0]?.score).toBe(1000);
    expect(saved.saves[0]?.levels[0]?.completions).toBe(1);
    await page.screenshot({ path: '.artifacts/screenshots/account-progress.png', fullPage: true });
    await page.getByRole('button', { name: 'ABMELDEN', exact: true }).click();
    await page.reload();
    await expect(page.getByRole('button', { name: 'ANMELDEN', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'ANMELDEN', exact: true }).click();
    await page.getByLabel('Benutzername', { exact: true }).fill(username);
    await page.getByLabel('Passwort', { exact: true }).fill(password);
    await page.getByRole('dialog').getByRole('button', { name: 'ANMELDEN', exact: true }).click();
    await page.getByRole('button', { name: `KONTO · ${username}` }).click();
    await expect(page.getByTestId('saved-total')).toHaveText(/^1['’]000$/);
  } finally {
    await db.user.deleteMany({ where: { usernameNormalized: username } });
    await db.$disconnect();
  }
});
