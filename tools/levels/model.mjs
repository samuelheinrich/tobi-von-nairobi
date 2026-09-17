/** A common spatial model for levels that are otherwise authored in very different shapes.
 *
 * Each level describes its world its own way — Zurich as rectangles in `game-data`, Phuket as a
 * loop in the scene builder, the aircraft as a cabin. Nothing could be checked across all of them
 * because nothing described them in the same terms. An adapter projects each level into the model
 * below; every check then works on the model alone and applies to every level, including the ones
 * written after it.
 *
 * The model is deliberately 2D plus a height. Almost every defect found so far — items in walls,
 * NPCs on roadways, routes through houses, spawns in the void — is a plan-view problem.
 */

/** @typedef {{ minX: number, maxX: number, minZ: number, maxZ: number }} Rect */
/** @typedef {{ x: number, z: number }} Point */
/** @typedef {{ id: string, x: number, y?: number, z: number }} Item */

/**
 * @typedef {object} LevelModel
 * @property {string} id
 * @property {string} title
 * @property {Rect|null} bounds          Playable area; null means the level declares none.
 * @property {Rect|null} ground          Physical extent of the floor, when known.
 * @property {{ rect: Rect, id: string, enterable?: boolean }[]} solids
 * @property {{ rect: Rect, id: string }[]} water
 * @property {{ rect: Rect, id: string }[]} bridges   Water that may be crossed.
 * @property {{ id: string, path: Point[], width: number }[]} routes  Vehicle and train paths.
 * @property {Item[]} bottles
 * @property {Item[]} powerups
 * @property {Item[]} npcs
 * @property {Item|null} spawn
 * @property {Item|null} destination
 * @property {Item[]} policeSpawns
 * @property {string[]} notes            What the adapter could not model, stated openly.
 */

export const rect = (x, z, width, depth) => ({
  minX: x - width / 2,
  maxX: x + width / 2,
  minZ: z - depth / 2,
  maxZ: z + depth / 2,
});

export const covers = (r, p, margin = 0) =>
  p.x >= r.minX - margin &&
  p.x <= r.maxX + margin &&
  p.z >= r.minZ - margin &&
  p.z <= r.maxZ + margin;

/** Shortest distance from a point to a polyline, in metres. */
export function distanceToPath(path, p) {
  let best = Infinity;
  for (let i = 0; i + 1 < path.length; i++) {
    const a = path[i];
    const b = path[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len2 = dx * dx + dz * dz || 1e-9;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / len2));
    best = Math.min(best, Math.hypot(p.x - (a.x + t * dx), p.z - (a.z + t * dz)));
  }
  return best;
}

/** Samples a route every `step` metres, so a check can ask what it passes through. */
export function samplePath(path, step = 1) {
  const out = [];
  for (let i = 0; i + 1 < path.length; i++) {
    const a = path[i];
    const b = path[i + 1];
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    for (let d = 0; d < length; d += step) {
      const t = d / length;
      out.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
    }
  }
  if (path.length) out.push(path[path.length - 1]);
  return out;
}
