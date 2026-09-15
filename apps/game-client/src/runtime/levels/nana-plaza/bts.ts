import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { box } from '../materials.js';
import { nanaWorld } from '@tobi/game-data';
import type { NanaBuilder } from './builder.js';

export function buildBts(b: NanaBuilder) {
  b.solid('bts-track-deck', [148, 0.8, 9], [0, 7.3, -62], '#777f89', false);
  for (let x = -60; x <= 60; x += 20) {
    b.solid('bts-pillar', [2, 7, 2], [x, 3.5, -62], '#89919b');
    b.prop('bts-crossbeam', [3, 0.9, 13], [x, 6.7, -62], '#8a8f99');
  }
  b.solid('bts-platform', [30, 0.3, 8], [22, 7.85, -49], '#aeb2b8', false);
  b.solid('bts-platform-back-rail', [30, 1.2, 0.18], [22, 8.6, -45], '#687d8e', false);
  b.solid('bts-platform-end', [0.2, 1.2, 8], [7, 8.6, -49], '#687d8e', false);
  b.solid('bts-track-safety-rail', [23, 1.1, 0.15], [18.5, 8.55, -53], '#637c87', false);
  b.prop('bts-yellow-line', [28, 0.02, 0.25], [22, 8.02, -52], '#efc958', true);
  for (const x of [10, 22, 34]) {
    b.prop('bts-roof-column', [0.25, 4.6, 0.25], [x, 10.3, -45.5], '#657785');
    b.prop('bts-roof-rib', [0.2, 0.3, 10], [x, 12.5, -49.5], '#a4adbb');
  }
  b.prop('bts-roof', [31, 0.2, 11], [22, 12.8, -49.5], '#3c5269');
  b.sign('NANA  E3 / SUKHUMVIT LINE', [22, 10.6, -45.2], 12, '#c0f4dd');
  b.sign('EXIT 2  →  SOI 4', [33, 10, -45.2], 7, '#f6df5d');
  b.sign('KARL AIR / ABU DHABI', [13, 9.8, -45.2], 7, '#f99aba');
  for (const z of [-52, -46])
    b.solid('ticket-gate', [0.7, 1.1, 1.1], [32, 8.55, z], '#566274', false);
  // Continuous shallow steps, same principle as the WG. End caps join platform and sidewalk.
  const ramp = box(
    b.scene,
    'bts-stair-ramp',
    [Math.hypot(24, 8), 0.2, 4.5],
    [48, 3.9, -49],
    b.palette('#929aa6'),
  );
  ramp.rotation.z = -Math.atan2(8, 24);
  b.world.addStatic(ramp);
  ramp.metadata.navigationObstacle = false;
  b.colliders.push(ramp);
  for (let step = 0; step <= 48; step++)
    b.prop('bts-step', [0.06, 0.025, 4.4], [36 + step / 2, 8 - step / 6 + 0.02, -49], '#d8c085');
  for (const z of [-51.4, -46.6]) {
    const rail = box(
      b.scene,
      'bts-stair-rail',
      [Math.hypot(24, 8), 1.2, 0.15],
      [48, 4.55, z],
      b.palette('#526b80'),
    );
    rail.rotation.z = -Math.atan2(8, 24);
    b.world.addStatic(rail);
    rail.metadata.navigationObstacle = false;
    b.colliders.push(rail);
  }
  b.solid('escalator-top-landing', [6, 0.25, 4], [34, 7.875, -55], '#a1a8b1', false);
  const escalator = box(
    b.scene,
    'bts-escalator',
    [Math.hypot(24, 8), 0.2, 2.4],
    [48, 3.9, -55],
    b.palette('#5d6f80'),
  );
  escalator.rotation.z = -Math.atan2(8, 24);
  b.world.addStatic(escalator);
  escalator.metadata.navigationObstacle = false;
  b.colliders.push(escalator);
  for (const z of [-56.3, -53.7]) {
    const rail = box(
      b.scene,
      'escalator-handrail',
      [Math.hypot(24, 8), 1.15, 0.18],
      [48, 4.5, z],
      b.palette('#263747'),
    );
    rail.rotation.z = -Math.atan2(8, 24);
    b.world.addStatic(rail);
    rail.metadata.navigationObstacle = false;
    b.colliders.push(rail);
  }
  const steps = Array.from({ length: 48 }, (_, i) =>
    b.prop(
      'escalator-moving-tread',
      [0.3, 0.04, 2.2],
      [36 + i / 2, 8 - i / 6 + 0.02, -55],
      '#9daaaa',
    ),
  );
  b.sign('STAIRS / ESCALATOR', [60, 2.9, -46], 7, '#f7d75d');
  const train = new TransformNode('bts-train', b.scene);
  for (let car = 0; car < 4; car++) {
    const x = car * 10;
    for (const [name, size, at, color] of [
      ['car', [9.6, 2.5, 3.2], [x, 9.2, -62], '#dce4e6'],
      ['stripe', [9.6, 0.6, 3.24], [x, 8.8, -62], '#e52d50'],
      ['windows', [8, 0.85, 3.3], [x, 9.7, -62], '#3ac3d0'],
    ] as const) {
      const part = b.prop(`bts-${name}`, [...size], [...at], color);
      part.parent = train;
    }
  }
  const doors = Array.from({ length: 8 }, (_, i) => {
    const part = b.prop(
      'bts-sliding-door',
      [0.7, 2, 0.08],
      [Math.floor(i / 2) * 10 + 2 + (i % 2) * 0.7, 9, -60.32],
      '#e0eef1',
    );
    part.parent = train;
    return { part, home: part.position.x, side: i % 2 ? 1 : -1 };
  });
  let time = 0;
  return (delta: number) => {
    time = (time + delta) % nanaWorld.bts.cycle;
    // Ease to a stop, dwell with door panels open, then accelerate away beyond the block edge.
    const x =
      time < 14
        ? -150 + 165 * (1 - (1 - time / 14) ** 2)
        : time < 23
          ? 15
          : 15 + 170 * ((time - 23) / 21) ** 2;
    train.position.x = x;
    const open = time > 15 && time < 22 ? Math.min(1, time - 15, 22 - time) : 0;
    for (const door of doors) door.part.position.x = door.home + door.side * open * 0.65;
    for (const [i, tread] of steps.entries()) {
      const t = (i / 48 + time * 0.025) % 1;
      tread.position.x = 36 + t * 24;
      tread.position.y = 8 - t * 8 + 0.02;
    }
  };
}
