/** Checks that need the real bodies of a level, captured by `capture-geometry.mjs`.
 *
 * Two things separate a floor from a wall. The collider now carries an explicit flag — a builder
 * may place something solid that is not a floor — and shape settles the rest, because the default
 * is still «walkable» and most bodies never say otherwise: a surface is wide and flat, a barrier
 * is tall.
 */

/** A body flat enough to stand on and wide enough to matter. */
const SURFACE_MAX_THICKNESS = 1.2;
// A stair landing is about 1.4 m deep. At 1.5 m the top of every staircase in the house was not
// a floor, and the whole upper storey looked sealed off.
const SURFACE_MIN_SPAN = 1.0;
/** A body tall enough to stop Tobi walking off an edge. */
const BARRIER_MIN_HEIGHT = 0.8;
/** Falls shorter than this hurt nothing. */
const SAFE_DROP = 1.6;
/** How far from an edge a railing still counts as protecting it. */
const RAILING_REACH = 0.9;

const span = (b, axis) => b.max[axis] - b.min[axis];
const isSurface = (b) =>
  b.walkable !== false &&
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

/** Everything reachable on foot from the spawn.
 *
 * The question a level has to answer is not «is there a floor here» but «can Tobi get there».
 * Zürich had a paved road to Stadelhofen with a row of houses standing on it, and a station whose
 * only entrance was across the tracks: every surface existed, none of it was any use.
 *
 * Storeys are nodes, not columns. A first attempt kept only the highest surface per square and
 * promptly declared every bottle in the Arlesheim house unreachable — it was walking about on the
 * roof. Each square therefore carries one node per floor level it has.
 */
const CONNECTOR = /stair|ramp|escalat|treppe|steps/i;

function reachableFrom(start, surfaces, barriers, bounds, bodies) {
  // Fine enough to find a doorway: at 1.5 m the grid stepped straight over the openings in
  // Nana Plaza and reported the whole level as sealed.
  const STEP = 0.75;
  const R = 0.42;
  const HEAD = 1.6;
  const STEP_UP = 0.65;
  const over = (b, x, z) =>
    b.min[0] - R <= x && x <= b.max[0] + R && b.min[2] - R <= z && z <= b.max[2] + R;
  const levelsAt = (x, z) => {
    const tops = [];
    for (const b of surfaces) if (over(b, x, z)) tops.push(b.max[1]);
    tops.sort((a, c) => a - c);
    // Collapse floors within a step of each other: a kerb is not a storey.
    return tops.filter((t, i) => i === 0 || t - tops[i - 1] > STEP_UP);
  };
  const blockedAt = (x, z, y) =>
    barriers.some((b) => over(b, x, z) && b.min[1] < y + HEAD && b.max[1] > y + 0.35);
  /** Stairs, ramps and escalators. A flight of stairs is a single slanted body, and the snapshot
   * stores axis-aligned boxes, so it reads as a wall two metres tall rather than as a floor. Where
   * one stands, the storeys it spans count as joined. */
  const connectors = (bodies ?? []).filter((b) => b.walkable && CONNECTOR.test(b.name));
  const liftsAt = (x, z) => connectors.filter((b) => over(b, x, z));
  const cell = (x, z) => `${Math.round(x / STEP)}:${Math.round(z / STEP)}`;
  const key = (x, z, y) => `${cell(x, z)}@${Math.round(y / 0.5)}`;
  const seen = new Set();
  const floors = levelsAt(start.x, start.z);
  if (!floors.length) return { seen, empty: true, reaches: () => true, storeys: 0 };
  // Start on the floor the spawn stands on, not on whatever is highest above it.
  const wanted = typeof start.y === 'number' ? start.y : floors[0];
  let startY = floors[0];
  for (const f of floors) if (Math.abs(f - wanted) < Math.abs(startY - wanted)) startY = f;
  seen.add(key(start.x, start.z, startY));
  const queue = [[start.x, start.z, startY]];
  for (let head = 0; head < queue.length && seen.size < 200000; head++) {
    const [x, z, y] = queue[head];
    for (const [dx, dz] of [
      [STEP, 0],
      [-STEP, 0],
      [0, STEP],
      [0, -STEP],
    ]) {
      const nx = x + dx,
        nz = z + dz;
      if (bounds && (nx < bounds.minX || nx > bounds.maxX || nz < bounds.minZ || nz > bounds.maxZ))
        continue;
      const lifts = liftsAt(nx, nz);
      for (const ny of levelsAt(nx, nz)) {
        const stepped = Math.abs(ny - y) <= STEP_UP;
        const carried = lifts.some(
          (b) =>
            ny >= b.min[1] - 0.6 &&
            ny <= b.max[1] + 0.6 &&
            y >= b.min[1] - 0.6 &&
            y <= b.max[1] + 0.6,
        );
        if (!stepped && !carried) continue;
        const k = key(nx, nz, ny);
        if (seen.has(k)) continue;
        if (blockedAt(nx, nz, ny)) continue;
        seen.add(k);
        queue.push([nx, nz, ny]);
      }
    }
  }
  /** Reached, if any floor of that square was. Items sit on tables and shelves, not on the floor,
   * so their own height is not a floor height. */
  const reaches = (p) => {
    for (const y of levelsAt(p.x, p.z)) if (seen.has(key(p.x, p.z, y))) return true;
    return false;
  };
  // How many distinct floor levels the level has at all, counted where the player started.
  const storeys = levelsAt(start.x, start.z).length;
  return { seen, empty: false, reaches, storeys };
}

export function geometryChecks(model, snapshot) {
  if (!snapshot?.bodies?.length) return [];
  const bodies = snapshot.bodies;
  const surfaces = bodies.filter(isSurface);
  const barriers = bodies.filter(isBarrier);
  const out = [];

  // 1. Can the player walk off the world? Sample the areas the level says it paved.
  //
  // Not `navigationBounds`: that is the rectangle NPCs path within, and it may legitimately
  // contain open water. Zürich's bounds reach 118 m out into the lake, which made a third of the
  // level read as a hole and buried the two real gaps — 70 m and 50 m wide — in the noise.
  const areas = model.groundAreas ?? (model.ground ? [model.ground] : []);
  if (areas.length) {
    const step = 4;
    let holes = 0;
    let total = 0;
    let firstHole = null;
    for (const b of areas)
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

  // 2. Can the player actually get to the things the level asks for?
  if (model.spawn) {
    const walk = reachableFrom(model.spawn, surfaces, barriers, model.bounds, bodies);
    if (!walk.empty) {
      const unreachable = (p) => !walk.reaches(p);
      // How far this result can be trusted. On one open storey the fill is the level: if it does
      // not get there, neither does Tobi. Stacked storeys are joined by stairs, and a staircase is
      // a slanted body that the snapshot stores as an axis-aligned block — the fill approximates
      // it, so a miss there is a question to go and check, not a verdict.
      const stacked = walk.storeys > 1;
      const caveat = stacked
        ? ' Mehrstöckiges Level: Treppen sind in der Momentaufnahme nur genähert, bitte nachgehen.'
        : '';
      const grade = (worst) => (stacked ? 'HIGH' : worst);
      // A destination you are flown to is not supposed to be walkable.
      if (model.destination && !model.carried && unreachable(model.destination))
        out.push(
          finding(
            grade('CRITICAL'),
            'DESTINATION_UNREACHABLE',
            'Das Ziel ist vom Startpunkt aus nicht zu Fuss erreichbar.' + caveat,
            model.destination,
          ),
        );
      const lost = model.bottles.filter(unreachable);
      if (lost.length)
        out.push(
          finding(
            grade(lost.length === model.bottles.length ? 'CRITICAL' : 'HIGH'),
            'BOTTLES_UNREACHABLE',
            `${lost.length} von ${model.bottles.length} Flaschen sind zu Fuss nicht erreichbar.` +
              caveat,
            { first: lost[0] },
          ),
        );
    }
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
