import type { RestSpot } from '@tobi/game-core';
import type { WorldBuilder } from '../../world/scene-builder.js';
import { buildPlatform, buildStationFurniture, buildTrack } from '../../trains/train-station.js';

/** Compact Stadelhofen counterpart with open canopies and a street-level exit. */
export function buildStadelhofen(b: WorldBuilder) {
  const sector = 'stadelhofen',
    restSpots: RestSpot[] = [];
  // No ground of its own any more: the city plate runs continuously underneath. Two slabs at the
  // same height only fought over which one you stood on.
  b.prop(sector, 'stadelhofen-forecourt', [40, 0.06, 9], [78, 0.04, 60], '#6f6a60');
  const trackXs = [62, 68, 74] as const;
  for (const [index, x] of trackXs.entries())
    buildTrack(b, sector, `stadelhofen-track-${index + 1}`, x, 0.05, 88, 48);
  // The two island platforms flank the through train with a small, traversable threshold.
  // The broad eastern platform carries waiting furniture and the station exit.
  for (const [index, x, width] of [
    [0, 64.7, 3.1],
    [1, 71.3, 3.1],
    [2, 78, 5],
  ] as const) {
    buildPlatform(b, sector, {
      id: `stadelhofen-platform-${index + 1}`,
      x,
      y: 0.26,
      z: 88,
      width,
      length: 45,
      trackNumbers: [index + 1],
    });
    if (index === 2) {
      buildStationFurniture(b, sector, 'stadelhofen-bench', x, 0.34, 82);
      restSpots.push({
        id: 'stadelhofen-seat',
        label: 'STADELHOFEN · SITZEN',
        kind: 'seat',
        position: { x, y: 1.05, z: 82 },
        exit: { x: x - 2, y: 1.25, z: 82 },
        yaw: -Math.PI / 2,
        seatHeight: 0.52,
      });
    }
  }
  // The south wall used to be closed across the eastern platform and open across the tracks, so
  // the only way into the station was to climb onto the rails. It is the other way round now: a
  // six-metre entrance onto platform 3, and the track mouth walled off.
  for (const z of [63.5, 112.5]) {
    b.prop(sector, 'stadelhofen-end-wall', [12, 3.2, 0.4], [59, 1.6, z], '#9e927f', true);
    b.prop(sector, 'stadelhofen-end-wall', [6.5, 3.2, 0.4], [68, 1.6, z], '#9e927f', true);
    if (z > 100) {
      b.prop(sector, 'stadelhofen-end-wall', [14, 3.2, 0.4], [78, 1.6, z], '#9e927f', true);
      continue;
    }
    b.prop(sector, 'stadelhofen-end-wall', [3.5, 3.2, 0.4], [73.25, 1.6, z], '#9e927f', true);
    b.prop(sector, 'stadelhofen-end-wall', [4.5, 3.2, 0.4], [82.75, 1.6, z], '#9e927f', true);
    b.prop(sector, 'stadelhofen-entrance-lintel', [6, 0.6, 0.5], [78, 3.5, z], '#7c7263', true);
  }
  b.sign(sector, 'EINGANG · GLEIS 3', 78, 4.3, 63.1, 6);
  b.sign(sector, 'ZÜRICH STADELHOFEN', 80, 5.7, 67.1, 11);
  b.sign(sector, 'BELLEVUE / SEE ↓', 86, 4.8, 59.2, 7);
  return { restSpots };
}
