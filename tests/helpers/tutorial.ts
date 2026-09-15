import { expect, type Page } from '@playwright/test';

/** Drive normal keyboard/mouse input using the same visible directions as a player. */
export async function followLessonTarget(page: Page, lessonId: string, stopAt = 0.65) {
  // Keep feedback and key transitions in the browser. Per-key protocol round trips with
  // tracing can take several rendered frames and make a fast character circle the target.
  await page.evaluate(
    async ({ lessonId, stopAt }) => {
      const held = new Set<string>();
      const input = (type: 'keydown' | 'keyup', code: string) =>
        window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
      try {
        for (let i = 0; i < 2250; i++) {
          const coach = document.querySelector('[data-testid="tutorial-coach"]');
          const nav = document.querySelector('[data-testid="tutorial-navigation"]');
          if (coach?.getAttribute('data-lesson') !== lessonId) return;
          const distance = Number(nav?.getAttribute('data-distance') ?? Infinity);
          if (distance < stopAt) return;
          const bearing = nav?.getAttribute('data-bearing') ?? '';
          const next = new Set<string>();
          if (bearing.includes('N')) next.add('KeyW');
          if (bearing.includes('S')) next.add('KeyS');
          if (bearing.includes('E')) next.add('KeyD');
          if (bearing.includes('W')) next.add('KeyA');
          for (const key of held)
            if (!next.has(key)) {
              input('keyup', key);
              held.delete(key);
            }
          for (const key of next)
            if (!held.has(key)) {
              input('keydown', key);
              held.add(key);
            }
          await new Promise((resolve) => setTimeout(resolve, 40));
        }
        throw Error(`Tutorial target ${lessonId} not reached`);
      } finally {
        for (const key of held) input('keyup', key);
      }
    },
    { lessonId, stopAt },
  );
}

/** Complete all lessons and walk to the destination, leaving the final E to the caller. */
export async function finishTutorialLessons(page: Page) {
  const coach = page.getByTestId('tutorial-coach');
  await expect(coach).toHaveAttribute('data-lesson', 'walk');
  await page.keyboard.down('KeyW');
  await expect(coach).toHaveAttribute('data-lesson', 'camera', { timeout: 15000 });
  await page.keyboard.up('KeyW');
  // The browser's mouse event exercises the actual input adapter; no gameplay/debug state is set.
  await page.getByTestId('game-canvas').dispatchEvent('pointerdown');
  await page.evaluate(() => {
    const event = new MouseEvent('mousemove');
    Object.defineProperty(event, 'movementX', { value: 240 });
    window.dispatchEvent(event);
  });
  await expect(coach).toHaveAttribute('data-lesson', 'jump');
  await page.evaluate(() => {
    const event = new MouseEvent('mousemove');
    Object.defineProperty(event, 'movementX', { value: -240 });
    window.dispatchEvent(event);
  });
  await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointerup')));
  await page.keyboard.press('Space');
  await expect(coach).toHaveAttribute('data-lesson', 'sprint');
  await page.keyboard.down('ShiftLeft');
  await page.keyboard.down('KeyW');
  await expect(coach).toHaveAttribute('data-lesson', 'collect', { timeout: 15000 });
  await page.keyboard.up('ShiftLeft');
  await page.keyboard.up('KeyW');
  await followLessonTarget(page, 'collect', 0);
  await expect(coach).toHaveAttribute('data-lesson', 'throw', { timeout: 15000 });
  await expect(page.getByTestId('bottle-hand')).toHaveText('FLASCHE IN DER HAND', {
    timeout: 15000,
  });
  await page.keyboard.press('KeyG');
  await expect(coach).toHaveAttribute('data-lesson', 'taunt');
  await followLessonTarget(page, 'taunt', 1);
  await page.keyboard.press('KeyR');
  await expect(coach).toHaveAttribute('data-lesson', 'cover');
  await followLessonTarget(page, 'cover', 0);
  await expect(coach).toHaveAttribute('data-lesson', 'sit', { timeout: 15000 });
  await followLessonTarget(page, 'sit');
  await page.keyboard.press('KeyE');
  await expect(coach).toHaveAttribute('data-lesson', 'stand', { timeout: 15000 });
  await page.keyboard.press('KeyE');
  await expect(coach).toHaveAttribute('data-lesson', 'celebrate');
  await page.keyboard.press('KeyC');
  await expect(coach).not.toBeVisible();
  await page.keyboard.down('KeyW');
  await expect(page.getByText('EINCHECKEN', { exact: false })).toBeVisible({ timeout: 15000 });
  await page.keyboard.up('KeyW');
}
