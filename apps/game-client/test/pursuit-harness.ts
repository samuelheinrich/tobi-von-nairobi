import { Engine } from '@babylonjs/core/Engines/engine.js';
import { EngineStore } from '@babylonjs/core/Engines/engineStore.js';
import { Scene } from '@babylonjs/core/scene.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Locomotion, NavigationGrid, PrototypeSession } from '@tobi/game-core';
import {
  baliEscape,
  allLevels,
  movement,
  prototypeBalance,
  pursuitBalance,
  streetParade,
  zurichLayout,
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

/** Executes an authored escape route through actual Havok movement, pickups, geometry and police.
 * No teleport, mission completion hook or simulated perception results.
 */
export async function exerciseEscapeRoute(
  mode: 'escape' | 'stand' = 'escape',
  levelId = baliEscape.id,
) {
  const level = allLevels.find((entry) => entry.id === levelId);
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
        flirtPressed: false,
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
    } else walk(0, 12);
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
    for (const [x, z] of [
      [-4, level.scenery === 'night-market' ? 18 : 12],
      [-4, 22],
      [-15, 22],
      [-15, 12],
      [-17, 9],
    ])
      walk(x!, z!, true);
    // Keep circling the western bungalows instead of standing still: breaking the sightline is
    // what the escape timer rewards, and a faster Tobi has to keep earning it.
    for (let lap = 0; lap < 5 && !police.system.caught && police.system.wanted.level > 0; lap++)
      for (const [x, z] of [
        [-18, 12],
        [-18, 21],
        [-26, 21],
        [-26, 12],
      ]) {
        if (police.system.caught || police.system.wanted.level === 0) break;
        walk(x!, z!, police.system.snapshot().status === 'chase');
      }
    const escaped = police.system.escapes > 0;
    if (escaped) {
      for (const [x, z] of [
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

/** Walks the authored Street Parade route with real Havok movement and real police.
 * It proves three things the compact blockout never had to: the whole 104 x 108 metre plate is
 * traversable, the Quaibruecke carries both Tobi and the patrol, and the lake does not.
 */
export async function exerciseParadeRoute() {
  const level = streetParade;
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
  const bridge = zurichLayout.bridges[0]!;
  let onBridge = 0;
  let onWater = 0;
  let ticks = 0;
  const inside = (
    r: { minX: number; maxX: number; minZ: number; maxZ: number },
    x: number,
    z: number,
  ) => x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ;
  const tick = (x = 0, z = 0): void => {
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
      },
      0,
      motor.support(delta),
      delta,
    );
    world.step(delta);
    motor.move(velocity, delta);
    const p = motor.position;
    if (inside(bridge, p.x, p.z)) onBridge++;
    if (zurichLayout.water.some((basin) => inside(basin, p.x, p.z))) onWater++;
    for (const id of bottles.nearby(p))
      if (session.collect(id)) {
        bottles.collect(id);
        // Bottles raise chaos, which is what puts a patrol on the map in the first place.
        police.system.disrupt();
      }
    police.system.step(delta, p);
    ticks++;
  };
  const walk = (x: number, z: number, limit = 2400): boolean => {
    for (let i = 0; i < limit; i++) {
      const p = motor.position,
        dx = x - p.x,
        dz = z - p.z;
      const distance = Math.hypot(dx, dz);
      if (distance < 0.6) return true;
      tick(dx / distance, dz / distance);
    }
    return false;
  };
  try {
    for (let i = 0; i < 60; i++) tick();
    const reached = zurichLayout.route.slice(1).map((point) => walk(point.x, point.z));
    const destination = level.destination.position;
    const atDestination =
      Math.hypot(motor.position.x - destination.x, motor.position.z - destination.z) <
      level.destination.radius;
    // Now try to swim: straight east from the Buerkliplatz quay into the open basin.
    const before = motor.position.clone();
    walk(-32, -6, 1200);
    const enteredLake = walk(0, -30, 900);
    // The pursuit reads the same colliders: a patrol must be able to follow Tobi across the
    // whole plate, and must never find a way over the water.
    const grid = new NavigationGrid(
      level.navigationBounds!,
      navigationObstacles(environment.colliders),
    );
    const started = performance.now();
    const across = grid.path({ x: 20, z: -46 }, { x: -40, z: -44 });
    const patrolRoute = {
      acrossCity: across.length,
      acrossCityOpen: across.every((step) => grid.open(step)),
      acrossCityMs: Math.round(performance.now() - started),
      // A patrol ordered into the basin walks to the shore and stops; it never steps on water.
      lakeTargetOpen: grid.open({ x: -5, z: -30 }),
      stepsOnWater: grid
        .path({ x: 20, z: -46 }, { x: -5, z: -30 })
        .filter((step) => zurichLayout.water.some((basin) => inside(basin, step.x, step.z))).length,
    };
    return {
      legs: reached,
      completedRoute: reached.every(Boolean),
      atDestination,
      collected: session.collected.size,
      onBridge,
      onWater,
      enteredLake,
      startedFrom: before.asArray(),
      position: motor.position.asArray(),
      chaos: police.system.chaos.value,
      wanted: police.system.wanted.level,
      ...patrolRoute,
      ticks,
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
