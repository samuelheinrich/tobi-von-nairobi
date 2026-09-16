import type { WorldBuilder } from '../../world/scene-builder.js';
import { buildRailCurve } from '../../trains/train-station.js';
import { zurichTrainRoute } from '@tobi/game-data';

/** Visual route enclosure. Collider fences make the finite tunnel readable and non-explorable. */
export function buildZurichRailNetwork(b: WorldBuilder): void {
  buildRailCurve(b, 'train_tunnel', 's16-route', zurichTrainRoute.points);
  for (const [index, point] of zurichTrainRoute.points.entries()) {
    if (index === 0 || index === zurichTrainRoute.points.length - 1) continue;
    b.prop(
      'train_tunnel',
      'tunnel-side-left',
      [0.35, 5, 12],
      [point.x - 3.2, 2.5, point.z],
      '#575b5e',
    );
    b.prop(
      'train_tunnel',
      'tunnel-side-right',
      [0.35, 5, 12],
      [point.x + 3.2, 2.5, point.z],
      '#575b5e',
    );
    b.prop('train_tunnel', 'tunnel-roof', [6.8, 0.35, 12], [point.x, 5, point.z], '#45494c');
  }
  // Natural end caps keep pedestrians out of the route beyond each platform.
  for (const [x, z, label] of [
    [-3, 61, 'S16 · TUNNEL'],
    [68, 61, 'S16 · TUNNEL'],
  ] as const) {
    // Portal sides stop pedestrians while the physical train corridor remains unobstructed.
    for (const side of [-1, 1])
      b.prop(
        'train_tunnel',
        'rail-service-gate-side',
        [2.2, 3.2, 0.35],
        [x + side * 2.75, 1.6, z],
        '#343b3f',
        true,
      );
    b.prop('train_tunnel', 'rail-service-gate-top', [7.6, 0.5, 0.35], [x, 4.35, z], '#343b3f');
    b.sign('train_tunnel', label, x, 4.45, z - 0.2, 5.5);
  }
}
