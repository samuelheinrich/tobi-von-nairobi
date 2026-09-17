import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { WorldBuilder } from '../../world/scene-builder.js';
import { buildRailCurve } from '../../trains/train-station.js';
import { box } from '../materials.js';
import { zurichStationBoxes, zurichTrainRoute } from '@tobi/game-data';

/** Is this point inside one of the two stations? */
function insideStation(point: { x: number; z: number }): boolean {
  return zurichStationBoxes.some(
    (s) => point.x >= s.minX && point.x <= s.maxX && point.z >= s.minZ && point.z <= s.maxZ,
  );
}

/** A wall that follows the track instead of standing across it.
 *
 * `WorldBuilder.prop` places axis-aligned instances. The S16 turns two corners on its way round
 * the north side of the city, and axis-aligned boxes cannot follow that — which is why the train
 * used to drive straight through its own enclosure on the eastbound leg.
 */
function wallAlong(
  b: WorldBuilder,
  sector: string,
  id: string,
  from: Vector3,
  to: Vector3,
  offset: number,
  height: number,
  colour: string,
): void {
  const delta = to.subtract(from),
    length = delta.length();
  if (length < 0.1) return;
  const tangent = delta.normalize(),
    side = new Vector3(tangent.z, 0, -tangent.x).scale(offset),
    centre = from.add(to).scale(0.5).add(side);
  // Overlap the joints by a wall thickness so the corners have no gap to see or fall through.
  const wall = box(
    b.scene,
    id,
    [0.4, height, length + 0.8],
    [centre.x, height / 2, centre.z],
    b.palette(colour),
  );
  wall.rotation.y = Math.atan2(tangent.x, tangent.z);
  b.world.addStatic(wall);
  wall.metadata.navigationObstacle = true;
  b.colliders.push(wall);
  b.sectors.add(sector, wall);
}

/** The S16 and the open cutting it runs through north of the city.
 *
 * The cutting exists so the finite route does not read as the edge of the world. It covers only
 * the open-air arc between Zürich HB and Stadelhofen: inside the stations the train has to reach
 * its platforms. The previous version walled every waypoint, including the two stops, so a
 * concrete slab stood on the platform edge exactly where the doors open — you rode to HB and were
 * shut out of the station by the enclosure that was meant to keep you in it.
 */
export function buildZurichRailNetwork(b: WorldBuilder): void {
  const sector = 'train_tunnel',
    points = zurichTrainRoute.points;
  buildRailCurve(b, sector, 's16-route', points);
  const open: { from: Vector3; to: Vector3 }[] = [];
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i]!,
      c = points[i + 1]!;
    // A segment belongs to the cutting only if it runs clear of both station halls.
    if (insideStation(a) && insideStation(c)) continue;
    open.push({ from: new Vector3(a.x, 0, a.z), to: new Vector3(c.x, 0, c.z) });
  }
  for (const [index, segment] of open.entries())
    for (const side of [-3.4, 3.4]) {
      wallAlong(
        b,
        sector,
        `s16-cutting-${index}`,
        segment.from,
        segment.to,
        side,
        2.6,
        side < 0 ? '#575b5e' : '#51565a',
      );
      // A low kerb on the outside reads as a retaining wall from the promenade.
      wallAlong(
        b,
        sector,
        `s16-kerb-${index}`,
        segment.from,
        segment.to,
        side * 1.25,
        0.5,
        '#6a7075',
      );
    }
  // Portals where the cutting meets each station, so the corridor has a readable mouth.
  for (const end of [open[0]?.from, open[open.length - 1]?.to]) {
    if (!end) continue;
    b.prop(sector, 'rail-portal-top', [8.4, 0.6, 0.5], [end.x, 3.1, end.z], '#343b3f');
    b.sign(sector, 'S16', end.x, 3.2, end.z - 0.35, 3.4);
  }
}
