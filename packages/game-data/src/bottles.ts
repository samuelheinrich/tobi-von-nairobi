import type { Position3 } from '@tobi/contracts';

/** Where a bottle plausibly sits, and how much a level wants of it.
 *
 * Bottles are Tobi's energy, so a level that has too few is not merely sparse — it is unplayable
 * past a point. They are also scenery: a bottle belongs on a bar, a table or a galley worktop, not
 * scattered on a floor at regular intervals. These categories carry both meanings at once.
 */
export type BottleSpotKind =
  'bar' | 'dj' | 'table' | 'dining' | 'galley' | 'seating' | 'market' | 'travel' | 'hidden';

/** How strongly a kind attracts bottles when a level is filled to its minimum.
 * High where people drink and set glasses down, low where a player has to go looking. */
export const bottleWeight: Record<BottleSpotKind, number> = {
  bar: 5,
  dj: 4,
  dining: 4,
  galley: 4,
  table: 3,
  seating: 2,
  market: 2,
  travel: 2,
  hidden: 1,
};

export interface BottleSpot {
  kind: BottleSpotKind;
  position: Position3;
  /** Never place more than this many here; a bar is not a bottle bank. */
  maxCount?: number;
}

export interface BottlePlan {
  /** Below this the level cannot keep Tobi supplied. */
  minimum: number;
  idPrefix: string;
}

/** Turns spots into pickups, weighted by kind and deterministic for a given input.
 *
 * Fills the highest-weighted spots first and only comes back for a second bottle at a spot once
 * every spot has one, so a level reads as placed rather than piled.
 */
export function distributeBottles(
  spots: readonly BottleSpot[],
  plan: BottlePlan,
): { id: string; itemId: 'bottle'; position: Position3 }[] {
  if (!spots.length) return [];
  // Within a kind the spots are interleaved from both ends rather than taken in order. Sorting by
  // position alone fills the minimum from one end of the level and leaves the far half empty —
  // the train ended up with every bottle in its front carriages.
  const byKind = new Map<BottleSpotKind, BottleSpot[]>();
  for (const spot of spots) {
    const list = byKind.get(spot.kind) ?? [];
    list.push(spot);
    byKind.set(spot.kind, list);
  }
  const ranked: BottleSpot[] = [];
  for (const kind of [...byKind.keys()].sort((a, b) => bottleWeight[b] - bottleWeight[a])) {
    const sorted = byKind
      .get(kind)!
      .sort((a, b) => a.position.z - b.position.z || a.position.x - b.position.x);
    for (let i = 0; i < sorted.length; i++) {
      // 0, last, 1, last-1, … so the first bottles taken span the whole level.
      const index = i % 2 ? sorted.length - 1 - Math.floor(i / 2) : Math.floor(i / 2);
      ranked.push(sorted[index]!);
    }
  }
  const taken = new Map<BottleSpot, number>();
  const out: { id: string; itemId: 'bottle'; position: Position3 }[] = [];
  let pass = 0;
  while (out.length < plan.minimum && pass < 8) {
    let placedThisPass = 0;
    for (const spot of ranked) {
      if (out.length >= plan.minimum) break;
      const used = taken.get(spot) ?? 0;
      if (used >= (spot.maxCount ?? 2)) continue;
      // A bar earns a second bottle before a hidden corner earns its first.
      if (used > pass) continue;
      taken.set(spot, used + 1);
      placedThisPass++;
      // Stack extras slightly apart so two bottles never occupy one point.
      const offset = used * 0.35;
      out.push({
        id: `${plan.idPrefix}_${String(out.length + 1).padStart(2, '0')}`,
        itemId: 'bottle',
        position: {
          x: Number((spot.position.x + offset).toFixed(3)),
          y: spot.position.y,
          z: Number((spot.position.z - offset).toFixed(3)),
        },
      });
    }
    if (!placedThisPass) break;
    pass++;
  }
  return out;
}
