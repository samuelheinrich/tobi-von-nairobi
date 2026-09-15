import { Engine } from '@babylonjs/core/Engines/engine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { Locomotion, PrototypeSession, NavigationGrid } from '@tobi/game-core';
import {
  baliAdventure,
  baliAdventureLayout,
  baliGroundAt,
  movement,
  prototypeBalance,
} from '@tobi/game-data';
import {
  HavokWorld,
  HavokCharacterMotor,
  preparePhysics,
} from '../src/runtime/physics/havok-world.js';
import { createLevelScene } from '../src/runtime/levels/create-level-scene.js';
import { PoliceRuntime } from '../src/runtime/police/police-runtime.js';
import { BottlePickups } from '../src/runtime/items/bottle-pickups.js';
import { navigationObstacles } from '../src/runtime/levels/nav-obstacles.js';
export async function exerciseBaliAdventure() {
  const canvas = document.createElement('canvas');
  document.body.append(canvas);
  const engine = new Engine(canvas),
    scene = new Scene(engine),
    world = new HavokWorld(scene, await preparePhysics());
  const level = baliAdventure,
    env = createLevelScene(scene, world, level);
  const police = new PoliceRuntime(scene, level, env.colliders, env.shadows);
  const motor = new HavokCharacterMotor(scene, level.spawn),
    locomotion = new Locomotion(movement);
  const bottles = new BottlePickups(scene, level, env.shadows),
    session = new PrototypeSession(level, prototypeBalance);
  const trace: unknown[] = [];
  let water = 0,
    contact = false;
  const tick = (x = 0, z = 0, sprint = true) => {
    const v = locomotion.step(
      {
        moveX: x,
        moveZ: z,
        lookX: 0,
        lookY: 0,
        jumpPressed: false,
        sprintHeld: sprint,
        interactPressed: false,
        specialPressed: false,
        throwPressed: false,
        flirtPressed: false,
        celebratePressed: false,
      },
      0,
      motor.support(1 / 60),
      1 / 60,
    );
    world.step(1 / 60);
    motor.move(v, 1 / 60);
    for (const id of bottles.nearby(motor.position))
      if (session.collect(id)) {
        bottles.collect(id);
        police.system.disrupt();
        locomotion.refill();
      }
    if (!baliGroundAt(motor.position.x, motor.position.z)) water++;
    const event = police.system.step(1 / 60, motor.position);
    contact ||= police.system.wanted.hadContact;
    if (event === 'caught')
      throw Error(JSON.stringify({ caught: motor.position.asArray(), trace }));
    if (event === 'escaped') session.escaped();
  };
  const walk = (x: number, z: number) => {
    for (let i = 0; i < 2000; i++) {
      const dx = x - motor.position.x,
        dz = z - motor.position.z,
        d = Math.hypot(dx, dz);
      if (d < 0.25) {
        trace.push([x, z, session.collected.size]);
        return;
      }
      tick(dx / d, dz / d);
    }
    throw Error(JSON.stringify({ stuck: motor.position.asArray(), target: [x, z], trace }));
  };
  try {
    for (let i = 0; i < 60; i++) tick();
    for (const [x, z] of baliAdventureLayout.route) walk(x, z);
    for (let lap = 0; lap < 8 && police.system.wanted.level > 0; lap++) {
      walk(-4, 72);
      walk(-4, 87);
      walk(9.5, 87);
      walk(9.5, 73);
    }
    walk(4, 76);
    for (let i = 0; i < 1200 && police.system.wanted.level > 0; i++) tick();
    const nav = new NavigationGrid(level.navigationBounds!, navigationObstacles(env.colliders));
    return {
      collected: session.collected.size,
      completed: session.reach(level.destination.id),
      water,
      contact,
      escapes: police.system.escapes,
      position: motor.position.asArray(),
      oceanOpen: nav.open({ x: -30, z: 70 }),
      trace,
    };
  } finally {
    bottles.dispose();
    police.dispose();
    motor.dispose();
    world.dispose();
    scene.dispose();
    engine.dispose();
    canvas.remove();
  }
}
