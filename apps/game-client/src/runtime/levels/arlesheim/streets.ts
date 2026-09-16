import { arlesheimOutdoorRoute } from '@tobi/game-data';
import type { WorldBuilder } from '../../world/scene-builder.js';
export function neighbourhoodStreets(b: WorldBuilder) {
  b.prop('neighbourhood', 'arlesheim-ground', [1600, 0.3, 1600], [0, -0.15, 0], '#7f9862', true);
  const road = (x: number, z: number, w: number, d: number) => {
    b.prop('neighbourhood', 'asphalt', [w, 0.035, d], [x, 0.022, z], '#737b79');
    if (w > d)
      for (const dz of [-1, 1])
        b.prop(
          'neighbourhood',
          'pavement',
          [w, 0.09, 2.4],
          [x, 0.045, z + dz * (d / 2 + 1.2)],
          '#c6c2b4',
        );
    else
      for (const dx of [-1, 1])
        b.prop(
          'neighbourhood',
          'pavement',
          [2.4, 0.09, d],
          [x + dx * (w / 2 + 1.2), 0.045, z],
          '#c6c2b4',
        );
  };
  road(5, -35, 142, 8);
  road(68, -18, 8, 100);
  road(-66, 1, 7, 78);
  road(66, 42, 74, 8);
  for (let x = -60; x < 68; x += 9)
    b.prop('neighbourhood', 'road-centre-dash', [3, 0.01, 0.14], [x, 0.045, -35], '#e3ddbb');
  for (let z = -38; z <= -32; z += 1.3)
    b.prop('neighbourhood', 'swiss-crossing', [3, 0.014, 0.65], [0, 0.05, z], '#ecce58');
  b.prop('wg', 'entry-walk', [5, 0.035, 20], [0, 0.025, -25], '#d1c9b0');
  b.prop('village', 'village-square', [39, 0.045, 29], [72, 0.025, 23], '#c9bd9f');
  // Footpaths to the wooded hill; the physical terrain remains continuous underneath.
  for (const [x, z, w, d] of [
    [35, 66, 4, 48],
    [7, 78, 60, 4],
    [-26, 52, 4, 44],
  ] as const)
    b.prop('woodland', 'footpath', [w, 0.03, d], [x, 0.025, z], '#c9b78e');
  for (const [x, z] of [
    [-55, -29],
    [-26, -29],
    [23, -29],
    [62, -16],
    [62, 9],
    [82, 42],
  ] as const) {
    b.prop('neighbourhood', 'street-lamp', [0.12, 5, 0.12], [x, 2.5, z], '#4f5f5b', true);
    b.prop('neighbourhood', 'street-lantern', [0.6, 0.75, 0.6], [x, 5, z], '#f4e5b7');
  }
  // Low front walls leave real entrances. Back hedges and woods explain the district boundary.
  for (const [x, z] of [
    [-43, -49],
    [30, -48],
    [9, -84],
    [53, -68],
  ] as const) {
    for (const side of [-1, 1])
      b.prop(
        'neighbourhood',
        'garden-front-wall',
        [5, 1, 0.35],
        [x + side * 5, 0.5, z - 8],
        '#b5ad96',
        true,
      );
    for (const side of [-1, 1])
      b.prop(
        'neighbourhood',
        'garden-hedge',
        [0.9, 1.7, 15],
        [x + side * 8, 0.85, z],
        '#45664b',
        true,
      );
  }
  for (const [x, z] of [
    [-58, -31],
    [35, -31],
    [72, -15],
    [97, 39],
  ] as const) {
    b.prop('neighbourhood', 'parked-car-body', [2, 1, 4.3], [x, 0.7, z], '#7d9494', true);
    b.prop('neighbourhood', 'parked-car-roof', [1.7, 0.65, 2.1], [x, 1.5, z], '#405659', true);
    for (const dx of [-1, 1])
      for (const dz of [-1.3, 1.3])
        b.prop(
          'neighbourhood',
          'car-wheel',
          [0.35, 0.65, 0.65],
          [x + dx, 0.35, z + dz],
          '#373c3c',
          false,
          'sphere',
        );
  }
  b.sign('neighbourhood', 'ARLESHEIM · TEMPO 30', -63, 2.3, -38, 7);
  b.sign('wg', 'HIPPIE-WG · LEERGUT ZURUECK', 9, 3.5, -15.3, 7);
  b.sign('village', 'DOMPLATZ ↑', 66, 2.6, -2, 5);
  b.sign('woodland', 'ERMITAGE / WALDWEG', 32, 2.3, 62, 7);
  // Far backdrop rather than the visible edge of a floating floor.
  for (let i = 0; i < 9; i++)
    b.prop(
      'woodland',
      'jura-hill',
      [120, 45 + (i % 3) * 18, 100],
      [-230 + i * 65, 4, 165 + (i % 2) * 45],
      '#698674',
      false,
      'sphere',
    );
  for (let i = 0; i < 70; i++) {
    const x = -82 + ((i * 37) % 187),
      z = 63 + ((i * 19) % 38);
    const nearRoute = arlesheimOutdoorRoute.some(([ax, az], index) => {
      const next = arlesheimOutdoorRoute[index + 1];
      if (!next) return false;
      const dx = next[0] - ax,
        dz = next[1] - az,
        t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
      return Math.hypot(x - ax - t * dx, z - az - t * dz) < 3;
    });
    if (nearRoute || Math.abs(x - 35) < 5 || Math.abs(z - 78) < 4 || Math.hypot(x + 9, z - 68) < 4)
      continue;
    b.prop('woodland', 'tree-trunk', [0.65, 5, 0.65], [x, 2.5, z], '#76624b', true);
    b.prop(
      'woodland',
      'tree-crown',
      [6, 6, 5],
      [x, 6, z],
      i % 2 ? '#486e49' : '#62814e',
      false,
      'sphere',
    );
  }
  // Natural visible boundary, with landscape continuing behind it.
  for (const [x, z, w, d] of [
    [-89, 0, 2, 211],
    [113, 0, 2, 211],
    [12, -105, 202, 2],
    [12, 103, 202, 2],
  ] as const)
    b.prop('woodland', 'boundary-hedge', [w, 3, d], [x, 1.5, z], '#4d6d4b', true);
}
