import { Engine } from '@babylonjs/core/Engines/engine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { nanaPlaza, nanaResidents } from '@tobi/game-data';
import { createNanaPlazaScene } from '../src/runtime/levels/nana-plaza-scene.js';
import {
  HavokWorld,
  HavokCharacterMotor,
  preparePhysics,
} from '../src/runtime/physics/havok-world.js';
import {
  groundBelow,
  findGroundedSpawn,
  groundedVisualFeet,
} from '../src/runtime/physics/ground-detection.js';
import { ThrownBottles } from '../src/runtime/items/thrown-bottles.js';
import { createNpc, npcPalette } from '../src/runtime/levels/npc-kit.js';
import { setNpcAnimationDelta } from '../src/runtime/character/npc-models.js';

export async function exerciseNanaPhysics() {
  const canvas = document.createElement('canvas');
  document.body.append(canvas);
  const engine = new Engine(canvas),
    scene = new Scene(engine),
    world = new HavokWorld(scene, await preparePhysics());
  const environment = createNanaPlazaScene(scene, world, nanaPlaza);
  const camera = new FreeCamera('probe', new Vector3(0, 4, 20), scene);
  camera.setTarget(new Vector3(0, 1, 30));
  const motor = new HavokCharacterMotor(scene, { x: 0, y: 1, z: 25 });
  const bottles = new ThrownBottles(scene, environment.colliders, () => {});
  const tick = (velocity = { x: 0, y: -1, z: 0 }) => {
    environment.update(1 / 60);
    world.step(1 / 60);
    motor.move(velocity, 1 / 60);
    bottles.update(1 / 60, []);
  };
  try {
    const visualFloors: number[] = [];
    const stand = (x: number, y: number, z: number) => {
      motor.teleport({ x, y: y + 2, z });
      for (let i = 0; i < 120; i++) tick();
      return motor.feet.y;
    };
    const table = stand(-4, 1, 14),
      roof = stand(-9, 3.36, 16),
      floors = [0, 4.8, 9.6].map((y) => {
        const feet = stand(19, y, 58);
        visualFloors.push(groundedVisualFeet(scene, motor.feet, motor.support(1 / 60)).y);
        return feet;
      });
    motor.teleport({ x: 0, y: 1, z: 14 });
    for (let i = 0; i < 80; i++) tick({ x: -3, y: -1, z: 0 });
    const tableBlocked = motor.position.x;
    motor.teleport({ x: 28, y: 10.65, z: 14 });
    for (let i = 0; i < 80; i++) tick({ x: 3, y: -1, z: 0 });
    const barBlocked = motor.position.x;
    const occupants = nanaResidents
      .filter((p) => p.action !== 'sit')
      .map((p) => findGroundedSpawn(scene, new Vector3(p.x, p.y, p.z)));
    const unresolved = occupants.filter((p) => !p).length;
    const floorHits = [0, 4.8, 9.6].map(
      (y) => groundBelow(scene, new Vector3(19, y, 58))?.hitPointWorld.y,
    );
    // Pooled crowd capsule is checked on an upper floor with the real render observer active.
    const rig = createNpc(scene, 'physics-probe-npc', npcPalette(scene, 0), null);
    rig.root.position.set(19, 9.6, 58);
    camera.position.set(19, 12, 52);
    camera.setTarget(rig.root.position);
    for (let i = 0; i < 45; i++) {
      setNpcAnimationDelta(scene, 1 / 60);
      tick();
      scene.render();
    }
    const npcFeet = rig.root.position.y;
    const nearCapsules = world.colliders.filter((c) => c.config.layer === 'NPC').length;
    // Elevated projectiles must hit the actual upper floor, not a hard-coded street Y.
    bottles.launch({ x: 19, y: 11.6, z: 58 }, 0, -1);
    for (let i = 0; i < 100; i++) tick();
    const car = world.colliders.find(
      (c) => c.config.layer === 'VEHICLE' && c.source.name === 'taxi',
    )!;
    const before = car.mesh.position.clone();
    motor.teleport({ x: before.x, y: 3, z: before.z });
    // Match the roof's velocity while descending; then use platform carry with zero intent.
    const speed = car.aggregate.body.getLinearVelocity().x;
    for (let i = 0; i < 45; i++) tick({ x: motor.support(1 / 60) ? 0 : speed, y: -3, z: 0 });
    const offset = motor.position.x - car.mesh.position.x;
    for (let i = 0; i < 35; i++) tick();
    const rideError = Math.abs(motor.position.x - car.mesh.position.x - offset);
    return {
      table,
      roof,
      floors,
      visualFloors,
      tableBlocked,
      barBlocked,
      floorHits,
      unresolved,
      npcFeet,
      nearCapsules,
      bottleImpacts: bottles.impacts,
      rideError,
      carSpeed: speed,
      bodyCount: world.colliders.length,
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
