import { Engine } from '@babylonjs/core/Engines/engine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { thailandRailway } from '@tobi/game-data';
import { createLevelScene } from '../src/runtime/levels/create-level-scene.js';
import { HavokWorld, preparePhysics } from '../src/runtime/physics/havok-world.js';
export async function exerciseRailwayMotion() {
  const canvas = document.createElement('canvas');
  document.body.append(canvas);
  const engine = new Engine(canvas),
    scene = new Scene(engine);
  const world = new HavokWorld(scene, await preparePhysics());
  try {
    const level = createLevelScene(scene, world, thailandRailway);
    const strips = scene.transformNodes.filter((n) => n.name.startsWith('railway-landscape-'));
    const start = strips.map((n) => n.position.z),
      meshes = scene.meshes.length;
    const colliders = level.colliders.map((m) => m.position.asArray().join(','));
    level.update?.(1);
    const moved = strips.every((n, i) => Math.abs(n.position.z - start[i]!) > 1);
    for (let i = 0; i < 2000; i++) level.update?.(1);
    return {
      moved,
      strips: strips.length,
      bounded: strips.every((n) => n.position.z >= -128 && n.position.z < 128),
      stableMeshes: meshes === scene.meshes.length,
      stablePhysics: colliders.every(
        (p, i) => p === level.colliders[i]!.position.asArray().join(','),
      ),
    };
  } finally {
    world.dispose();
    scene.dispose();
    engine.dispose();
    canvas.remove();
  }
}
