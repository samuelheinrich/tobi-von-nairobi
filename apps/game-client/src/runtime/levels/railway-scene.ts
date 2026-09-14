import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { LevelDefinition } from '@tobi/contracts';
import type { HavokWorld } from '../physics/havok-world.js';
import { box, material } from './materials.js';
import { destinationRing, sceneKit, sceneSign } from './scene-kit.js';

/** Four open-top carriages with continuous physical gangways; moving scenery never moves colliders. */
export function createRailwayScene(scene: Scene, world: HavokWorld, level: LevelDefinition) {
  const kit = sceneKit(scene, world, '#c0daca');
  const cream = material(scene, 'train-cream', '#f0dbad'),
    green = material(scene, 'train-green', '#36756e');
  const floor = material(scene, 'train-floor', '#c5a889'),
    seats = material(scene, 'train-seats', '#cf7651');
  const dark = material(scene, 'train-dark', '#2a4247'),
    steel = material(scene, 'train-steel', '#8899a0');
  const grass = material(scene, 'thai-grass', '#7ba97c');
  box(scene, 'thai-landscape', [140, 0.4, 180], [0, -1.8, 0], grass);
  kit.solid(box(scene, 'island-ground', [8, 0.6, 76], [0, -0.3, 0], floor));
  for (const x of [-2.8, 2.8]) box(scene, 'rail', [0.12, 0.15, 130], [x, -0.85, 0], steel);
  const sleepers = Array.from({ length: 40 }, (_, i) =>
    box(scene, 'track-sleeper', [7, 0.13, 0.5], [0, -1, i * 3 - 60], dark),
  );
  for (const [index, z] of [-28.5, -9.5, 9.5, 28.5].entries()) {
    for (const x of [-4, 4]) {
      kit.solid(box(scene, 'carriage-side', [0.3, 1.0, 17], [x, 0.5, z], green));
      const boundary = kit.solid(
        box(scene, 'carriage-safety', [0.25, 5, 19], [x, 2.5, z], green),
        false,
      );
      boundary.isVisible = false;
      for (let offset = -6; offset <= 6; offset += 4) {
        box(scene, 'window-post', [0.18, 1.6, 0.16], [x, 1.8, z + offset], cream);
        const seat = kit.solid(
          box(
            scene,
            'train-seat',
            [1.65, 0.55, 1.7],
            [Math.sign(x) * 2.8, 0.275, z + offset],
            seats,
          ),
        );
        seat.receiveShadows = true;
        kit.solid(
          box(
            scene,
            'train-seat-back',
            [1.65, 1.25, 0.22],
            [Math.sign(x) * 2.8, 0.8, z + offset + 0.8],
            seats,
          ),
        );
      }
    }
    sceneSign(scene, `WAGEN ${4 - index}`, -2.7, 2.1, z + 8.3, 2);
    for (const x of [-2.8, 2.8])
      kit.solid(box(scene, 'carriage-end', [2.4, 1.25, 0.35], [x, 0.625, z + 8.6], cream));
    if (index < 3) box(scene, 'gangway', [2.9, 0.04, 2.4], [0, 0.03, z + 9.5], dark);
  }
  for (const z of [-38, 38]) kit.solid(box(scene, 'train-end-wall', [8, 4, 0.3], [0, 2, z], green));
  sceneSign(scene, 'THAILAND RAILWAY', 0, 3.5, 37.6, 6);
  const luggage = material(scene, 'luggage', '#956ba8');
  for (const z of [-19, 0, 19])
    kit.solid(box(scene, 'luggage-stack', [1.1, 0.8, 1.2], [2.5, 0.4, z], luggage));
  // Fixed landscape landmarks make the train setting readable through its open sides.
  for (let i = 0; i < 18; i++) {
    const x = (i % 2 ? 1 : -1) * (11 + (i % 4) * 3),
      z = i * 7 - 55;
    box(scene, 'thai-hut', [3, 2, 3], [x, -0.3, z], cream);
    const roof = MeshBuilder.CreateCylinder(
      'hut-roof',
      { height: 1.5, diameterBottom: 5, diameterTop: 0, tessellation: 4 },
      scene,
    );
    roof.position.set(x, 1.3, z);
    roof.material = seats;
  }
  let offset = 0;
  return {
    ...kit,
    destination: destinationRing(scene, level),
    update(delta: number) {
      offset = (offset + delta * 8) % 3;
      for (const [i, sleeper] of sleepers.entries()) sleeper.position.z = i * 3 - 60 - offset;
    },
  };
}
