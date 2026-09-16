import { expect, it } from 'vitest';
import { baliAdventureLayout, baliGroundAt } from './bali-adventure.js';
import { allLevels, baliAdventure, playableLevels, welcomeToBali } from './index.js';
it('retains old saved-level identities while presenting one merged Bali adventure and one Tutorial', () => {
  expect(playableLevels.filter((l) => l.worldId === 'bali').map((l) => l.id)).toEqual([
    welcomeToBali.id,
    baliAdventure.id,
  ]);
  expect(welcomeToBali.title).toBe('Tutorial');
  for (const id of ['bali_beach_bar', 'bali_night_market', 'bali_mvp_escape'])
    expect(allLevels.find((l) => l.id === id)?.selectable).toBe(false);
});
it('keeps exploration pickups on mainland/island and makes buildings explicit', () => {
  expect(baliGroundAt(-160, 70)).toBe(false);
  expect(baliGroundAt(-235, 70)).toBe(true);
  expect(baliAdventure.maxWanted).toBe(0);
  expect(baliAdventure.objectives.some((o) => o.type === 'escapePolice')).toBe(false);
  expect(baliAdventure.pickups.length).toBeGreaterThanOrEqual(36);
  for (const p of baliAdventure.pickups)
    expect(baliGroundAt(p.position.x, p.position.z), p.id).toBe(true);
  expect(baliAdventure.pickups.some((p) => p.requiredVehicle === 'scooter')).toBe(true);
  expect(baliAdventure.pickups.filter((p) => p.position.x < -180).length).toBeGreaterThanOrEqual(5);
  expect(
    baliAdventureLayout.buildings.filter((b) => b.enterable === 'fully_enterable').length,
  ).toBeGreaterThanOrEqual(4);
  expect(baliAdventureLayout.buildings.filter((b) => b.roofWalkable).length).toBeGreaterThanOrEqual(
    3,
  );
});
