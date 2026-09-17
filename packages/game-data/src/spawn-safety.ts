/** Keeps authored spawn points out of places nobody should stand.
 *
 * NPC positions are usually written as a formula around a centre — Phuket scatters 62 residents
 * with modular arithmetic — and nothing checks the result against the world. Thirty of those stood
 * on roadways that scooters and tuk-tuks drive, and three stood inside buildings.
 *
 * Rather than hand-tuning coordinates, which breaks again the next time a road moves, a spawn set
 * is pushed clear of the shapes it must avoid. The nudge is deterministic and always to the
 * nearest edge, so a crowd keeps its shape instead of collapsing into a line.
 */

export interface Rect2 {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}
export interface Spot2 {
  x: number;
  z: number;
}

export const rectFrom = (x: number, z: number, width: number, depth: number): Rect2 => ({
  minX: x - width / 2,
  maxX: x + width / 2,
  minZ: z - depth / 2,
  maxZ: z + depth / 2,
});

const inside = (r: Rect2, p: Spot2, margin: number) =>
  p.x > r.minX - margin && p.x < r.maxX + margin && p.z > r.minZ - margin && p.z < r.maxZ + margin;

/** Moves a point just outside the rectangle, by whichever side it is closest to. */
function pushOut(r: Rect2, p: Spot2, margin: number): Spot2 {
  const options = [
    { x: r.minX - margin, z: p.z, cost: Math.abs(p.x - (r.minX - margin)) },
    { x: r.maxX + margin, z: p.z, cost: Math.abs(p.x - (r.maxX + margin)) },
    { x: p.x, z: r.minZ - margin, cost: Math.abs(p.z - (r.minZ - margin)) },
    { x: p.x, z: r.maxZ + margin, cost: Math.abs(p.z - (r.maxZ + margin)) },
  ].sort((a, b) => a.cost - b.cost);
  const best = options[0]!;
  return { x: Number(best.x.toFixed(3)), z: Number(best.z.toFixed(3)) };
}

/** Pushes every spot clear of every rectangle. Repeats a few times because stepping out of one
 * shape can step into its neighbour; a spot that cannot be freed is returned unchanged rather
 * than thrown away, so a caller never silently loses an NPC. */
export function keepClear<T extends Spot2>(
  spots: readonly T[],
  areas: readonly Rect2[],
  margin = 0.8,
): T[] {
  return spots.map((spot) => {
    let current: Spot2 = { x: spot.x, z: spot.z };
    for (let pass = 0; pass < 4; pass++) {
      const hit = areas.find((area) => inside(area, current, margin));
      if (!hit) break;
      current = pushOut(hit, current, margin);
    }
    return { ...spot, x: current.x, z: current.z };
  });
}

/** A straight road as a rectangle, for use with `keepClear`. */
/** A carriageway as a rectangle, padded by `shoulder` on every side.
 *
 * The padding also runs past both ends. A vehicle route is a line with thickness, so standing just
 * beyond the last waypoint is no safer than standing beside it — and the level checks measure
 * distance to the whole segment, endpoints included. Cutting the rectangle off square at the ends
 * left people in exactly that gap.
 */
export const roadRect = (from: Spot2, to: Spot2, width: number, shoulder = 0): Rect2 => {
  const reach = width / 2 + shoulder;
  return {
    minX: Math.min(from.x, to.x) - reach,
    maxX: Math.max(from.x, to.x) + reach,
    minZ: Math.min(from.z, to.z) - reach,
    maxZ: Math.max(from.z, to.z) + reach,
  };
};
