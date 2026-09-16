import { Engine } from '@babylonjs/core/Engines/engine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { allLevels } from '@tobi/game-data';
import { createLevelScene } from '../src/runtime/levels/create-level-scene.js';
import {
  HavokWorld,
  HavokCharacterMotor,
  preparePhysics,
} from '../src/runtime/physics/havok-world.js';

/** The existing bunk interaction must remain reachable after making its mattress physical. */
export async function exerciseCustodyPhysics() {
  const canvas = document.createElement('canvas');
  document.body.append(canvas);
  const engine = new Engine(canvas),
    scene = new Scene(engine);
  const world = new HavokWorld(scene, await preparePhysics());
  const level = allLevels.find((l) => l.scenery === 'drunk-tank')!;
  createLevelScene(scene, world, level);
  const motor = new HavokCharacterMotor(scene, level.spawn);
  try {
    for (let i = 0; i < 360; i++) {
      world.step(1 / 60);
      motor.move({ x: -3, y: -1, z: -3 }, 1 / 60);
    }
    const d = level.destination.position;
    return {
      bunkBody: world.colliders.some((c) => c.source.name === 'cell-bunk-frame'),
      feet: motor.feet.asArray(),
      distance: Vector3.Distance(motor.position, new Vector3(d.x, d.y + 1, d.z)),
      radius: level.destination.radius,
    };
  } finally {
    motor.dispose();
    world.dispose();
    scene.dispose();
    engine.dispose();
    canvas.remove();
  }
}
