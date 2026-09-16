import { Engine } from '@babylonjs/core/Engines/engine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera.js';
import { Locomotion, PrototypeSession } from '@tobi/game-core';
import { baliAdventure, movement, prototypeBalance } from '@tobi/game-data';
import {
  HavokWorld,
  HavokCharacterMotor,
  preparePhysics,
} from '../src/runtime/physics/havok-world.js';
import { createLevelScene } from '../src/runtime/levels/create-level-scene.js';
import { VehicleRuntime } from '../src/runtime/vehicles/vehicle-runtime.js';
import { BottlePickups } from '../src/runtime/items/bottle-pickups.js';
import { idleInput } from './physics-playground-harness.js';
export async function createBaliProbe() {
  const canvas = document.createElement('canvas');
  document.body.append(canvas);
  const engine = new Engine(canvas),
    scene = new Scene(engine),
    world = new HavokWorld(scene, await preparePhysics());
  const env = createLevelScene(scene, world, baliAdventure),
    vehicles = new VehicleRuntime(scene, world, env.vehicles!);
  const camera = new FreeCamera('probe', new Vector3(-60, 12, -95), scene);
  camera.setTarget(new Vector3(-50, 0, -70));
  const motor = new HavokCharacterMotor(scene, baliAdventure.spawn),
    locomotion = new Locomotion(movement);
  const bottles = new BottlePickups(scene, baliAdventure, env.shadows),
    session = new PrototypeSession(baliAdventure, prototypeBalance);
  const tick = (input = idleInput) => {
    env.focus?.(motor.position);
    env.update?.(1 / 60);
    vehicles.step(1 / 60, input);
    motor.setCollisionEnabled(!vehicles.active);
    const v = locomotion.step(input, 0, motor.support(1 / 60), 1 / 60);
    world.step(1 / 60);
    if (vehicles.active) motor.teleport(vehicles.active.riderFeet.add(new Vector3(0, 0.9, 0)));
    else motor.move(v, 1 / 60);
    if (!vehicles.active && env.safeGround && !env.safeGround(motor.position))
      throw Error(`Route entered unsafe water: ${motor.position.asArray()}`);
    for (const id of bottles.nearby(motor.position, vehicles.active?.definition.kind))
      if (session.collect(id)) {
        bottles.collect(id);
        locomotion.refill();
      }
  };
  const trace: unknown[] = [];
  const walk = (x: number, z: number) => {
    for (let i = 0; i < 3200; i++) {
      const dx = x - motor.position.x,
        dz = z - motor.position.z,
        d = Math.hypot(dx, dz);
      if (d < 0.3) {
        trace.push([x, z, +motor.feet.y.toFixed(2), session.collected.size]);
        return;
      }
      tick({ ...idleInput, moveX: dx / d, moveZ: dz / d, sprintHeld: false });
    }
    throw Error(
      JSON.stringify({ stuck: motor.position.asArray(), target: [x, z], trace: trace.slice(-7) }),
    );
  };
  const drive = (x: number, z: number) => {
    for (let i = 0; i < 5000; i++) {
      const car = vehicles.active;
      if (!car) throw Error('Driver lost');
      const dx = x - car.position.x,
        dz = z - car.position.z,
        d = Math.hypot(dx, dz);
      if (d < 0.7) {
        for (let j = 0; j < 90; j++) tick({ ...idleInput, sprintHeld: true });
        trace.push(['drive', x, z, car.position.asArray(), session.collected.size]);
        return;
      }
      const wanted = Math.atan2(dx, dz),
        angle = Math.atan2(Math.sin(wanted - car.yaw), Math.cos(wanted - car.yaw));
      tick({
        ...idleInput,
        moveX: Math.max(-1, Math.min(1, angle * 2)),
        moveZ: Math.min(0.65, d / 18) * Math.max(0.025, Math.cos(angle)),
      });
    }
    throw Error(
      JSON.stringify({
        vehicleStuck: vehicles.active?.position.asArray(),
        target: [x, z],
        trace: trace.slice(-7),
      }),
    );
  };
  const interact = () => {
    const result = vehicles.interact(motor.position);
    if (result.exit) motor.teleport(result.exit);
    locomotion.halt();
    return result;
  };
  for (let i = 0; i < 60; i++) tick();
  return {
    scene,
    world,
    env,
    vehicles,
    motor,
    session,
    walk,
    drive,
    interact,
    tick,
    trace,
    dispose() {
      bottles.dispose();
      vehicles.dispose();
      motor.dispose();
      world.dispose();
      scene.dispose();
      engine.dispose();
      canvas.remove();
    },
  };
}
export async function exerciseBaliAdventure() {
  const p = await createBaliProbe();
  try {
    // Real connected routes, no teleport/mission-complete hooks.
    for (const [x, z] of [
      [-76, -88],
      [-78, -114],
      [-54, -114],
      [-54, -108],
      [-74, -114],
      [-73.2, -111],
      [-73.2, -99.3],
      [-70, -99.3],
      [-65, -105],
      [-65, -113],
      [-45, -113],
      [-35, -82],
      [-35, -75],
      [-33, -74],
      [-35, -82],
      [-47, -82],
      [-47, -52],
      [-15, -25],
      [0, 0],
      [18, 0],
      [18, 8],
      [18, 0],
      [10.8, 1],
      [10.8, 14],
      [14, 14],
      [18, 8],
      [18, -1],
      [0, -8],
      [-14, -8],
      [-14, 0],
      [-14, -8],
      [-21.2, -7],
      [-21.2, 6],
      [-18, 6],
      [-14, 0],
      [-14, -8],
      [40, 0],
      [40, 8],
      [40, 0],
      [49, 0],
      [49, 32],
      [56, 32],
      [20, 40],
      [20, 52],
      [42, 45],
      [30, 45],
      [30, 59],
      [40, 59],
      [40, 65],
      [40, 59],
      [32.8, 58],
      [32.8, 71],
      [36, 71],
      [40, 65],
      [40, 58],
      [62, 77],
      [65, 40],
      [6.5, 16],
    ] as const)
      p.walk(x, z);
    if (!p.interact().handled || p.vehicles.active?.definition.kind !== 'scooter')
      throw Error('Scooter E failed');
    p.drive(15, 44);
    p.drive(25, 80);
    p.drive(50, 115);
    p.drive(80, 147);
    if (!p.interact().exit) throw Error('Scooter exit failed');
    for (const [x, z] of [
      [84, 146],
      [80, 146],
      [80, 159],
      [80, 171],
      [107, 171],
      [107, 135],
      [100, 137],
      [100, 143],
      [100, 137],
      [88, 135],
      [88, 172],
      [62, 180],
      [80, 180],
      [80, 207],
      [68, 223],
      [94, 225],
      [80, 232.4],
    ] as const)
      p.walk(x, z);
    p.tick({ ...idleInput, jumpPressed: true, moveZ: 1 });
    for (let i = 0; i < 26; i++) p.tick({ ...idleInput, moveZ: 1 });
    for (let i = 0; i < 60; i++) p.tick();
    p.walk(80, 237);
    for (const [x, z] of [
      [80, 212],
      [80, 180],
      [-36, 125],
      [-34, 127],
      [-34, 181],
      [-16, 181],
      [-16, 167],
      [-16, 157],
      [-16, 147],
      [-16, 137],
      [-36, 137],
      [-46, 172],
      [-45, 178],
      [-46, 172],
      [-70, 100],
      [-78, 35],
      [-89, 35],
      [-109, 35],
      [-121, 35],
    ] as const)
      p.walk(x, z);
    if (!p.interact().handled || String(p.vehicles.active?.definition.kind) !== 'boat')
      throw Error('Boat E failed');
    p.drive(-155, 50);
    const seaExit = p.interact();
    if (seaExit.exit || !p.vehicles.active) throw Error('Open sea exit allowed');
    p.drive(-184, 70);
    if (!p.interact().exit) throw Error('Island exit blocked');
    for (const [x, z] of [
      [-210, 70],
      [-240, 83],
      [-240, 90],
      [-240, 83],
      [-253, 58],
      [-235, 42.4],
    ] as const)
      p.walk(x, z);
    p.tick({ ...idleInput, jumpPressed: true, moveZ: 1 });
    for (let i = 0; i < 26; i++) p.tick({ ...idleInput, moveZ: 1 });
    for (let i = 0; i < 60; i++) p.tick();
    p.walk(-235, 47);
    for (const [x, z] of [
      [-249, 70],
      [-253, 99],
      [-240, 110],
      [-240, 100],
      [-223, 87],
      [-223, 70],
      [-191, 70],
    ] as const)
      p.walk(x, z);
    if (!p.interact().handled) throw Error('Return boat missing');
    p.drive(-155, 50);
    p.drive(-128, 35);
    if (!p.interact().exit) throw Error('Harbour exit blocked');
    p.walk(-72, 35);
    p.walk(-35, 20);
    p.walk(0, 10);
    p.walk(0, -8);
    p.walk(-14, -8);
    return {
      collected: p.session.collected.size,
      total: baliAdventure.pickups.length,
      completed: p.session.reach(baliAdventure.destination.id),
      police: baliAdventure.maxWanted,
      seaExitBlocked: !seaExit.exit,
      trace: p.trace,
      missing: baliAdventure.pickups.filter((i) => !p.session.collected.has(i.id)).map((i) => i.id),
    };
  } finally {
    p.dispose();
  }
}
