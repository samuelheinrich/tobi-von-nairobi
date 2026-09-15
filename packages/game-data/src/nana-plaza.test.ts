import { describe, expect, it } from 'vitest';
import {
  nanaPlaza,
  nanaVenues,
  nanaResidents,
  danceNames,
  drunkTank,
  NANA_CROWD_DENSITY,
} from './index.js';

describe('Nana content invariants', () => {
  it('retains stable pickups and distributes them across the full journey', () => {
    expect(nanaPlaza.pickups).toHaveLength(16);
    const count = (predicate: (p: { x: number; y: number; z: number }) => boolean) =>
      nanaPlaza.pickups.filter((p) => predicate(p.position)).length;
    expect(count((p) => p.z < -44)).toBe(2);
    expect(count((p) => p.z >= -44 && p.z < 0)).toBe(4);
    expect(count((p) => p.z >= 0 && p.y === 0)).toBe(4);
    expect(count((p) => p.y === 4.8)).toBe(3);
    expect(count((p) => p.y === 9.6)).toBe(3);
    expect(new Set(nanaPlaza.pickups.map((p) => p.id)).size).toBe(16);
  });
  it('supplies all three levels, varied venues and adult resident roles', () => {
    expect(nanaVenues.filter((v) => v.floor === 0)).toHaveLength(10);
    expect(nanaVenues.filter((v) => v.floor === 1 && v.mode === 'full')).toHaveLength(5);
    expect(nanaVenues.filter((v) => v.floor === 2 && v.mode === 'full')).toHaveLength(4);
    expect(new Set(danceNames).size).toBe(8);
    // The street crowd scales with the density rather than sitting at a fixed count, but it must
    // still reach the far end of the Soi and keep every role represented — thinning by skipping
    // indices once wiped out the taxi drivers entirely, because roles cycle on the index.
    expect(nanaResidents.filter((p) => p.z < 0)).toHaveLength(Math.round(40 * NANA_CROWD_DENSITY));
    expect(Math.min(...nanaResidents.map((p) => p.z))).toBeLessThanOrEqual(-42);
    expect(new Set(nanaResidents.map((p) => p.role)).size).toBe(8);
  });
  it('keeps the custody level out of the selector and score economy', () => {
    expect(nanaPlaza.wantedThresholds).toEqual([61, 81]);
    expect(drunkTank.selectable).toBe(false);
    expect(drunkTank.scoring).toEqual({ bottlePoints: 0, completionBonus: 0 });
  });
});
