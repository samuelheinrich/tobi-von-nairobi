import { NanaSecurity } from '../src/runtime/levels/nana-plaza/security.js';
import { NanaBarInteractions } from '../src/runtime/levels/nana-plaza/interactions.js';
import { Ray } from '@babylonjs/core/Culling/ray.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { BottlePickups } from '../src/runtime/items/bottle-pickups.js';
import { PoliceRuntime } from '../src/runtime/police/police-runtime.js';
import { PrototypeSession } from '@tobi/game-core';
import { prototypeBalance } from '@tobi/game-data';
import { NanaVenue } from '../src/runtime/levels/nana-venue.js';
import { SpeechBubbles } from '../src/runtime/levels/speech-bubbles.js';
import { Engine } from '@babylonjs/core/Engines/engine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { Locomotion, NavigationGrid } from '@tobi/game-core';
import { nanaPlaza, nanaTour, nanaVenues, movement } from '@tobi/game-data';
import {
  HavokWorld,
  HavokCharacterMotor,
  preparePhysics,
} from '../src/runtime/physics/havok-world.js';
import { createNanaPlazaScene } from '../src/runtime/levels/nana-plaza-scene.js';
import { ThirdPersonCamera } from '../src/runtime/camera/third-person-camera.js';
import { navigationObstacles } from '../src/runtime/levels/nav-obstacles.js';

/** Actual capsule journey, no teleports: station, street, courtyard, both stairs and venue. */
export async function exerciseNanaRoute() {
  const module = await preparePhysics();
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 800;
  document.body.append(canvas);
  const engine = new Engine(canvas),
    scene = new Scene(engine),
    world = new HavokWorld(scene, module);
  const environment = createNanaPlazaScene(scene, world, nanaPlaza);
  const motor = new HavokCharacterMotor(scene, nanaPlaza.spawn),
    locomotion = new Locomotion(movement);
  const camera = new ThirdPersonCamera(scene);
  const checkpoints: number[][] = [];
  const bubbles = new SpeechBubbles(scene);
  const bottles = new BottlePickups(scene, nanaPlaza, environment.shadows);
  const session = new PrototypeSession(nanaPlaza, prototypeBalance);
  const police = new PoliceRuntime(scene, nanaPlaza, environment.colliders, environment.shadows);
  const npcs = new NanaVenue(scene, environment.shadows, environment.colliders, bubbles);
  let sprinting = false;
  let contact = false;
  let cameraChecks = 0;
  const tick = (moveX = 0, moveZ = 0) => {
    const delta = 1 / 60;
    const velocity = locomotion.step(
      {
        moveX,
        moveZ,
        lookX: 0,
        lookY: 0,
        jumpPressed: false,
        sprintHeld: sprinting,
        interactPressed: false,
        specialPressed: false,
        throwPressed: false,
        flirtPressed: false,
        landPressed: false,
        celebratePressed: false,
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
    const outcome = police.system.step(delta, motor.position);
    contact ||= police.system.wanted.hadContact;
    if (outcome === 'escaped') session.escaped();
    if (outcome === 'caught') throw new Error('Caught on physical exploration route');
  };
  try {
    for (let i = 0; i < 90; i++) tick();
    const walk = (point: { x: number; y: number; z: number }) => {
      let reached = false;
      for (let i = 0; i < 1800; i++) {
        const p = motor.position,
          dx = point.x - p.x,
          dz = point.z - p.z,
          distance = Math.hypot(dx, dz);
        if (distance < 0.22) {
          reached = true;
          break;
        }
        tick(dx / distance, dz / distance);
      }
      if (!reached || Math.abs(motor.position.y - point.y - 1) > 0.65)
        throw new Error(`Route ${JSON.stringify(point)} blocked at ${motor.position.asArray()}`);
      checkpoints.push(motor.position.asArray());
      for (let angle = 0; angle < 4; angle++) {
        camera.yaw = (angle * Math.PI) / 2;
        camera.update(motor.position, 0, true);
        const pivot = motor.position.add(new Vector3(0, 0.65, 0));
        const direction = camera.camera.position.subtract(pivot);
        const distance = direction.length();
        if (!Number.isFinite(distance)) throw new Error('Invalid camera');
        if (
          scene.pickWithRay(
            new Ray(pivot, direction.normalize(), Math.max(0, distance - 0.05)),
            (m) => m.metadata?.cameraObstacle === true,
          )?.hit
        )
          throw new Error('Camera ray intersects a wall');
        cameraChecks++;
      }
      scene.render();
    };
    const routeCheckpoints: number[][] = [];
    for (const [index, point] of nanaTour.entries()) {
      if (index === 5) for (const p of nanaPlaza.pickups.slice(2, 6)) walk(p.position);
      if (index === 6) for (const p of nanaPlaza.pickups.slice(6, 10)) walk(p.position);
      walk(point);
      routeCheckpoints.push(motor.position.asArray());
    }
    // Inspect every upstairs entrance and leave through the same opening, no position resets.
    const entries: string[] = [];
    let lastSide = -1;
    walk({ x: -19, y: 9.6, z: 12 });
    for (const floor of [2, 1]) {
      const y = floor * 4.8;
      for (const venue of nanaVenues.filter((v) => v.floor === floor)) {
        walk({ x: lastSide * 19, y, z: 58 });
        walk({ x: venue.side * 19, y, z: 58 });
        walk({ x: venue.side * 19, y, z: venue.z });
        walk({ x: venue.side * 23.2, y, z: venue.z });
        npcs.update(3, motor.position);
        if (!npcs.flirt(motor.position)) throw new Error(`No visible flirt target in ${venue.id}`);
        walk({ x: venue.side * 23.2, y, z: venue.z + 1.75 });
        walk({ x: venue.side * 28.3, y, z: venue.z + 1.75 });
        const menu = environment.interact(motor.position);
        const purchase = environment.interact(motor.position);
        if (!menu || !purchase || !environment.interactionPrompt(motor.position).includes('THB'))
          throw new Error('Drink menu failed');
        entries.push(venue.id);
        walk({ x: venue.side * 23.2, y, z: venue.z + 1.75 });
        walk({ x: venue.side * 19, y, z: venue.z });
        lastSide = venue.side;
      }
      if (floor === 2) {
        for (const point of [
          { x: lastSide * 19, y, z: 58 },
          { x: 0, y, z: 62 },
          { x: -3, y, z: 67 },
          { x: -3, y: 7.2, z: 81 },
          { x: 3, y: 7.2, z: 81 },
          { x: 3, y: 4.8, z: 67 },
          { x: 0, y: 4.8, z: 62 },
          { x: 19, y: 4.8, z: 58 },
        ])
          walk(point);
        lastSide = 1;
      }
    }
    if (session.collected.size !== 16)
      throw new Error(`Only ${session.collected.size}/16 physically collected`);
    // Descend to the Soi after the tour, make real contact, then hide around the street corner.
    for (const point of [
      { x: lastSide * 19, y: 4.8, z: 58 },
      { x: 0, y: 4.8, z: 62 },
      { x: -3, y: 4.8, z: 67 },
      { x: -3, y: 2.4, z: 81 },
      { x: 3, y: 2.4, z: 81 },
      { x: 3, y: 0, z: 67 },
      { x: 0, y: 0, z: 62 },
      { x: 0, y: 0, z: -5 },
    ])
      walk(point);
    police.system.provoke();
    sprinting = true;
    const hadContact = contact;
    for (const point of [
      { x: 0, y: 0, z: -44 },
      { x: 64, y: 0, z: -44 },
      { x: 64, y: 0, z: -49 },
      { x: 60, y: 0, z: -49 },
    ])
      walk(point);
    for (let i = 0; i < 600; i++) tick();
    const completed = session.reach(nanaPlaza.destination.id);
    const security = new NanaSecurity(scene, environment.colliders, bubbles);
    const securityProbe = { x: 4, y: 1, z: 8 };
    security.step(0.1, securityProbe, 0);
    const quietSecurity = security.state;
    security.step(0.1, securityProbe, 25);
    const watchingSecurity = security.state;
    for (let i = 0; i < 30; i++) security.step(0.1, securityProbe, 45);
    const escorted = security.movement(securityProbe) !== null;
    security.dispose();
    const tab = new NanaBarInteractions(),
      counter = { x: 28.3, y: 1, z: 12 };
    tab.interact(counter);
    for (let i = 0; i < 8; i++) tab.interact(counter);
    const refused = tab.interact(counter);
    if (refused?.energy !== 0 || tab.bought !== 8) throw new Error('Drink budget underflow');
    const nav = new NavigationGrid(
      nanaPlaza.navigationBounds!,
      navigationObstacles(environment.colliders),
    );
    for (const spawn of nanaPlaza.policeSpawns!)
      if (!nav.open(spawn)) throw new Error('Police spawn blocked');
    return {
      checkpoints: routeCheckpoints,
      entries,
      quietSecurity,
      watchingSecurity,
      escorted,
      cameraChecks,
      collected: session.collected.size,
      hadContact,
      completed,
      flirts: npcs.flirts,
      meshes: scene.meshes.length,
      materials: scene.materials.length,
      physics: environment.colliders.length,
    };
  } finally {
    police.dispose();
    bottles.dispose();
    npcs.dispose();
    bubbles.dispose();
    motor.dispose();
    world.dispose();
    scene.dispose();
    engine.dispose();
    canvas.remove();
  }
}
