import { box } from '../materials.js';
import { nanaWorld } from '@tobi/game-data';
import type { NanaBuilder } from './builder.js';

/** Open galleries: no slab across the courtyard, rear annex carries two U-shaped staircases. */
export function buildPlaza(b: NanaBuilder): void {
  const h = nanaWorld.floorHeight;
  for (let floor = 0; floor < 3; floor++) {
    const y = floor * h;
    for (const side of [-1, 1]) {
      b.solid(`nana-floor-${floor}`, [16, 0.24, 62], [side * 24, y - 0.12, 35], '#66525a', false);
      b.solid('plaza-exterior', [0.3, h, 62], [side * 32, y + h / 2, 35], '#403d49', floor === 0);
      if (floor > 0) {
        // Small gaps between bars and courtyard remain fully protected by real rail collision.
        const rail = b.solid(
          'gallery-railing',
          [0.14, 1.15, 49],
          [side * 16, y + 0.58, 28],
          '#435264',
          false,
        );
        rail.material = b.palette('#435264');
        for (let z = 4; z < 52; z += 2)
          b.prop('rail-post', [0.12, 1.25, 0.12], [side * 16, y + 0.63, z], '#d0a46e');
      }
      b.prop(
        'gallery-neon',
        [0.12, 0.16, 49],
        [side * 15.9, y + 3.7, 28],
        floor === 1 ? '#c74dff' : '#f85596',
        true,
      );
    }
    b.solid(`nana-rear-floor-${floor}`, [64, 0.24, 14], [0, y - 0.12, 59], '#6a5553', false);
    for (const side of [-1, 1])
      b.solid('back-wall', [27, h, 0.25], [side * 18.5, y + h / 2, 66], '#37303f', floor === 0);
    if (floor > 0)
      b.solid('rear-gallery-railing', [32, 1.15, 0.14], [0, y + 0.58, 52], '#435264', false);
    b.solid('stair-front-landing', [10, 0.24, 2], [0, y - 0.12, 67], '#8e919c', false);
    for (const x of [-5, 5])
      b.solid('stairwell-wall', [0.25, h, 18], [x, y + h / 2, 76], '#484857', floor === 0);
    b.solid('stairwell-back', [10, h, 0.25], [0, y + h / 2, 85], '#484857', floor === 0);
    b.sign(`FLOOR ${floor + 1} / STAIRS`, [0, y + 2.7, 65.8], 8, '#47ebd6');
  }
  for (const lower of [0, h]) {
    b.solid('stair-mid-landing', [10, 0.24, 4], [0, lower + h / 2 - 0.12, 82], '#8e919c', false);
    for (const side of [-1, 1]) {
      const upper = lower + h;
      const centre = side > 0 ? lower + h / 4 : lower + (3 * h) / 4;
      const ramp = box(
        b.scene,
        'nana-stair-ramp',
        [4.5, 0.2, Math.hypot(12, h / 2)],
        [side * 2.6, centre - 0.1, 74],
        b.palette('#8e919c'),
      );
      ramp.rotation.x = -side * Math.atan2(h / 2, 12);
      b.world.addStatic(ramp);
      ramp.metadata.navigationObstacle = false;
      b.colliders.push(ramp);
      for (let step = 0; step <= 24; step++) {
        const y = side > 0 ? lower + ((step / 24) * h) / 2 : upper - ((step / 24) * h) / 2;
        b.prop('stair-tread', [4.4, 0.025, 0.06], [side * 2.6, y + 0.02, 68 + step / 2], '#d2b477');
      }
    }
    b.solid('stair-divider', [0.2, h + 1.5, 12], [0, lower + (h + 1.5) / 2, 74], '#555363', false);
  }
  // Visible gate passage with flanking shops and layered canopy, not an isolated freestanding arch.
  for (const side of [-1, 1]) {
    b.solid('entrance-shop', [25, 8, 7], [side * 19.5, 4, 0], '#372e44');
    b.solid('entrance-column', [0.65, 7, 0.65], [side * 6.8, 3.5, -3.7], '#b68a65');
    b.prop('entrance-neon-upright', [0.16, 6, 0.18], [side * 6.35, 3.5, -4.15], '#ff407b', true);
    b.sign(side < 0 ? 'EXCHANGE / ATM' : 'SECURITY / WELCOME', [side * 15, 3, -3.6], 11, '#ffd761');
  }
  b.solid('entrance-canopy', [15, 0.4, 11], [0, 6.8, 0], '#392846', false);
  b.sign('NANA PLAZA', [0, 7.9, -5.65], 17, '#ff609d');
  b.sign('ENTERTAINMENT / SOI 4', [0, 6.4, -5.7], 12, '#f2ca68');
  // High, skeletal canopy echoes the real cover without hiding the courtyard from balconies.
  for (const x of [-15, 15])
    for (const z of [8, 48]) b.prop('canopy-column', [0.18, 17, 0.18], [x, 8.5, z], '#495166');
  for (const z of [8, 20, 34, 48]) b.prop('canopy-truss', [31, 0.25, 0.2], [0, 17, z], '#6a7284');
  b.prop('canopy-ridge', [0.3, 0.3, 45], [0, 18, 28], '#728399');
  b.sign('BTS / SOI 4  ←  EXIT', [0, 3.5, 4], 9, '#57edd2', Math.PI);
}
