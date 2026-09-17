import { Engine } from '@babylonjs/core/Engines/engine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { Locomotion, PrototypeSession } from '@tobi/game-core';
import {
  arlesheimOutdoorRoute,
  hippieHouse,
  hippieHouseLayout,
  movement,
  prototypeBalance,
} from '@tobi/game-data';
import {
  HavokWorld,
  HavokCharacterMotor,
  preparePhysics,
} from '../src/runtime/physics/havok-world.js';
import { createLevelScene } from '../src/runtime/levels/create-level-scene.js';
import { BottlePickups } from '../src/runtime/items/bottle-pickups.js';

/** Walks through every room and both staircases using real Havok collisions. No teleports. */
export async function exerciseHouseRoute() {
  const module = await preparePhysics();
  const canvas = document.createElement('canvas');
  document.body.append(canvas);
  const engine = new Engine(canvas),
    scene = new Scene(engine);
  const world = new HavokWorld(scene, module),
    environment = createLevelScene(scene, world, hippieHouse);
  const motor = new HavokCharacterMotor(scene, hippieHouse.spawn),
    locomotion = new Locomotion(movement);
  const bottles = new BottlePickups(scene, hippieHouse, environment.shadows);
  const session = new PrototypeSession(hippieHouse, prototypeBalance);
  let ticks = 0;
  let backtrackHeight = 0;
  const floors: { height: number; collected: number }[] = [];
  const checkpoints: { x: number; z: number; y: number }[] = [];
  const tick = (x = 0, z = 0) => {
    const delta = 1 / 60;
    const velocity = locomotion.step(
      {
        moveX: x,
        moveZ: z,
        lookX: 0,
        lookY: 0,
        jumpPressed: false,
        sprintHeld: false,
        interactPressed: false,
        specialPressed: false,
        throwPressed: false,
        flirtPressed: false,
        landPressed: false,
        celebratePressed: false,
      },
      0,
      motor.support(delta),
      delta,
    );
    world.step(delta);
    motor.move(velocity, delta);
    bottles.update(delta);
    for (const id of bottles.nearby(motor.position)) if (session.collect(id)) bottles.collect(id);
    environment.focus?.(motor.position);
    bottles.cutaway(motor.position.y);
    ticks++;
  };
  const walk = (x: number, z: number) => {
    for (let i = 0; i < 1500; i++) {
      const p = motor.position,
        dx = x - p.x,
        dz = z - p.z,
        distance = Math.hypot(dx, dz);
      if (distance < 0.15) {
        checkpoints.push({ x: p.x, z: p.z, y: p.y });
        return;
      }
      tick(dx / distance, dz / distance);
    }
    throw new Error(
      `Blocked route to ${x},${z}; actual ${motor.position.asArray()}; pickups ${session.collected.size}`,
    );
  };
  try {
    for (let i = 0; i < 90; i++) tick();
    const blockedExit = !session.reach(hippieHouse.destination.id);
    walk(-9, -10);
    for (const floor of [2, 1, 0]) {
      for (const z of hippieHouseLayout.roomRows) {
        walk(0, z);
        for (const x of hippieHouseLayout.roomColumns) {
          walk(x, z);
          walk(0, z);
        }
      }
      floors.push({ height: motor.position.y, collected: session.collected.size });
      if (floor > 0) {
        walk(0, 15.3);
        walk(-2.2, 15.3);
        walk(-2.2, 29);
        walk(2.2, 29);
        walk(2.2, 15.3);
        walk(0, 14);
        if (floor === 2) {
          walk(2.2, 15.3);
          walk(2.2, 29);
          walk(-2.2, 29);
          walk(-2.2, 15.3);
          backtrackHeight = motor.position.y;
          walk(-2.2, 29);
          walk(2.2, 29);
          walk(2.2, 15.3);
          walk(0, 14);
        }
      }
    }
    walk(0, -13);
    const hiddenUpper = scene.getMeshByName('wg-floor-2')?.isVisible === false;
    const groundVisible = scene.getMeshByName('wg-floor-0')?.isVisible === true;
    for (const [x, z] of arlesheimOutdoorRoute) walk(x, z);
    const exteriorVisible =
      scene.clipPlane === null && scene.getMeshByName('wg-floor-2')?.isVisible === true;
    walk(0, -13);
    const interiorRestored =
      scene.clipPlane !== null && scene.getMeshByName('wg-floor-2')?.isVisible === false;
    walk(0, -22);
    return {
      exteriorVisible,
      interiorRestored,
      completed: session.reach(hippieHouse.destination.id),
      backtrackHeight,
      blockedExit,
      hiddenUpper,
      groundVisible,
      floors,
      position: motor.position.asArray(),
      collected: session.collected.size,
      score: session.score,
      ticks,
      checkpoints,
    };
  } finally {
    bottles.dispose();
    motor.dispose();
    world.dispose();
    scene.dispose();
    engine.dispose();
    canvas.remove();
  }
}
