import { physicsWorld } from '../physics/havok-world.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { box, cylinderBetween } from './materials.js';

export function palm(
  scene: Scene,
  x: number,
  z: number,
  height: number,
  trunk: StandardMaterial,
  leaf: StandardMaterial,
  shadows: ShadowGenerator,
): void {
  const top = new Vector3(x + 0.7, height, z);
  const stem = cylinderBetween(scene, 'palm-trunk', new Vector3(x, 0, z), top, 0.36, trunk);
  shadows.addShadowCaster(stem);
  physicsWorld(scene)?.addCollider(stem, { collision: 'capsule' });
  for (let i = 0; i < 7; i++) {
    const angle = (i * Math.PI * 2) / 7;
    const frond = MeshBuilder.CreateSphere('palm-frond', { diameter: 1, segments: 3 }, scene);
    frond.scaling.set(0.7, 0.2, 3.2);
    frond.position.copyFrom(
      top.add(new Vector3(Math.sin(angle) * 1.5, 0.1, Math.cos(angle) * 1.5)),
    );
    frond.rotation.set(0.22, angle, 0);
    frond.material = leaf;
    shadows.addShadowCaster(frond);
  }
}

export function parasol(
  scene: Scene,
  x: number,
  z: number,
  fabric: StandardMaterial,
  wood: StandardMaterial,
  shadows: ShadowGenerator,
): void {
  const stem = MeshBuilder.CreateCylinder(
    'parasol-stem',
    { height: 2.8, diameter: 0.09, tessellation: 8 },
    scene,
  );
  stem.position.set(x, 1.4, z);
  stem.material = wood;
  physicsWorld(scene)?.addCollider(stem, { collision: 'capsule' });
  const top = MeshBuilder.CreateCylinder(
    'parasol-canopy',
    { height: 0.65, diameterTop: 0, diameterBottom: 3.6, tessellation: 8 },
    scene,
  );
  top.position.set(x, 2.8, z);
  top.material = fabric;
  shadows.addShadowCaster(top);
  const chair = box(scene, 'beach-chair', [0.9, 0.15, 1.7], [x, 0.4, z - 0.3], fabric);
  chair.rotation.x = -0.12;
  physicsWorld(scene)?.addStatic(chair);
}
