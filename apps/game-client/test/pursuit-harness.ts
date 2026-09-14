import { Engine } from '@babylonjs/core/Engines/engine.js';
import { EngineStore } from '@babylonjs/core/Engines/engineStore.js';
import { Scene } from '@babylonjs/core/scene.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Locomotion, PrototypeSession } from '@tobi/game-core';
import {
  baliEscape,
  playableLevels,
  movement,
  prototypeBalance,
  pursuitBalance,
} from '@tobi/game-data';
import {
  HavokWorld,
  HavokCharacterMotor,
  preparePhysics,
} from '../src/runtime/physics/havok-world.js';
import { createLevelScene } from '../src/runtime/levels/create-level-scene.js';
import { PoliceRuntime } from '../src/runtime/police/police-runtime.js';
import { BottlePickups } from '../src/runtime/items/bottle-pickups.js';

/** Executes an authored escape route through actual Havok movement, pickups, geometry and police.
 * No teleport, mission completion hook or simulated perception results.
 */
export async function exerciseEscapeRoute(
  mode: 'escape' | 'stand' = 'escape',
  levelId = baliEscape.id,
) {
  const level = playableLevels.find((entry) => entry.id === levelId);
  if (!level) throw new Error('Unknown level');
  const module = await preparePhysics();
  const canvas = document.createElement('canvas');
  document.body.append(canvas);
  const engine = new Engine(canvas, false),
    scene = new Scene(engine);
  const world = new HavokWorld(scene, module);
  const environment = createLevelScene(scene, world, level);
  const police = new PoliceRuntime(scene, level, environment.colliders, environment.shadows);
  const motor = new HavokCharacterMotor(scene, level.spawn);
  const locomotion = new Locomotion(movement);
  const bottles = new BottlePickups(scene, level, environment.shadows);
  const session = new PrototypeSession(level, prototypeBalance);
  const states = new Set<string>();
  let maxChaos = 0,
    ticks = 0;
  const tick = (x = 0, z = 0, sprint = false): void => {
    const delta = 1 / 60;
    const velocity = locomotion.step(
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
      },
      0,
      motor.support(delta),
      delta,
    );
    world.step(delta);
    motor.move(velocity, delta);
    for (const id of bottles.nearby(motor.position))
      if (session.collect(id)) {
        bottles.collect(id);
        police.system.disrupt();
      }
    const event = police.system.step(delta, motor.position);
    if (event === 'escaped') {
      session.escaped();
      session.score += pursuitBalance.escapeBonus;
    }
    maxChaos = Math.max(maxChaos, police.system.chaos.value);
    for (const a of police.system.activeAgents) states.add(a.state);
    ticks++;
  };
  const walk = (x: number, z: number, sprint = false): void => {
    for (let i = 0; i < 1200 && !police.system.caught; i++) {
      const p = motor.position,
        dx = x - p.x,
        dz = z - p.z;
      const distance = Math.hypot(dx, dz);
      if (distance < 0.25) return;
      tick(dx / distance, dz / distance, sprint);
    }
  };
  try {
    for (let i = 0; i < 90; i++) tick();
    if (level.scenery === 'beach-bar') {
      for (const pickup of level.pickups)
        walk(pickup.position.x, pickup.position.z, police.system.snapshot().status === 'chase');
    } else if (level.scenery === 'night-market') {
      walk(0, 9);
      walk(3, 12);
      walk(1, 15);
      walk(0, 18);
    } else if (level.scenery === 'street-parade') walk(0, 28);
    else walk(0, 12);
    const blockedCheckIn = !session.reach(level.destination.id);
    if (mode === 'stand') {
      for (let i = 0; i < 3600 && !police.system.caught; i++) tick();
      return {
        caught: police.system.caught,
        position: motor.position.asArray(),
        police: police.system.agents.map((a) => ({
          state: a.state,
          position: a.position,
          target: a.target,
        })),
      };
    }
    // North, then around the western bungalow. Its rear wall breaks sightlines.
    for (const [x, z] of level.scenery === 'street-parade'
      ? [
          [-6, 32],
          [-18, 32],
          [-18, 17],
          [-8, 17],
          [-8, 24],
        ]
      : [
          [-4, level.scenery === 'night-market' ? 18 : 12],
          [-4, 22],
          [-15, 22],
          [-15, 12],
          [-17, 9],
        ])
      walk(x!, z!, true);
    for (let i = 0; i < 900 && !police.system.caught && police.system.wanted.level > 0; i++) tick();
    const escaped = police.system.escapes > 0;
    if (escaped) {
      for (const [x, z] of level.scenery === 'street-parade'
        ? [
            [-8, 32],
            [-6, 32],
            [0, 34],
          ]
        : [
            [-15, 12],
            [-15, 22],
            [-4, 22],
            [0, 19],
          ])
        walk(x!, z!);
    }
    const nearHome =
      Vector3.Distance(
        motor.position,
        new Vector3(level.destination.position.x, 1, level.destination.position.z),
      ) < level.destination.radius;
    const completed = escaped && nearHome && session.reach(level.destination.id);
    return {
      completed,
      escaped,
      caught: police.system.caught,
      collected: session.collected.size,
      score: session.score,
      maxChaos,
      wanted: police.system.wanted.maximum,
      blockedCheckIn,
      states: [...states],
      position: motor.position.asArray(),
      ticks,
      police: police.system.agents.map((a) => ({
        state: a.state,
        position: a.position,
        target: a.target,
      })),
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
export function activeEngineCount(): number {
  return EngineStore.Instances.length;
}
