/** Checks that need the real bodies of a level, captured by `capture-geometry.mjs`.
 *
 * The collider flag cannot tell floor from wall: `prop(solid)` marks everything walkable, so a
 * façade and a pavement carry the same flag. Shape can tell them apart, and that is what these
 * checks use — a surface is wide and flat, a barrier is tall.
 */

/** A body flat enough to stand on and wide enough to matter. */
const SURFACE_MAX_THICKNESS = 1.2;
const SURFACE_MIN_SPAN = 1.5;
/** A body tall enough to stop Tobi walking off an edge. */
const BARRIER_MIN_HEIGHT = 0.8;
/** Falls shorter than this hurt nothing. */
const SAFE_DROP = 1.6;
/** How far from an edge a railing still counts as protecting it. */
const RAILING_REACH = 0.9;

const span = (b, axis) => b.max[axis] - b.min[axis];
const isSurface = (b) =>
  span(b, 1) <= SURFACE_MAX_THICKNESS &&
  span(b, 0) >= SURFACE_MIN_SPAN &&
  span(b, 2) >= SURFACE_MIN_SPAN;
const isBarrier = (b) => span(b, 1) >= BARRIER_MIN_HEIGHT;

const finding = (severity, code, message, detail) => ({ severity, code, message, detail });

/** Highest surface under a point, or null where the player would fall through. */
function surfaceUnder(surfaces, x, z) {
  let best = null;
  for (const s of surfaces) {
    if (x < s.min[0] || x > s.max[0] || z < s.min[2] || z > s.max[2]) continue;
    if (!best || s.max[1] > best.max[1]) best = s;
  }
  return best;
}

export function geometryChecks(model, snapshot) {
  if (!snapshot?.bodies?.length) return [];
  const bodies = snapshot.bodies;
  const surfaces = bodies.filter(isSurface);
  const barriers = bodies.filter(isBarrier);
  const out = [];

  // 1. Can the player walk off the world? Sample the declared playable area on a grid.
  if (model.bounds) {
    const b = model.bounds;
    const step = 4;
    let holes = 0;
    let total = 0;
    let firstHole = null;
    for (let x = b.minX; x <= b.maxX; x += step)
      for (let z = b.minZ; z <= b.maxZ; z += step) {
        total++;
        if (!surfaceUnder(surfaces, x, z)) {
          holes++;
          firstHole ??= { x, z };
        }
      }
    const share = total ? holes / total : 0;
    if (share > 0.02)
      out.push(
        finding(
          share > 0.25 ? 'CRITICAL' : 'HIGH',
          'VOID_IN_PLAYABLE_AREA',
          `${(share * 100).toFixed(0)} % der Spielfläche hat keinen Boden darunter (${holes} von ${total} Stichproben).`,
          { firstHole },
        ),
      );
  }

  // 2. Raised surfaces without anything to stop a fall from their edge.
  const unrailed = [];
  for (const surface of surfaces) {
    const top = surface.max[1];
    if (span(surface, 0) < 2 || span(surface, 2) < 2) continue;
    // Sample the perimeter; a point just outside the edge with a long drop needs a barrier.
    const edges = [];
    for (let x = surface.min[0]; x <= surface.max[0]; x += 2) {
      edges.push({ x, z: surface.min[2] - 0.5 }, { x, z: surface.max[2] + 0.5 });
    }
    for (let z = surface.min[2]; z <= surface.max[2]; z += 2) {
      edges.push({ x: surface.min[0] - 0.5, z }, { x: surface.max[0] + 0.5, z });
    }
    let exposed = 0;
    for (const point of edges) {
      const below = surfaceUnder(surfaces, point.x, point.z);
      const drop = top - (below ? below.max[1] : -Infinity);
      if (drop < SAFE_DROP) continue;
      const guarded = barriers.some(
        (bar) =>
          bar !== surface &&
          bar.max[1] > top + 0.5 &&
          point.x >= bar.min[0] - RAILING_REACH &&
          point.x <= bar.max[0] + RAILING_REACH &&
          point.z >= bar.min[2] - RAILING_REACH &&
          point.z <= bar.max[2] + RAILING_REACH,
      );
      if (!guarded) exposed++;
    }
    // A couple of open sample points is a doorway or a ramp; a whole open side is a missing rail.
    if (exposed >= 4) unrailed.push({ name: surface.name, top, exposed });
  }
  for (const u of unrailed.sort((a, b) => b.exposed - a.exposed).slice(0, 12))
    out.push(
      finding(
        u.top >= 4 ? 'HIGH' : 'MEDIUM',
        'UNRAILED_EDGE',
        `${u.name} liegt ${u.top.toFixed(1)} m hoch und hat ${u.exposed} ungesicherte Randpunkte.`,
        u,
      ),
    );
  if (unrailed.length > 12)
    out.push(
      finding(
        'MEDIUM',
        'UNRAILED_EDGE',
        `… und ${unrailed.length - 12} weitere Flächen ohne Absturzsicherung.`,
      ),
    );

  return out;
}
