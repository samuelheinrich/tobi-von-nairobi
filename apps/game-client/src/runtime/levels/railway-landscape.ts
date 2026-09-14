import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
import { box, material } from './materials.js';
import { palm } from './scenery.js';

/** Fixed pool of landscape strips. Wraps beyond the camera, without moving train physics. */
export function createRailwayLandscape(scene: Scene, shadows: ShadowGenerator) {
  const wood = material(scene, 'landscape-wood', '#8c6041');
  const leaves = material(scene, 'landscape-leaves', '#39825a');
  const walls = material(scene, 'landscape-hut', '#dec999');
  const roofs = material(scene, 'landscape-roof', '#a45339');
  const fields = material(scene, 'landscape-rice', '#8fb765');
  const span = 256,
    count = 16;
  const chunks = Array.from({ length: count }, (_, i) => {
    const root = new TransformNode(`railway-landscape-${i}`, scene);
    const before = scene.meshes.length;
    for (const side of [-1, 1]) {
      const x = side * (12 + (i % 3) * 5);
      box(scene, 'passing-house', [3 + (i % 3), 2.8, 4], [x, 0, 0], walls);
      const roof = MeshBuilder.CreateCylinder(
        'passing-roof',
        { height: 1.6, diameterBottom: 6, diameterTop: 0, tessellation: 4 },
        scene,
      );
      roof.position.set(x, 2.1, 0);
      roof.material = roofs;
      box(scene, 'passing-field', [15, 0.12, 13], [side * 31, -1.55, 0], fields);
      palm(scene, side * (9 + (i % 4)), 6, 5 + (i % 3), wood, leaves, shadows);
      palm(scene, side * 24, -4, 6, wood, leaves, shadows);
    }
    for (const mesh of scene.meshes.slice(before)) {
      mesh.parent = root;
      mesh.isPickable = false;
    }
    root.position.z = (i * span) / count - span / 2;
    return root;
  });
  return {
    chunks,
    update(delta: number) {
      for (const chunk of chunks)
        chunk.position.z =
          ((((chunk.position.z + span / 2 - delta * 14) % span) + span) % span) - span / 2;
    },
  };
}
