import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh.js';
import type { Position3 } from '@tobi/contracts';
import type { RestSpot } from '@tobi/game-core';
import { nanaVenues, nanaWorld } from '@tobi/game-data';
import type { NanaBuilder } from './builder.js';

export interface VenueSector {
  id: string;
  x: number;
  y: number;
  z: number;
  meshes: AbstractMesh[];
}
export function buildVenueInteriors(b: NanaBuilder) {
  const restSpots: RestSpot[] = [],
    sectors: VenueSector[] = [];
  for (const v of nanaVenues) {
    const y = v.floor * nanaWorld.floorHeight,
      x = v.side * 26;
    const depth = v.floor === 0 ? 8.8 : 14;
    const wallX = v.side * 22;
    // Two door jambs leave a four-metre entrance; all volumes are physical and floor-aware.
    for (const dz of [-1, 1])
      b.solid(
        'venue-door-jamb',
        [0.25, 4.5, (depth - 4) / 2],
        [wallX, y + 2.25, v.z + dz * (depth / 4 + 1)],
        '#28243b',
        v.floor === 0,
      );
    b.solid('venue-lintel', [0.25, 0.7, 4], [wallX, y + 4.05, v.z], '#352b46', false);
    for (const dz of [-1, 1])
      b.solid(
        'venue-divider',
        [10, 4.5, 0.2],
        [v.side * 27, y + 2.25, v.z + (dz * depth) / 2],
        '#3a2e43',
        v.floor === 0,
      );
    b.sign(v.name, [v.side * 21.8, y + 3.3, v.z], 7.5, v.color, (v.side * Math.PI) / 2);
    b.prop(
      'venue-neon-door',
      [0.09, 0.15, depth - 0.6],
      [v.side * 21.8, y + 3.95, v.z],
      v.color,
      true,
    );
    if (v.mode === 'facade') {
      b.solid(
        'closed-bar-shutter',
        [0.25, 3.8, 4],
        [wallX, y + 1.9, v.z],
        '#654157',
        v.floor === 0,
      );
      continue;
    }
    if (v.mode === 'shallow')
      b.solid(
        'shallow-bar-back',
        [0.2, 4.5, depth],
        [v.side * 29.8, y + 2.25, v.z],
        '#34273a',
        v.floor === 0,
      );
    // The counter stays out of the entrance-to-stage path. E is offered from its front edge.
    b.solid(
      'venue-counter',
      [1.3, 1.05, depth - 3],
      [v.side * 30, y + 0.525, v.z],
      '#3e3147',
      v.floor === 0,
    );
    const before = b.scene.meshes.length;
    b.massive('counter-top', [1.5, 0.12, depth - 2.8], [v.side * 30, y + 1.1, v.z], v.color, true);
    b.massive('drink-shelf', [0.2, 2, depth - 2], [v.side * 31.6, y + 1.8, v.z], '#806c73');
    for (let i = 0; i < 7; i++) {
      b.prop(
        'beer-bottle',
        [0.15, 0.4, 0.15],
        [v.side * 31.3, y + 2.4, v.z - 2.4 + i * 0.7],
        '#6eb18d',
      );
      b.prop(
        'bar-led',
        [0.1, 0.22, 0.6],
        [v.side * 31.5, y + 3.8, v.z - 2.4 + i * 0.7],
        v.color,
        true,
      );
    }
    b.massive(
      'bar-fridge',
      [0.9, 1.8, 1],
      [v.side * 31, y + 0.9, v.z + depth / 2 - 0.8],
      '#a1bdbd',
    );
    b.prop('venue-screen', [0.09, 1.2, 2], [v.side * 31.7, y + 3.1, v.z], '#748aec', true);
    b.massive(
      'bar-speaker',
      [0.7, 1.3, 0.7],
      [v.side * 23, y + 2.8, v.z - depth / 2 + 0.6],
      '#171b29',
    );
    b.prop('mirror', [0.09, 1.8, depth - 2], [v.side * 31.7, y + 2.4, v.z], '#6d829b');
    b.prop('fire-extinguisher', [0.25, 0.65, 0.25], [v.side * 22.3, y + 1, v.z + 2.4], '#c23b4d');
    b.prop('cctv', [0.35, 0.25, 0.25], [v.side * 22.3, y + 3.8, v.z - 2], '#b9babd');
    b.prop('fan', [0.1, 0.6, 0.6], [v.side * 31.4, y + 3.9, v.z + 2], '#859096');
    if (v.floor > 0) {
      b.prop('stage-floor', [3.4, 0.035, v.signature ? 7 : 4.5], [x, y + 0.04, v.z], '#a1417c');
      for (const dz of v.signature ? [-2.5, 0, 2.5] : [-1, 1])
        b.massive('dance-pole', [0.1, 3.8, 0.1], [x, y + 1.9, v.z + dz], '#c5d0dc');
      b.prop(
        'stage-back-led',
        [0.08, 2.5, depth - 1],
        [v.side * 31.65, y + 2.7, v.z],
        v.color,
        true,
      );
      if (v.signature) {
        b.massive('dj-desk', [2, 1.2, 1], [x, y + 0.6, v.z + 5], '#43485c');
        b.sign('DJ KARL / LIVE FROM SOMEWHERE', [x, y + 3, v.z + 6], 8, v.color);
      }
    }
    for (const dz of [-1, 1]) {
      const z = v.z + dz * (depth / 2 - 1.2);
      b.massive('bar-bench', [4.4, 0.5, 0.8], [x, y + 0.25, z], '#7c475d');
      b.massive('bench-back', [4.4, 0.7, 0.12], [x, y + 0.75, z + dz * 0.45], '#7c475d');
      const id = `${v.id}-seat-${dz}`;
      restSpots.push({
        id,
        label: `${v.name} · HINSETZEN`,
        kind: 'seat',
        position: { x, y: y + 0.9, z },
        seatHeight: 0.5,
        exit: { x: x - v.side * 1.5, y: y + 1.1, z: z - dz },
        yaw: dz < 0 ? 0 : Math.PI,
      });
    }
    sectors.push({ id: v.id, x, y, z: v.z, meshes: b.scene.meshes.slice(before) });
  }
  for (const x of [-9, 9])
    for (const z of [16, 30, 44]) {
      b.solid('beer-bar-counter', [3, 1.1, 1], [x, 0.55, z], '#64513f');
      b.massive('beer-bar-roof', [4, 0.12, 2.5], [x, 3.3, z], '#855557');
      b.sign('GECKO BEER', [x, 2.8, z - 0.6], 4, '#e6bd60');
      for (const dx of [-1, 1]) {
        b.massive('bar-stool', [0.45, 0.75, 0.45], [x + dx, 0.375, z - 1.4], '#978368');
      }
    }
  let elapsed = 0;
  return {
    restSpots,
    focus(p: Position3) {
      for (const sector of sectors) {
        const close =
          Math.hypot(p.x - sector.x, p.z - sector.z) < 42 && Math.abs(p.y - sector.y - 1) < 6;
        for (const mesh of sector.meshes) mesh.isVisible = close;
      }
    },
    update(delta: number) {
      elapsed += delta;
      // Only six shared emissive palettes pulse, irrespective of the number of LEDs.
      for (const [i, color] of [...new Set(nanaVenues.map((v) => v.color))].entries())
        b.palette(color, true).emissiveColor.copyFrom(
          Color3.FromHexString(color).scale(0.65 + Math.sin(elapsed * 3 + i) * 0.25),
        );
      if (elapsed > 100000) elapsed = 0;
    },
  };
}
