/* global window, document */
/** Explicit, local-only smoke check. Start pnpm dev:client first; no CI or webserver startup. */
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/test/animation.html');
  await page.waitForFunction(() => window.characterStudio?.character, {}, { timeout: 15000 });
  await mkdir('.artifacts/characters', { recursive: true });
  const models = ['tobi', 'drunk'];
  if (process.argv.includes('--with-sam')) models.push('sam');
  if (process.argv.includes('--with-civilians'))
    models.push('civilian-joe', 'civilian-josh', 'civilian-woman', 'glanzmann');
  for (const model of models) {
    await page.selectOption('#model', model);
    await page.waitForFunction(
      (id) => window.characterStudio?.character?.config.id === id,
      model === 'drunk' ? 'tobi-drunk' : model,
      { timeout: 15000 },
    );
    for (const action of [
      'idle',
      'walk',
      'run',
      'jump_loop',
      'sit_idle',
      'drink',
      'pickup',
      'throw_bottle',
      'celebrate',
      'taunt',
    ]) {
      const result = await page.evaluate((action) => {
        const studio = window.characterStudio,
          c = studio.character;
        studio.sample(action, 0.35);
        const prop = studio.bottle,
          hand = c.rig.joints.get('rightHand').node;
        hand.computeWorldMatrix(true);
        prop.computeWorldMatrix(true);
        const distance = prop.getAbsolutePosition().subtract(hand.getAbsolutePosition()).length();
        return {
          imported: c.clips.has(action),
          finite: [...c.rig.joints.values()].every((j) =>
            j.node.rotationQuaternion.asArray().every(Number.isFinite),
          ),
          distance,
          parent: prop.parent === hand,
        };
      }, action);
      assert.ok(result.finite, model + ' ' + action + ' finite joints');
      if (
        ['tobi', 'drunk'].includes(model) &&
        ['pickup', 'throw_bottle', 'celebrate', 'taunt'].includes(action)
      )
        assert.ok(result.imported, model + ' ' + action + ' imported FBX clip');
      if (model.startsWith('civilian-') && ['walk', 'sit_idle'].includes(action))
        assert.ok(result.imported, model + ' ' + action + ' imported shared clip');
      assert.ok(
        result.parent && result.distance < 0.14,
        model + ' ' + action + ' attached hand prop',
      );
    }
    await page.screenshot({ path: '.artifacts/characters/' + model + '.png' });
  }
  const marker = await page.evaluate(() => {
    const c = window.characterStudio.character,
      s = window.characterStudio.state;
    c.controller.preview(null);
    c.controller.play('throw_bottle');
    c.controller.playbackSpeed = 1;
    const releaseTime = c.config.throwReleaseTime;
    const at = c.controller.timing('throw_bottle').duration * releaseTime;
    const a = c.update(at - 0.005, s),
      pause = c.update(0, s),
      b = c.update(0.01, s),
      after = c.update(0.5, s);
    c.controller.playbackSpeed = 0;
    return { a, pause, b, after, releaseTime };
  });
  assert.equal(marker.a.length, 0);
  assert.equal(marker.pause.length, 0);
  assert.equal(marker.b.length, 1);
  assert.equal(marker.b[0].normalizedTime, marker.releaseTime);
  assert.equal(marker.after.length, 0);
  // Exercise the real game scene: seat, walk, collect/drink and release from the actual GLB hand.
  await page.goto('http://127.0.0.1:5173/');
  await page.getByRole('combobox', { name: 'Level wählen' }).selectOption('thailand_railway');
  await page.getByRole('button', { name: 'EINSTEIGEN', exact: true }).press('Enter');
  await page.evaluate(async () => {
    window.readCharacter = (await import('/test/character-probe.ts')).characterProbe;
  });
  await page.waitForFunction(
    () => window.readCharacter?.().handParent === 'RightHand',
    {},
    { timeout: 15000 },
  );
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(650);
  assert.match(await page.getByTestId('posture').textContent(), /TOBI SITZT/);
  await page.screenshot({ path: '.artifacts/characters/train-seated.png' });
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(550);
  await page.keyboard.down('KeyW');
  try {
    await page.waitForFunction(
      () => document.querySelector('[data-testid="bottle-count"]')?.textContent?.includes('1 / 12'),
      {},
      { timeout: 6000 },
    );
  } finally {
    await page.keyboard.up('KeyW');
  }
  await page.waitForFunction(
    () => document.querySelector('[data-testid="empty-bottles"]')?.textContent === '1',
    {},
    { timeout: 5000 },
  );
  assert.match(await page.getByTestId('bottle-count').textContent(), /1 \/ 12/);
  const held = await page.evaluate(async () => {
    const { characterProbe } = await import('/test/character-probe.ts');
    return characterProbe();
  });
  assert.ok(held.avatar && held.finite && held.attached, JSON.stringify(held));
  assert.equal(held.handParent, 'RightHand');
  await page.keyboard.press('KeyR');
  await page.waitForTimeout(700);
  await page.screenshot({ path: '.artifacts/characters/train-taunt.png' });
  await page.keyboard.press('KeyG');
  await page.waitForFunction(
    () => document.querySelector('[data-testid="empty-bottles"]')?.textContent === '0',
    {},
    { timeout: 3000 },
  );
  await page.waitForFunction(() => window.readCharacter?.().projectiles > 0, {}, { timeout: 4000 });
  assert.deepEqual(errors, []);
  console.log(
    'PASS: ' +
      models.join(', ') +
      ' poses, hand sockets, release/pause; train sitting, drinking, throw, taunt; no page errors.',
  );
} finally {
  await browser.close();
}
