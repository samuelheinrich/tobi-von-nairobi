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
it('places every pickup and guard on real nonrectangular ground outside solid buildings', () => {
  expect(baliGroundAt(-30, 70)).toBe(false);
  expect(baliGroundAt(40, -35)).toBe(false);
  for (const p of [
    ...baliAdventure.pickups.map((p) => p.position),
    ...baliAdventure.policeSpawns!,
    baliAdventure.spawn,
    baliAdventure.destination.position,
  ]) {
    expect(baliGroundAt(p.x, p.z), JSON.stringify(p)).toBe(true);
    expect(
      baliAdventureLayout.buildings.some(
        (h) => Math.abs(p.x - h.x) < h.w / 2 + 0.5 && Math.abs(p.z - h.z) < h.d / 2 + 0.5,
      ),
      JSON.stringify(p),
    ).toBe(false);
  }
});
