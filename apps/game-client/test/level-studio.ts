import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { PhysicsDebug } from '../src/runtime/physics/debug-physics.js';
import { authoredPlayground } from './level-studio-harness.js';
import { idleInput } from './physics-playground-harness.js';

const canvas = document.querySelector('canvas')!;
const state = document.getElementById('state')!;
try {
  const p = await authoredPlayground(canvas);
  const capsule = MeshBuilder.CreateCapsule('test-capsule', { height: 1.8, radius: 0.42 }, p.scene);
  const debug = new PhysicsDebug(p.scene, p.world, p.motor);
  const keys = new Set<string>();
  let jump = false,
    follow = false,
    accumulator = 0;
  window.addEventListener('keydown', (e) => {
    keys.add(e.code);
    if (e.code === 'Space') {
      jump = true;
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());
  const button = (id: string, action: () => void) => {
    document.getElementById(id)!.onclick = action;
  };
  button('reset', () => p.reset(p.spawn));
  button('roof', () => p.reset(p.level.metadata.roofAccess[0]!.position));
  button('bar', () =>
    p.reset(
      p.level.metadata.navigationRoutes.find((r) => r.id === 'MARK_entry_route')!.points![0]!,
    ),
  );
  button('stairs', () =>
    p.reset(
      p.level.metadata.navigationRoutes.find((r) => r.id === 'MARK_stairs_route')!.points![0]!,
    ),
  );
  button('debug', () => debug.toggle());
  button('cutaway', () => {
    for (const mesh of p.level.container.meshes)
      if (p.level.metadata.cutawayNodes.includes(mesh.name)) mesh.isVisible = !mesh.isVisible;
  });
  button('follow', () => {
    follow = !follow;
    p.camera.radius = follow ? 12 : 54;
    if (!follow) p.camera.target = Vector3.Zero();
  });
  const runProbe = () => {
    const result = p.exercise();
    document.getElementById('result')!.textContent = 'PASS · ' + JSON.stringify(result, null, 2);
    return result;
  };
  button('probe', () => {
    try {
      runProbe();
    } catch (error) {
      document.getElementById('result')!.textContent = String(error);
    }
  });
  // Development page only; enables a single targeted headless roundtrip without the full suite.
  Object.assign(window, { pocLevelStudio: { runProbe } });
  p.engine.runRenderLoop(() => {
    accumulator += Math.min(0.1, p.engine.getDeltaTime() / 1000);
    while (accumulator >= 1 / 60) {
      p.tick({
        ...idleInput,
        moveX: Number(keys.has('KeyD')) - Number(keys.has('KeyA')),
        moveZ: Number(keys.has('KeyW')) - Number(keys.has('KeyS')),
        jumpPressed: jump,
        sprintHeld: keys.has('ShiftLeft'),
      });
      jump = false;
      accumulator -= 1 / 60;
    }
    capsule.position.copyFrom(p.motor.position);
    if (follow) p.camera.target.copyFrom(p.motor.position);
    p.scene.render();
    state.textContent = `${p.level.metadata.renderNodes.length} Render-Meshes · ${p.world.colliders.length} Collider\nFüsse: ${p.motor.feet
      .asArray()
      .map((n) => n.toFixed(2))
      .join(' / ')}\nBodenkontakt: ${p.motor.grounded}`;
  });
  window.addEventListener('resize', () => p.engine.resize());
} catch (error) {
  state.textContent = String(error);
  throw error;
}
