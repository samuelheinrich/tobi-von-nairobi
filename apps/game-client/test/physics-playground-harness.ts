import { Engine } from '@babylonjs/core/Engines/engine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera.js';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import {
  HavokWorld,
  HavokCharacterMotor,
  preparePhysics,
} from '../src/runtime/physics/havok-world.js';
import { MovingPlatform } from '../src/runtime/physics/moving-platform.js';
import { groundBelow, groundedVisualFeet } from '../src/runtime/physics/ground-detection.js';
import { Locomotion } from '@tobi/game-core';
import { movement } from '@tobi/game-data';
import type { InputActions } from '@tobi/contracts';
import { material } from '../src/runtime/levels/materials.js';

export const idleInput: InputActions = {
  moveX: 0,
  moveZ: 0,
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
};
export async function playground(canvas: HTMLCanvasElement) {
  const engine = new Engine(canvas, true),
    scene = new Scene(engine);
  const world = new HavokWorld(scene, await preparePhysics());
  const camera = new ArcRotateCamera(
    'playground-camera',
    -Math.PI / 2,
    1,
    24,
    new Vector3(0, 1, 2),
    scene,
  );
  camera.attachControl(canvas, true);
  new HemisphericLight('sky', Vector3.Up(), scene);
  const surfaces = ['#516e7c', '#d79b61', '#598e79', '#9368a6'].map((c, i) =>
    material(scene, 'playground-' + i, c),
  );
  function box(
    name: string,
    size: [number, number, number],
    at: [number, number, number],
    color = 0,
    physical = true,
  ) {
    const mesh = MeshBuilder.CreateBox(
      name,
      { width: size[0], height: size[1], depth: size[2] },
      scene,
    );
    mesh.position.set(...at);
    mesh.material = surfaces[color]!;
    if (physical) world.addStatic(mesh);
    return mesh;
  }
  box('ground', [60, 1, 60], [0, -0.5, 0]);
  box('wall', [5, 4, 0.3], [0, 2, 10]);
  box('table-top', [3, 0.15, 2], [-6, 0.95, 0], 1);
  box('table-pedestal', [0.35, 0.9, 0.35], [-6, 0.45, 0], 1);
  box('chair', [0.7, 0.5, 0.7], [-8, 0.25, 0], 1);
  box('chair-back', [0.7, 0.8, 0.12], [-8, 0.7, 0.4], 1);
  box('low-roof', [5, 0.25, 4], [6, 1.45, 0], 2);
  box('rail', [5, 1.1, 0.12], [6, 2.1, 1.9], 2);
  box('ceiling', [4, 0.2, 4], [0, 2.3, -7], 3);
  box('low-step', [2, 0.2, 2], [-5, 0.1, 6], 1);
  box('high-step', [2, 0.65, 2], [-8, 0.325, 6], 1);
  const ramp = box('stairs-ramp', [3, 0.2, Math.hypot(6, 1.5)], [6, 0.7, -5], 2, false);
  ramp.rotation.x = -Math.atan2(1.5, 6);
  world.addStatic(ramp);
  for (let i = 0; i <= 15; i++)
    box('stair-tread', [3, 0.02, 0.06], [6, i * 0.1, -8 + i * 0.4], 1, false);
  const car = box('moving-car', [3, 1.2, 2], [0, 0.6, 17], 3, false);
  const platform = new MovingPlatform(world, car);
  const motor = new HavokCharacterMotor(scene, { x: 0, y: 1.2, z: 0 });
  const locomotion = new Locomotion(movement);
  let carX = 0,
    carSpeed = 0;
  const tick = (input = idleInput) => {
    const dt = 1 / 60;
    platform.sync();
    carX += carSpeed * dt;
    platform.moveTo(new Vector3(carX, 0.6, 17));
    const velocity = locomotion.step(input, 0, motor.support(dt), dt);
    world.step(dt);
    motor.move(velocity, dt);
    if (velocity.y > 0 && motor.velocity.y < velocity.y) locomotion.velocity.y = motor.velocity.y;
  };
  const reset = (x: number, y: number, z: number) => {
    motor.teleport({ x, y, z });
    locomotion.reset();
  };
  const dispose = () => {
    motor.dispose();
    world.dispose();
    scene.dispose();
    engine.dispose();
  };
  return {
    engine,
    scene,
    world,
    camera,
    motor,
    locomotion,
    car,
    platform,
    tick,
    reset,
    dispose,
    setCarSpeed: (speed: number) => {
      carSpeed = speed;
    },
  };
}

/** Small deterministic real-Havok regression route, no database or GLB downloads. */
export async function exercisePlayground() {
  const canvas = document.createElement('canvas');
  document.body.append(canvas);
  const p = await playground(canvas);
  const frames = (n: number, input = idleInput) => {
    for (let i = 0; i < n; i++) p.tick(input);
  };
  try {
    p.reset(-6, 1.05, -3);
    frames(80, { ...idleInput, moveZ: 1 });
    const tableStop = p.motor.position.asArray();
    p.reset(-6, 1.05, -1.9);
    frames(12);
    p.tick({ ...idleInput, jumpPressed: true, moveZ: 1 });
    frames(18, { ...idleInput, moveZ: 1 });
    frames(80);
    const tableLand = p.motor.feet.y;
    p.reset(6, 4, 0);
    frames(90);
    const roofLand = p.motor.feet.y;
    p.reset(0, 1.05, -7);
    frames(20);
    p.tick({ ...idleInput, jumpPressed: true });
    let ceilingPeak = 0;
    for (let i = 0; i < 75; i++) {
      p.tick();
      ceilingPeak = Math.max(ceilingPeak, p.motor.position.y);
    }
    p.reset(6, 1.05, -9);
    frames(100, { ...idleInput, moveZ: 1 });
    const stairHeight = p.motor.feet.y;
    p.reset(0, 1.05, 14.5);
    frames(12);
    p.tick({ ...idleInput, jumpPressed: true, moveZ: 1 });
    frames(22, { ...idleInput, moveZ: 1 });
    frames(70);
    const carLand = p.motor.feet.y;
    const carVisualFeet = groundedVisualFeet(p.scene, p.motor.feet, p.motor.support(1 / 60)).y;
    p.setCarSpeed(2);
    frames(90);
    const rideError = Math.abs(p.motor.position.x - p.car.position.x);
    p.tick({ ...idleInput, jumpPressed: true });
    frames(12);
    const takeoff = p.motor.velocity.asArray();
    p.setCarSpeed(0);
    p.reset(p.car.position.x + 3, 1.05, 17);
    frames(20);
    const pushStart = p.motor.position.x;
    p.setCarSpeed(3);
    frames(60);
    const push = p.motor.position.x - pushStart;
    // The same platform body also supports an elevator, without reparenting the player.
    p.platform.reset(new Vector3(0, 0.6, 17));
    p.world.step(1 / 60);
    p.reset(0.7, 3.2, 17);
    for (let i = 0; i < 90; i++) {
      p.platform.sync();
      p.platform.moveTo(new Vector3(0, 0.6, 17));
      p.world.step(1 / 60);
      p.motor.move({ x: 0, y: -3, z: 0 }, 1 / 60);
    }
    const liftStart = p.motor.position.y;
    for (let i = 1; i <= 60; i++) {
      p.platform.sync();
      p.platform.moveTo(new Vector3(0, 0.6 + i / 60, 17));
      p.world.step(1 / 60);
      p.motor.move({ x: 0, y: 0, z: 0 }, 1 / 60);
    }
    const lifted = p.motor.position.y - liftStart;
    for (let i = 1; i <= 60; i++) {
      p.platform.sync();
      p.platform.moveTo(new Vector3(0, 1.6, 17), Quaternion.FromEulerAngles(0, i / 120, 0));
      p.world.step(1 / 60);
      p.motor.move({ x: 0, y: 0, z: 0 }, 1 / 60);
    }
    const rotated = p.motor.position.z - 17;
    const upper = groundBelow(p.scene, new Vector3(6, 1.6, 0));
    return {
      tableStop,
      tableLand,
      roofLand,
      ceilingPeak,
      stairHeight,
      carLand,
      carVisualFeet,
      rideError,
      takeoff,
      push,
      lifted,
      rotated,
      groundQuery: upper?.hitPointWorld.y,
    };
  } finally {
    p.dispose();
    canvas.remove();
  }
}
