import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { LevelDefinition } from '@tobi/contracts';
import type { HavokWorld } from '../physics/havok-world.js';
import { box, material } from './materials.js';
import { destinationRing, sceneKit, sceneSign } from './scene-kit.js';

/** Original Zurich-inspired street and floats; no geographic reproduction. */
export function createParadeScene(scene: Scene, world: HavokWorld, level: LevelDefinition) {
  const kit = sceneKit(scene, world, '#33395e');
  const asphalt = material(scene, 'parade-road', '#707985'),
    cream = material(scene, 'zurich-stone', '#d4cbb8');
  const pink = material(scene, 'parade-pink', '#ef70b2'),
    cyan = material(scene, 'parade-cyan', '#58c8d1');
  const dark = material(scene, 'parade-speakers', '#283542');
  kit.solid(box(scene, 'island-ground', [56, 1, 80], [0, -0.5, 0], asphalt));
  for (const x of [-27, 27]) {
    const boundary = kit.solid(
      box(scene, 'parade-boundary', [0.3, 5, 80], [x, 2, 0], cream),
      false,
    );
    boundary.isVisible = false;
    for (const z of [-30, -12, 6, 24]) {
      kit.solid(
        box(scene, 'zurich-townhouse', [6, 9 + (z % 3), 12], [x - Math.sign(x) * 3, 4.5, z], cream),
      );
      for (const y of [2, 5, 8])
        for (const dx of [-1.5, 1.5])
          box(
            scene,
            'townhouse-window',
            [0.9, 1.3, 0.08],
            [x - Math.sign(x) * 3 + dx, y, z - 6.05],
            cyan,
          );
    }
  }
  for (const z of [-39, 39]) kit.solid(box(scene, 'end-barrier', [56, 4, 0.3], [0, 2, z], dark));
  for (const [x, z, color] of [
    [-13, -12, pink],
    [13, 14, cyan],
    [-13, 24, cyan],
  ] as const) {
    kit.solid(box(scene, 'love-mobile', [6, 3.2, 9], [x, 1.6, z], color));
    for (const dx of [-2.4, 2.4]) {
      box(scene, 'speaker-stack', [1.3, 3.4, 2], [x + dx, 4.4, z + 1], dark);
      for (const y of [3.7, 4.9]) {
        const cone = MeshBuilder.CreateSphere(
          'speaker-cone',
          { diameter: 0.9, segments: 8 },
          scene,
        );
        cone.scaling.z = 0.15;
        cone.position.set(x + dx, y, z - 0.03);
        cone.material = color;
      }
    }
    sceneSign(scene, x < 0 ? 'KARL FM' : 'TOBI TECHNO', x, 4.1, z - 4.55, 5);
  }
  for (const x of [-1.8, 1.8]) box(scene, 'tram-track', [0.08, 0.02, 76], [x, 0.015, 0], cream);
  sceneSign(scene, 'ZURICH STREET PARADE', 0, 6, -30, 11);
  sceneSign(scene, 'BACKSTAGE / KARL REGELT DAS', 0, 3.4, 37, 8);
  return { ...kit, destination: destinationRing(scene, level) };
}
