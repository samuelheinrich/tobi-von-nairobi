import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { playground, idleInput } from './physics-playground-harness.js';
import { ThrownBottles } from '../src/runtime/items/thrown-bottles.js';
import { PhysicsDebug } from '../src/runtime/physics/debug-physics.js';
const p = await playground(document.querySelector('canvas')!);
const figure = MeshBuilder.CreateCapsule('player', { height: 1.8, radius: 0.42 }, p.scene);
const debug = new PhysicsDebug(p.scene, p.world, p.motor);
const bottles = new ThrownBottles(p.scene, [], () => {});
const keys = new Set<string>();
let jump = false,
  drive = false,
  accumulator = 0;
window.addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (e.code === 'Space') {
    jump = true;
    e.preventDefault();
  }
  if (e.code === 'KeyG' && !e.repeat) bottles.launch(p.motor.position, 0, 0.4);
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());
document.getElementById('reset')!.onclick = () => p.reset(0, 1.2, 0);
document.getElementById('car')!.onclick = () => {
  drive = !drive;
  p.setCarSpeed(drive ? 2 : 0);
};
document.getElementById('debug')!.onclick = () => debug.toggle();
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
    bottles.update(1 / 60, []);
    jump = false;
    accumulator -= 1 / 60;
  }
  figure.position.copyFrom(p.motor.position);
  p.scene.render();
  document.getElementById('state')!.textContent = JSON.stringify(
    {
      feet: p.motor.feet.asArray().map((n) => +n.toFixed(2)),
      grounded: p.motor.grounded,
      platform: p.motor.surfaceVelocity.asArray(),
      bodies: p.world.colliders.length,
    },
    null,
    2,
  );
});
window.addEventListener('resize', () => p.engine.resize());
