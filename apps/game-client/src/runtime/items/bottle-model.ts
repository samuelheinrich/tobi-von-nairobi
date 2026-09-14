import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { material } from '../levels/materials.js';

/** Same small bottle silhouette in the hand and in flight. Materials are reused per scene. */
export function createBottleModel(scene: Scene, name: string): TransformNode {
  const root = new TransformNode(name, scene);
  const green = scene.getMaterialByName('held-glass') ?? material(scene, 'held-glass', '#38896a');
  const cream = scene.getMaterialByName('held-label') ?? material(scene, 'held-label', '#f6e8bf');
  for (const [part, diameter, height, y, surface] of [
    ['body', 0.2, 0.4, 0, green],
    ['neck', 0.075, 0.2, 0.28, green],
    ['label', 0.205, 0.16, 0, cream],
  ] as const) {
    const mesh = MeshBuilder.CreateCylinder(
      `${name}-${part}`,
      { diameter, height, tessellation: 8 },
      scene,
    );
    mesh.position.y = y;
    mesh.parent = root;
    mesh.material = surface;
  }
  return root;
}
