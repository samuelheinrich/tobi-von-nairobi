import { Engine } from '@babylonjs/core/Engines/engine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera.js';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Color4 } from '@babylonjs/core/Maths/math.color.js';
import { Locomotion } from '@tobi/game-core';
import { movement } from '@tobi/game-data';
import type { InputActions } from '@tobi/contracts';
import {
  HavokWorld,
  HavokCharacterMotor,
  preparePhysics,
} from '../src/runtime/physics/havok-world.js';
import { loadAuthoredLevel } from '../src/runtime/levels/authored/import-level.js';
import { idleInput } from './physics-playground-harness.js';

export async function authoredPlayground(canvas: HTMLCanvasElement) {
  const engine = new Engine(canvas, true);
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.12, 0.18, 0.24, 1);
  const world = new HavokWorld(scene, await preparePhysics());
  const level = await loadAuthoredLevel(scene, '/level-assets/poc-city/poc-city');
  const camera = new ArcRotateCamera(
    'level-camera',
    -Math.PI / 2,
    0.8,
    54,
    new Vector3(0, 0, 0),
    scene,
  );
  camera.minZ = 0.15;
  camera.maxZ = 200;
  camera.attachControl(canvas, true);
  camera.inputs.removeByType('ArcRotateCameraKeyboardMoveInput');
  new HemisphericLight('sky', new Vector3(0.3, 1, -0.2), scene);
  const spawn = level.metadata.playerSpawns[0]!.position;
  const motor = new HavokCharacterMotor(scene, { x: spawn[0], y: spawn[1] + 1.1, z: spawn[2] });
  const locomotion = new Locomotion(movement);
  function tick(input: InputActions = idleInput) {
    const dt = 1 / 60;
    const velocity = locomotion.step(input, 0, motor.support(dt), dt);
    world.step(dt);
    motor.move(velocity, dt);
    if (velocity.y > 0 && motor.velocity.y < velocity.y) locomotion.velocity.y = motor.velocity.y;
  }
  function reset(point: readonly number[]) {
    motor.teleport({ x: point[0]!, y: point[1]! + 1.1, z: point[2]! });
    locomotion.reset();
  }
  function exercise() {
    const frames = (n: number, input = idleInput) => {
      for (let i = 0; i < n; i++) tick(input);
    };
    function follow(id: string) {
      const route = level.metadata.navigationRoutes.find((r) => r.id === id)!;
      reset(route.points![0]!);
      frames(30);
      for (const target of route.points!.slice(1)) {
        let reached = false;
        for (let i = 0; i < 360; i++) {
          const dx = target[0] - motor.position.x,
            dz = target[2] - motor.position.z;
          const distance = Math.hypot(dx, dz);
          if (distance < 0.18) {
            reached = true;
            break;
          }
          tick({ ...idleInput, moveX: dx / distance, moveZ: dz / distance });
        }
        if (!reached)
          throw new Error(`Blocked ${id} at ${motor.position.asArray()} toward ${target}`);
      }
      frames(25);
      return motor.feet.asArray();
    }
    // GLTF coordinate conversion must exactly match exported collision coordinates.
    let maxBoundsError = 0;
    for (const proxy of level.proxies) {
      const name = proxy.name.replace(/^COL_/, 'GEO_'); // test authoring convention only, never runtime inference
      const render = level.container.meshes.find((m) => m.name === name)!;
      proxy.computeWorldMatrix(true);
      render.computeWorldMatrix(true);
      const a = proxy.getBoundingInfo().boundingBox,
        b = render.getBoundingInfo().boundingBox;
      maxBoundsError = Math.max(
        maxBoundsError,
        Vector3.Distance(a.minimumWorld, b.minimumWorld),
        Vector3.Distance(a.maximumWorld, b.maximumWorld),
      );
    }
    if (maxBoundsError > 0.01) throw new Error(`Render/collision mismatch ${maxBoundsError}`);
    const inside = follow('MARK_entry_route');
    const roof = follow('MARK_stairs_route');
    if (Math.abs(roof[1]! - 3.3) > 0.15) throw new Error(`Roof not walkable: ${roof}`);
    // Balcony joins the roof without a step. Drive into its front railing.
    reset([12, 3.3, -0.5]);
    frames(30);
    frames(100, { ...idleInput, moveZ: 1 });
    const balconyRail = motor.feet.asArray();
    if (balconyRail[2]! > 1 || Math.abs(balconyRail[1]! - 3.3) > 0.15)
      throw new Error('Balcony railing failed');
    // Roof north railing.
    reset([11, 3.3, -10]);
    frames(30);
    frames(100, { ...idleInput, moveZ: -1 });
    const roofRail = motor.feet.asArray();
    if (roofRail[2]! < -12.1 || Math.abs(roofRail[1]! - 3.3) > 0.15)
      throw new Error('Roof railing failed');
    // Table side collision inside the bar.
    reset([12, 0.12, -5.5]);
    frames(30);
    frames(80, { ...idleInput, moveZ: -1 });
    const tableStop = motor.feet.asArray();
    if (tableStop[2]! < -7.5) throw new Error('Table side collision failed');
    // No floor penetration on the table top.
    reset([12, 1.1, -8]);
    frames(90);
    const tableTop = motor.feet.y;
    if (Math.abs(tableTop - 1.1) > 0.15) throw new Error('Table top grounding failed');
    reset(spawn);
    return {
      maxBoundsError,
      inside,
      roof,
      balconyRail,
      roofRail,
      tableStop,
      tableTop,
      renderMeshes: level.metadata.renderNodes.length,
      colliders: world.colliders.length,
    };
  }
  return { scene, engine, world, level, camera, motor, tick, reset, exercise, spawn };
}
