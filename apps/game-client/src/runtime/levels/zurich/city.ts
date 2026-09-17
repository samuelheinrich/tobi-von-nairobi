import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { WorldBuilder } from '../../world/scene-builder.js';
import { buildBuilding } from '../../world/buildings.js';
import { zurichBuildings } from '@tobi/game-data';

/** Extends the original lake blockout to HB and Stadelhofen with reusable facade modules. */
export function buildZurichCity(b: WorldBuilder) {
  const sector = 'bahnhofstrasse';
  // The old level ends at z=54. North of it the city used to be three separate slabs with two
  // holes between them, 70 m and 50 m wide — a third of the level had no ground under it. The
  // plate is now continuous from edge to edge, cut open only where Zürich HB carries its own
  // floors: the hall at street level and the track pit below it.
  for (const [x, width] of [
    [-99.25, 49.5],
    [64.25, 119.5],
  ] as const)
    b.prop(sector, 'city-north-ground', [width, 0.7, 70], [x, -0.35, 88], '#4d535a', true);
  // Behind the platform ends, joining the two halves north of the station.
  b.prop(sector, 'city-north-ground', [79, 0.7, 5], [-35, -0.35, 120.5], '#4d535a', true);
  // Parapet along the outer edge of the plate. Without it the city simply stopped and you walked
  // off into the lake.
  for (const [size, at] of [
    [
      [0.5, 1.1, 70],
      [-124, 0.55, 88],
    ],
    [
      [0.5, 1.1, 70],
      [124, 0.55, 88],
    ],
    [
      [248, 1.1, 0.5],
      [0, 0.55, 123],
    ],
  ] as const)
    b.prop(sector, 'city-quay-parapet', size, at, '#6d6a62', 'barrier');
  b.prop(sector, 'bahnhofstrasse-promenade', [14, 0.06, 73], [-34, 0.03, 74], '#8a8174');
  // The way east. It used to start at x 41, behind a row of houses, so there was no walkable
  // line from the parade to Stadelhofen at all — the station could only be reached across the
  // tracks. It now runs from the promenade to the station forecourt.
  b.prop(sector, 'stadelhofen-road', [96, 0.06, 12], [30, 0.03, 55], '#555b62');
  for (let x = -14; x <= 70; x += 12)
    b.prop(sector, 'stadelhofen-road-marking', [4.5, 0.02, 0.35], [x, 0.07, 55], '#c9c6ba');
  // Tram rails, catenary and a low-poly tram make the route readable from the lake.
  for (const dx of [-1.25, 1.25])
    b.prop(sector, 'tram-rail-north', [0.09, 0.04, 71], [-34 + dx, 0.07, 74], '#a9afb3');
  for (let z = 43; z <= 108; z += 13) {
    for (const side of [-1, 1])
      b.prop(
        sector,
        'tram-wire-pole',
        [0.13, 6.2, 0.13],
        [-34 + side * 5.5, 3.1, z],
        '#6d7478',
        true,
      );
    b.prop(sector, 'tram-wire', [11, 0.04, 0.04], [-34, 5.8, z], '#343b40');
  }
  b.prop(sector, 'zurich-tram-body', [2.65, 3.1, 13], [-34, 1.55, 45], '#1f6da0', true);
  b.prop(sector, 'zurich-tram-window', [2.69, 1.05, 10.5], [-34, 2.15, 45], '#223f52');
  for (const z of [40, 52, 64, 76, 88, 100]) {
    const lamp = MeshBuilder.CreateSphere(
      'zurich-street-lamp',
      { diameter: 0.45, segments: 7 },
      b.scene,
    );
    lamp.position.set(-25, 5.3, z);
    lamp.material = b.palette('#ffd589');
    (lamp.material as ReturnType<WorldBuilder['palette']>).emissiveColor =
      Color3.FromHexString('#5c431c');
    lamp.metadata = { collision: { collision: 'none' } };
    b.sectors.add(sector, lamp);
    b.prop(sector, 'lamp-post', [0.12, 5.2, 0.12], [-25, 2.6, z], '#3d464b', true);
  }
  // Repeated Zurich perimeter blocks: individual windows are decoration; shells carry collision.
  const facades = [
    [-58, 45, 15, 11, 16, '#c9b89d'],
    [-86, 58, 15, 11, 18, '#d7c7ad'],
    [-86, 72, 15, 11, 15, '#c8a983'],
    [-86, 86, 15, 11, 17, '#d8d0bd'],
    [-10, 45, 13, 11, 15, '#d0b791'],
    [16, 59, 13, 11, 17, '#c4ad93'],
    [12, 72, 14, 11, 16, '#d8c5a8'],
    [30, 68, 14, 10, 15, '#c6b29a'],
    [47, 72, 14, 10, 17, '#d9ceb8'],
    [100, 76, 13, 12, 15, '#cfbaa0'],
    [100, 92, 13, 12, 18, '#d8c7aa'],
  ] as const;
  for (const [x, z, width, depth, height, color] of facades) {
    const facadeSector = x > 48 ? 'stadelhofen' : sector;
    b.prop(facadeSector, 'zurich-facade', [width, height, depth], [x, height / 2, z], color, true);
    b.prop(
      facadeSector,
      'zurich-roof',
      [width + 0.5, 0.3, depth + 0.5],
      [x, height + 0.15, z],
      '#83584c',
      'barrier',
    );
    for (let y = 2.5; y < height - 1; y += 3.2)
      for (let dx = -width / 2 + 1.5; dx < width / 2 - 0.5; dx += 2.4)
        b.prop(
          facadeSector,
          'zurich-lit-window',
          [1.05, 1.35, 0.05],
          [x + dx, y, z - depth / 2 - 0.04],
          '#efd381',
        );
  }
  const buildings = zurichBuildings.map((definition) =>
    buildBuilding(b, definition, definition.id.includes('stadelhofen') ? 'stadelhofen' : sector),
  );
  b.sign(sector, 'BAHNHOFSTRASSE', -34, 5.5, 42, 9);
  b.sign(sector, 'CENTRAL · HB ↑', -26, 5.5, 53, 7);
  b.sign(sector, 'STADELHOFEN →', 6, 5.2, 50.6, 8);
  b.sign(sector, 'STADELHOFEN →', 46, 5.2, 50.6, 8);
  return buildings;
}
