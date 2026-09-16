import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { baliTerrainHeight as height, baliTerraces } from '@tobi/game-data';
import type { BaliBuilder } from './builder.js';
function ramp(
  b: BaliBuilder,
  id: string,
  x: number,
  z: number,
  width: number,
  length: number,
  start: number,
  end: number,
) {
  const mesh = MeshBuilder.CreateBox(
    id,
    { width, height: 0.2, depth: Math.hypot(length, end - start) },
    b.scene,
  );
  mesh.position.set(x, (start + end) / 2 - 0.1, z);
  mesh.rotation.x = -Math.atan2(end - start, length);
  mesh.material = b.palette('#a99d7b');
  b.world.addStatic(mesh);
  mesh.metadata.navigationObstacle = false;
  b.colliders.push(mesh);
  b.sectors.add('roads', mesh);
}
export function buildLandmarks(b: BaliBuilder) {
  // Harbour decks span the underwater shoreline; stairs are not teleports.
  for (const [sector, x, w] of [
    ['harbour', -111, 28],
    ['island_1', -202, 28],
  ] as const) {
    b.prop(
      sector,
      'jetty-deck',
      [w, 0.4, 5],
      [x, 0.3, 35 + (sector === 'island_1' ? 35 : 0)],
      '#a98962',
      true,
    );
    for (let i = -1; i <= 1; i++)
      b.prop(
        sector,
        'jetty-pile',
        [0.55, 3, 0.55],
        [x + i * 10, -1, 33 + (sector === 'island_1' ? 35 : 0)],
        '#644d37',
        true,
      );
    b.sign(
      sector,
      sector === 'harbour' ? 'ISLAND EXPRESS / E EINSTEIGEN' : 'INSEL KARL / RETURN BOAT',
      x,
      2.8,
      39 + (sector === 'island_1' ? 35 : 0),
      10,
    );
  }
  for (const [x, z, side, sector] of [
    [-96, 35, -1, 'harbour'],
    [-217, 70, 1, 'island_1'],
  ] as const) {
    const access = MeshBuilder.CreateBox(
      'dock-access',
      { width: 4, height: 0.16, depth: 5 },
      b.scene,
    );
    access.position.set(x, 0.17, z);
    access.rotation.z = side * Math.atan2(0.5, 4);
    access.material = b.palette('#ad8e62');
    b.world.addStatic(access);
    access.metadata.navigationObstacle = false;
    b.colliders.push(access);
    b.sectors.add(sector, access);
  }
  // Temple plinth, physically connected by a broad ramp under visible treads.
  b.prop('temple', 'temple-plinth', [48, 12, 46], [80, 3.8, 222], '#8a8171', true);
  ramp(b, 'temple-stairs', 80, 189, 8, 20, height(80, 179), 9.8);
  for (let i = 0; i < 20; i++)
    b.prop(
      'temple',
      'temple-tread',
      [8, 0.035, 0.1],
      [80, height(80, 180) + ((9.8 - height(80, 180)) * i) / 20, 179 + i],
      '#d2c5a6',
    );
  for (const side of [-1, 1]) {
    for (let tier = 0; tier < 5; tier++)
      b.prop(
        'temple',
        'candi-bentar',
        [3.4 - tier * 0.43, 1.1, 3],
        [80 + side * (4 + tier * 0.16), 10.35 + tier * 1.1, 202],
        '#8c766b',
        true,
      );
    b.prop(
      'temple',
      'temple-wall',
      [0.65, 1.15, 44],
      [80 + side * 23.6, 10.375, 222],
      '#786f63',
      true,
    );
    b.prop(
      'temple',
      'guardian-statue',
      [1.3, 2, 1.2],
      [80 + side * 8, 10.8, 204],
      '#a69b86',
      true,
      'sphere',
    );
  }
  b.sign('temple', 'PURA CAHAYA / TEMPLE', 80, 15.8, 202, 12);
  shrine(b, 'temple', 80, 237, 9.8);
  for (const x of [66, 95]) shrine(b, 'temple', x, 234, 9.8);
  for (const [i, t] of baliTerraces.entries()) {
    b.prop(
      'rice_terraces',
      'terrace-bank',
      [t.width, t.y + 3, t.depth],
      [t.x, (t.y - 3) / 2, t.z],
      '#667d3a',
      true,
    );
    b.prop(
      'rice_terraces',
      'rice-water',
      [t.width - 2, 0.035, t.depth - 1.4],
      [t.x, t.y + 0.03, t.z],
      '#729e81',
    );
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 11; c++)
        b.prop(
          'rice_terraces',
          'rice-plants',
          [0.12, 0.4, 0.12],
          [t.x - 12 + c * 2.3, t.y + 0.22, t.z - 3 + r * 1.4],
          '#92b852',
        );
    b.prop(
      'rice_terraces',
      'terrace-path',
      [2, 0.06, t.depth],
      [t.x - 13, t.y + 0.03, t.z],
      '#c0ae78',
    );
    b.sign(
      'rice_terraces',
      i === 0 ? 'SAWAH / RICE TERRACES' : '↑',
      t.x - 17,
      t.y + 1.5,
      t.z,
      i === 0 ? 9 : 2,
    );
  }
  const last = baliTerraces[3]!;
  ramp(b, 'terrace-shortcut', -34, 155, 3, 50, height(-34, 130), last.y);
  b.prop(
    'rice_terraces',
    'terrace-walkway',
    [22, 0.16, 2],
    [-24, last.y - 0.08, 181],
    '#b7a16d',
    true,
  );
  b.prop(
    'rice_terraces',
    'terrace-connection',
    [3, 0.16, 10],
    [-16, last.y - 0.08, 177],
    '#b7a16d',
    true,
  );
  b.prop('jungle', 'stream', [15, 0.05, 4], [79, height(79, 159) + 0.35, 159], '#478e8c');
  ramp(b, 'jungle-bridge', 80, 159, 5, 18, height(80, 150), height(80, 168));
  for (const x of [77.6, 82.4])
    b.prop('jungle', 'bridge-rail', [0.15, 1, 18], [x, 4.22, 159], '#947748', true);
  shrine(b, 'island_1', -235, 47, 0);
  b.sign('jungle', 'HUTAN / JUNGLE ROAD', 80, height(80, 145) + 4, 143, 11);
  b.sign('rice_terraces', 'WARUNG / SAWAH VIEW', -40, height(-40, 182) + 3, 186, 10);
  b.sign('roads', 'SCOOTER-RUN / FLASCHE IM FAHREN', 50, height(50, 115) + 3, 111, 13);
}
function shrine(b: BaliBuilder, sector: string, x: number, z: number, y: number) {
  b.prop(sector, 'shrine-base', [5, 1.4, 5], [x, y + 0.7, z], '#9b8c76', true);
  // Two low stepping stones make the plinth reachable with the existing jump height.
  b.prop(sector, 'shrine-step', [3, 0.6, 1.8], [x, y + 0.3, z - 3], '#a5957c', true);
  for (const dx of [-1.6, 1.6])
    b.prop(sector, 'shrine-post', [0.25, 3, 0.25], [x + dx, y + 2.9, z + 1.7], '#645544', true);
  for (let i = 0; i < 3; i++)
    b.prop(
      sector,
      'meru-roof',
      [6 - i * 1.2, 0.28, 6 - i * 1.2],
      [x, y + 4.5 + i * 0.7, z],
      '#534b3d',
      true,
    );
  b.prop(sector, 'offerings', [0.6, 0.2, 0.6], [x + 1.4, y + 1.5, z - 1.5], '#ecc061');
}
