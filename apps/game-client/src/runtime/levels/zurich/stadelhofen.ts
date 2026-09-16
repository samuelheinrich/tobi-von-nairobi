import type { RestSpot } from '@tobi/game-core';
import type { WorldBuilder } from '../../world/scene-builder.js';
import { buildPlatform, buildStationFurniture, buildTrack } from '../../trains/train-station.js';

/** Compact Stadelhofen counterpart with open canopies and a street-level exit. */
export function buildStadelhofen(b: WorldBuilder) {
  const sector = 'stadelhofen',
    restSpots: RestSpot[] = [];
  b.prop(sector, 'stadelhofen-ground', [54, 0.5, 62], [76, -0.25, 85], '#555b60', true);
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
  for (const z of [63.5, 112.5]) {
    b.prop(sector, 'stadelhofen-end-wall', [12, 3.2, 0.4], [59, 1.6, z], '#9e927f', true);
    b.prop(sector, 'stadelhofen-end-wall', [14, 3.2, 0.4], [78, 1.6, z], '#9e927f', true);
  }
  b.sign(sector, 'ZÜRICH STADELHOFEN', 80, 5.7, 67.1, 11);
  b.sign(sector, 'BELLEVUE / SEE ↓', 86, 4.8, 59.2, 7);
  return { restSpots };
}
