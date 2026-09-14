import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { LevelDefinition } from '@tobi/contracts';
import { railwayLayout } from '@tobi/game-data';
import type { HavokWorld } from '../physics/havok-world.js';
import { box, material } from './materials.js';
import { destinationRing, sceneKit, sceneSign } from './scene-kit.js';

/** Five open-top carriages, one of them a bar, with continuous physical gangways.
 * Moving scenery never moves colliders: only the sleepers slide to fake the ride.
 */
export function createRailwayScene(scene: Scene, world: HavokWorld, level: LevelDefinition) {
  const kit = sceneKit(scene, world, '#c0daca', { fogStart: 80, fogEnd: 180 });
  const cream = material(scene, 'train-cream', '#f0dbad'),
    green = material(scene, 'train-green', '#36756e');
  const floor = material(scene, 'train-floor', '#c5a889'),
    seats = material(scene, 'train-seats', '#cf7651');
  const dark = material(scene, 'train-dark', '#2a4247'),
    steel = material(scene, 'train-steel', '#8899a0');
  const grass = material(scene, 'thai-grass', '#7ba97c');
  const teak = material(scene, 'bar-teak', '#7a4a2c');
  const brass = material(scene, 'bar-brass', '#d7a94f');
  brass.emissiveColor = Color3.FromHexString('#4a3714');
  const bottleGlass = material(scene, 'bar-bottles', '#3f8f74');
  const layout = railwayLayout;
  const front = layout.carriageCentres[layout.carriageCentres.length - 1]!;
  box(scene, 'thai-landscape', [140, 0.4, 220], [0, -1.8, 0], grass);
  kit.solid(box(scene, 'island-ground', [8, 0.6, 100], [0, -0.3, 0], floor));
  for (const x of [-2.8, 2.8]) box(scene, 'rail', [0.12, 0.15, 160], [x, -0.85, 0], steel);
  const sleepers = Array.from({ length: 54 }, (_, i) =>
    box(scene, 'track-sleeper', [7, 0.13, 0.5], [0, -1, i * 3 - 80], dark),
  );
  for (const [index, z] of layout.carriageCentres.entries()) {
    const bar = index === layout.barCarriageIndex;
    for (const x of [-4, 4]) {
      kit.solid(box(scene, 'carriage-side', [0.3, 1.0, 17], [x, 0.5, z], green));
      const boundary = kit.solid(
        box(scene, 'carriage-safety', [0.25, 5, 19], [x, 2.5, z], green),
        false,
      );
      boundary.isVisible = false;
      for (const offset of layout.seatOffsets)
        box(scene, 'window-post', [0.18, 1.6, 0.16], [x, 1.8, z + offset], cream);
    }
    if (bar) {
      // Bar carriage: counter and back-bar on the right, standing space on the left.
      kit.solid(box(scene, 'bar-counter', [1.4, 1.1, 12], [2.6, 0.55, z], teak), false);
      box(scene, 'bar-counter-top', [1.7, 0.09, 12.3], [2.6, 1.14, z], brass);
      kit.solid(box(scene, 'bar-backboard', [0.5, 1.9, 12], [3.6, 1.5, z], teak));
      for (let i = -5; i <= 5; i++) {
        const stool = MeshBuilder.CreateCylinder(
          'bar-stool',
          { height: 0.82, diameter: 0.42, tessellation: 8 },
          scene,
        );
        stool.position.set(1.55, 0.41, z + i * 1.1);
        stool.material = dark;
        const shelf = MeshBuilder.CreateCylinder(
          'bar-bottle',
          { height: 0.5, diameter: 0.18, tessellation: 6 },
          scene,
        );
        shelf.position.set(3.45, 1.95 + (i % 2) * 0.55, z + i * 1.05);
        shelf.material = bottleGlass;
        shelf.isPickable = false;
      }
      for (const dz of [-4.5, 0, 4.5]) {
        kit.solid(
          box(scene, 'standing-table', [0.9, 1.05, 0.9], [-2.6, 0.52, z + dz], teak),
          false,
        );
        box(scene, 'standing-table-top', [1.25, 0.08, 1.25], [-2.6, 1.08, z + dz], brass);
      }
      sceneSign(scene, 'BARWAGEN', -3.7, 2.1, z, 3.4, { ink: '#ffe6a8', plate: '#5b2f1c' });
    } else {
      for (const offset of layout.seatOffsets)
        for (const x of layout.seatColumns) {
          const seat = kit.solid(
            box(scene, 'train-seat', [1.65, 0.55, 1.7], [x, 0.275, z + offset], seats),
          );
          seat.receiveShadows = true;
          kit.solid(
            box(scene, 'train-seat-back', [1.65, 1.25, 0.22], [x, 0.8, z + offset + 0.8], seats),
          );
        }
    }
    sceneSign(
      scene,
      bar ? 'BARWAGEN' : `WAGEN ${layout.carriageCentres.length - index}`,
      -2.7,
      2.1,
      z + 8.3,
      2.4,
    );
    for (const x of [-2.8, 2.8])
      kit.solid(box(scene, 'carriage-end', [2.4, 1.25, 0.35], [x, 0.625, z + 8.6], cream));
    if (z < front) box(scene, 'gangway', [2.9, 0.06, 2.4], [0, 0.02, z + 9.5], dark);
  }
  for (const z of [-layout.endWallZ, layout.endWallZ])
    kit.solid(box(scene, 'train-end-wall', [8, 4, 0.3], [0, 2, z], green));
  sceneSign(scene, 'THAILAND RAILWAY', 0, 3.5, layout.endWallZ - 0.4, 6);
  const luggage = material(scene, 'luggage', '#956ba8');
  for (const z of [-33, -14, 24, 42])
    kit.solid(box(scene, 'luggage-stack', [1.1, 0.8, 1.2], [2.5, 0.4, z], luggage));
  // Fixed landscape landmarks make the train setting readable through its open sides.
  for (let i = 0; i < 24; i++) {
    const x = (i % 2 ? 1 : -1) * (11 + (i % 4) * 3),
      z = i * 7 - 75;
    box(scene, 'thai-hut', [3, 2, 3], [x, -0.3, z], cream);
    const roof = MeshBuilder.CreateCylinder(
      'hut-roof',
      { height: 1.5, diameterBottom: 5, diameterTop: 0, tessellation: 4 },
      scene,
    );
    roof.position.set(x, 1.3, z);
    roof.material = seats;
    roof.isPickable = false;
  }
  let offset = 0;
  return {
    ...kit,
    destination: destinationRing(scene, level),
    update(delta: number) {
      offset = (offset + delta * 8) % 3;
      for (const [i, sleeper] of sleepers.entries()) sleeper.position.z = i * 3 - 80 - offset;
    },
  };
}
