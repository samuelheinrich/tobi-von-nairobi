import { Engine } from '@babylonjs/core/Engines/engine.js';
import { EngineStore } from '@babylonjs/core/Engines/engineStore.js';
import { Scene } from '@babylonjs/core/scene.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Locomotion } from '@tobi/game-core';
import { movement } from '@tobi/game-data';
import type { InputActions } from '@tobi/contracts';
import {
  HavokCharacterMotor,
  HavokWorld,
  preparePhysics,
} from '../src/runtime/physics/havok-world.js';
import { ThirdPersonCamera } from '../src/runtime/camera/third-person-camera.js';

/** Browser-only integration harness, outside Vite's production entry graph. */
export async function exercisePhysics() {
  const module = await preparePhysics();
  const canvas = document.createElement('canvas');
  document.body.append(canvas);
  const engine = new Engine(canvas, false);
  const scene = new Scene(engine);
  const surface = new StandardMaterial('test-surface', scene);
  const world = new HavokWorld(scene, module);
  const ground = MeshBuilder.CreateBox('test-ground', { width: 30, height: 1, depth: 30 }, scene);
  ground.position.y = -0.5;
  ground.material = surface;
  world.addStatic(ground);
  const wall = MeshBuilder.CreateBox('test-wall', { width: 8, height: 5, depth: 1 }, scene);
  wall.position.set(0, 2.5, 4);
  wall.material = surface;
  world.addStatic(wall);
  const motor = new HavokCharacterMotor(scene, { x: 0, y: 1.5, z: 0 });
  const locomotion = new Locomotion(movement);
  const idle: InputActions = {
    moveX: 0,
    moveZ: 0,
    lookX: 0,
    lookY: 0,
    jumpPressed: false,
    sprintHeld: false,
    interactPressed: false,
  };
  const tick = (input = idle): void => {
    const velocity = locomotion.step(input, 0, motor.support(1 / 60), 1 / 60);
    world.step(1 / 60);
    motor.move(velocity, 1 / 60);
  };
  try {
    for (let i = 0; i < 120; i++) tick();
    const settledHeight = motor.position.y;
    const grounded = motor.support(1 / 60);
    tick({ ...idle, jumpPressed: true });
    let highestJump = motor.position.y;
    for (let i = 0; i < 120; i++) {
      tick();
      highestJump = Math.max(highestJump, motor.position.y);
    }
    const landedHeight = motor.position.y;
    for (let i = 0; i < 180; i++) tick({ ...idle, moveZ: 1, sprintHeld: true });
    const stoppedZ = motor.position.z;
    const camera = new ThirdPersonCamera(scene);
    camera.look(Math.PI, 0);
    camera.update(motor.position, 1 / 60, true);
    const cameraZ = camera.camera.position.z;
    return {
      settledHeight,
      grounded,
      highestJump,
      landedHeight,
      stoppedZ,
      cameraZ,
      automaticPhysics: scene.physicsEnabled,
    };
  } finally {
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
