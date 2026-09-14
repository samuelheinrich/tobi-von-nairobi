import { Engine } from '@babylonjs/core/Engines/engine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { ThrownBottles } from '../src/runtime/items/thrown-bottles.js';
import { PursuitSystem } from '@tobi/game-core';
import { pursuitBalance } from '@tobi/game-data';

export function exerciseProjectiles(blocked: boolean) {
  const canvas = document.createElement('canvas');
  document.body.append(canvas);
  const engine = new Engine(canvas),
    scene = new Scene(engine);
  new FreeCamera('test', new Vector3(0, 4, -4), scene);
  const wall = MeshBuilder.CreateBox('wall', { width: 4, height: 4, depth: 0.2 }, scene);
  wall.position.set(0, 2, 2.5);
  wall.computeWorldMatrix(true);
  const police = new PursuitSystem(1, [{ x: 0, z: 5 }], pursuitBalance, {
    clear: () => true,
    canSee: () => true,
    path: () => [],
  });
  for (let i = 0; i < 3; i++) police.disrupt();
  let hits = 0;
  const projectiles = new ThrownBottles(scene, blocked ? [wall] : [], () => undefined);
  try {
    projectiles.launch({ x: 0, y: 1, z: 0 }, 0);
    for (let i = 0; i < 180; i++)
      projectiles.update(1 / 60, [
        {
          position: { x: 0, y: 1.25, z: 5 },
          radius: 0.75,
          hit() {
            hits++;
            police.stagger(0);
          },
        },
      ]);
    const staggered = police.isStaggered(0);
    for (let i = 0; i < 180; i++) police.step(1 / 60, { x: 20, y: 1, z: 20 });
    return {
      hits,
      staggered,
      recovered: !police.isStaggered(0),
      remaining: projectiles.count,
      impacts: projectiles.impacts,
    };
  } finally {
    projectiles.dispose();
    scene.dispose();
    engine.dispose();
    canvas.remove();
  }
}
