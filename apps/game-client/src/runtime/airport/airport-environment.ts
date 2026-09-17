import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Position3 } from '@tobi/contracts';
import { aircraftLayout } from '@tobi/game-data';
import type { HavokWorld } from '../physics/havok-world.js';
import { box, material } from '../levels/materials.js';
import { sceneSign } from '../levels/scene-kit.js';
import { createAirportPartyHall } from './party-hall.js';

export interface AirportBlockout {
  root: TransformNode;
  exit: readonly [number, number, number];
  evacuationRoutes: readonly (readonly Position3[])[];
  setEnabled(active: boolean): void;
  update(delta: number): void;
}

/** Reusable airport blockout: solid apron, navigable terminal shell and an authored party goal. */
export function createAirportEnvironment(scene: Scene, world: HavokWorld): AirportBlockout {
  const root = new TransformNode('airport-environment', scene);
  const concrete = material(scene, 'airport-concrete', '#737d82');
  const terminal = material(scene, 'airport-terminal', '#d9e2e5');
  const glass = material(scene, 'airport-glass', '#63a7c4');
  glass.emissiveColor.set(0.08, 0.17, 0.22);
  const dark = material(scene, 'airport-dark', '#222a31');
  const yellow = material(scene, 'airport-marking', '#f0c947');
  yellow.emissiveColor.set(0.18, 0.12, 0.01);
  const solid = (
    name: string,
    size: [number, number, number],
    position: [number, number, number],
    surface = terminal,
  ) => {
    const mesh = box(scene, name, size, position, surface);
    mesh.parent = root;
    world.addStatic(mesh);
    mesh.metadata = { ...mesh.metadata, cameraObstacle: true };
    return mesh;
  };
  const prop = (
    name: string,
    size: [number, number, number],
    position: [number, number, number],
    surface = terminal,
  ) => {
    const mesh = box(scene, name, size, position, surface);
    mesh.parent = root;
    mesh.isPickable = false;
    return mesh;
  };

  solid('airport-apron', [520, 0.5, 440], [70, -0.25, 1450], concrete);
  for (let z = 1270; z <= 1630; z += 30)
    prop('apron-guide-line', [1, 0.03, 18], [-45, 0.03, z], yellow);
  for (const [x, z] of [
    [-70, 1380],
    [-80, 1510],
    [42, 1340],
    [55, 1580],
  ] as const) {
    solid('ground-service-vehicle', [7, 2.4, 3.2], [x, 1.2, z], yellow);
    for (const dz of [-1.1, 1.1]) {
      const wheel = MeshBuilder.CreateCylinder(
        'ground-service-wheel',
        { diameter: 0.8, height: 0.35, tessellation: 10 },
        scene,
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x - 3, 0.45, z + dz);
      wheel.material = dark;
      wheel.parent = root;
    }
  }

  // The door is already slid aft when this phase appears. Stairs reach the lower-deck sill.
  prop('aircraft-open-doorway', [0.2, 3.2, 2.2], [-4.8, 12.2, 1450], dark);
  prop('aircraft-open-door-panel', [0.25, 3.2, 2.2], [-5, 12.2, 1447.4], terminal);
  for (let step = 0; step < 27; step++)
    solid(
      'aircraft-exit-step',
      [3.6, 0.25, 0.8],
      [-20 + step * 0.55, 0.13 + step * 0.43, 1450],
      terminal,
    );

  // The west wall is split around a broad entrance; all other walls are physical.
  solid('terminal-floor', [160, 0.35, 180], [185, 0, 1450], terminal);
  solid('terminal-east-wall', [0.5, 13, 180], [265, 6.5, 1450], glass);
  solid('terminal-north-wall', [160, 13, 0.5], [185, 6.5, 1360], glass);
  solid('terminal-south-wall', [160, 13, 0.5], [185, 6.5, 1540], glass);
  for (const z of [1385, 1515]) solid('terminal-west-wall', [0.5, 13, 50], [105, 6.5, z], glass);
  prop('terminal-roof', [160, 0.4, 180], [185, 13, 1450], terminal);
  sceneSign(scene, 'ARRIVALS · PARTY TERMINAL', 105.1, 8.5, 1450, 12, {
    plate: '#19465c',
  }).rotation.y = Math.PI / 2;

  for (const z of [1390, 1410, 1490, 1510]) {
    solid('airport-checkin-desk', [13, 1.15, 2.2], [145, 0.58, z], dark);
    prop('airport-checkin-screen', [2.2, 1.2, 0.12], [145, 1.8, z], glass);
  }
  for (const z of [1380, 1400, 1420, 1480, 1500, 1520])
    for (const x of [177, 183, 189])
      solid('airport-waiting-seat', [1.4, 0.75, 1.3], [x, 0.38, z], dark);

  for (const [name, z, colour] of [
    ['KIOSK', 1382, '#f0c947'],
    ['DUTY FREE', 1410, '#55cbe8'],
    ['THAI FOOD', 1438, '#ef6b4f'],
  ] as const) {
    solid('airport-shop', [24, 4, 18], [236, 2, z], dark);
    const sign = sceneSign(scene, name, 223.9, 3.2, z, 7, { plate: colour, ink: '#111827' });
    sign.rotation.y = -Math.PI / 2;
  }

  const partyHall = createAirportPartyHall(scene, world);
  partyHall.root.parent = root;

  // A control tower and hangars make the apron readable from the aircraft exit.
  solid('airport-tower-base', [17, 32, 17], [65, 16, 1320], terminal);
  const tower = MeshBuilder.CreateCylinder(
    'airport-tower-cab',
    { diameter: 25, height: 8, tessellation: 12 },
    scene,
  );
  tower.position.set(65, 36, 1320);
  tower.material = glass;
  tower.parent = root;
  for (const [x, z] of [
    [-75, 1295],
    [-75, 1605],
  ] as const)
    solid('airport-hangar', [70, 18, 48], [x, 9, z], terminal);

  // Natural outer limits: terminal, hangars and perimeter fencing rather than an open edge.
  for (const [size, position] of [
    [
      [0.4, 4, 440],
      [-190, 2, 1450],
    ],
    [
      [520, 4, 0.4],
      [70, 2, 1230],
    ],
    [
      [520, 4, 0.4],
      [70, 2, 1670],
    ],
  ] as const)
    solid('airport-perimeter-fence', [...size], [...position], dark);

  const evacuationRoutes = Array.from({ length: 14 }, (_, index) => {
    const lane = (index % 5) * 2.1 - 4.2;
    return [
      { x: -20 - (index % 3), y: 0, z: 1450 + lane },
      { x: 30 + index * 1.2, y: 0, z: 1450 + lane },
      { x: 112, y: 0, z: 1450 + lane },
      { x: 170 + (index % 4) * 7, y: 0, z: 1440 + (index % 6) * 4 },
    ] as const;
  });
  root.setEnabled(false);
  return {
    root,
    exit: [
      aircraftLayout.airport.planeExit.x,
      aircraftLayout.airport.planeExit.y,
      aircraftLayout.airport.planeExit.z,
    ],
    evacuationRoutes,
    setEnabled(active) {
      root.setEnabled(active);
    },
    update(delta) {
      partyHall.update(delta);
    },
  };
}
