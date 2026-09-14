import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { LevelDefinition } from '@tobi/contracts';
import type { HavokWorld } from '../physics/havok-world.js';
import { box, material } from './materials.js';
import { destinationRing, sceneKit, sceneSign } from './scene-kit.js';

/** One cell, one corridor, no way out. The only interaction left is the bunk that ends the run. */
export function createCellScene(scene: Scene, world: HavokWorld, level: LevelDefinition) {
  const kit = sceneKit(scene, world, '#0d1014', {
    fogStart: 18,
    fogEnd: 46,
    ambient: 0.58,
    sun: 0.24,
    shadowMap: 512,
  });
  const concrete = material(scene, 'cell-concrete', '#6a6a63');
  const wall = material(scene, 'cell-wall', '#7d7b70');
  const steel = material(scene, 'cell-steel', '#9aa0a6');
  const bunk = material(scene, 'cell-bunk', '#4a5560');
  const blanket = material(scene, 'cell-blanket', '#a3563f');
  const porcelain = material(scene, 'cell-porcelain', '#d8d8d2');
  const lamp = material(scene, 'cell-lamp', '#ffe9b0');
  lamp.emissiveColor = Color3.FromHexString('#6d5c2c');

  kit.solid(box(scene, 'island-ground', [24, 1, 20], [2, -0.5, 0], concrete));
  // Cell shell: three closed sides, a barred fourth side towards the corridor.
  kit.solid(box(scene, 'cell-wall-west', [0.3, 3, 7.3], [-2.65, 1.5, 0], wall));
  kit.solid(box(scene, 'cell-wall-north', [5.6, 3, 0.3], [-0.15, 1.5, 3.65], wall));
  kit.solid(box(scene, 'cell-wall-south', [5.6, 3, 0.3], [-0.15, 1.5, -3.65], wall));
  kit.solid(box(scene, 'cell-ceiling', [5.6, 0.25, 7.6], [-0.15, 3.1, 0], wall));
  for (let i = 0; i <= 18; i++) {
    const bar = MeshBuilder.CreateCylinder(
      'cell-bar',
      { height: 3, diameter: 0.09, tessellation: 6 },
      scene,
    );
    bar.position.set(2.5, 1.5, -3.6 + i * 0.4);
    bar.material = steel;
    kit.solid(bar);
  }
  for (const y of [0.35, 2.7])
    kit.solid(box(scene, 'cell-bar-rail', [0.12, 0.12, 7.2], [2.5, y, 0], steel));
  // High window: barred, useless, and the only daylight in the level.
  box(scene, 'cell-window', [1.4, 0.7, 0.12], [-0.15, 2.4, 3.52], lamp);
  for (const x of [-0.6, -0.15, 0.3])
    box(scene, 'cell-window-bar', [0.07, 0.75, 0.16], [x, 2.4, 3.46], steel);

  // The bunk has no body of its own: walking into the corner is enough to lie down.
  const frame = box(scene, 'cell-bunk-frame', [2.2, 0.36, 2.4], [-1.4, 0.18, -2.2], bunk);
  frame.isPickable = false;
  const mattress = box(scene, 'cell-mattress', [2.1, 0.18, 2.3], [-1.4, 0.44, -2.2], blanket);
  mattress.isPickable = false;
  box(scene, 'cell-pillow', [0.5, 0.16, 1.4], [-2.1, 0.6, -2.2], porcelain).isPickable = false;

  const bowl = MeshBuilder.CreateCylinder(
    'cell-toilet',
    { height: 0.42, diameterTop: 0.52, diameterBottom: 0.38, tessellation: 10 },
    scene,
  );
  bowl.position.set(1.55, 0.21, 2.7);
  bowl.material = porcelain;
  kit.solid(box(scene, 'cell-cistern', [0.6, 0.5, 0.25], [1.55, 0.75, 3.2], porcelain), false);
  kit.solid(box(scene, 'cell-table', [1.1, 0.08, 0.7], [1.5, 0.72, -2.6], bunk), false);
  for (const dx of [-0.45, 0.45])
    box(scene, 'cell-table-leg', [0.08, 0.72, 0.08], [1.5 + dx, 0.36, -2.6], steel);
  const stool = MeshBuilder.CreateCylinder(
    'cell-stool',
    { height: 0.46, diameter: 0.4, tessellation: 8 },
    scene,
  );
  stool.position.set(0.9, 0.23, -1.6);
  stool.material = steel;

  const bulb = MeshBuilder.CreateSphere('cell-bulb', { diameter: 0.32, segments: 6 }, scene);
  bulb.position.set(-0.15, 2.75, 0);
  bulb.material = lamp;

  // Corridor beyond the bars: the guard's territory, permanently out of reach.
  kit.solid(box(scene, 'corridor-far-wall', [0.3, 3.4, 14], [7.4, 1.7, 0], wall));
  kit.solid(box(scene, 'corridor-end-north', [10, 3.4, 0.3], [4.5, 1.7, 6.9], wall));
  kit.solid(box(scene, 'corridor-end-south', [10, 3.4, 0.3], [4.5, 1.7, -6.9], wall));
  box(scene, 'corridor-door', [0.14, 2.2, 1.1], [7.3, 1.1, 5.4], steel);
  box(scene, 'corridor-bench', [0.5, 0.1, 2.2], [6.8, 0.5, -4], bunk);

  const graffiti = sceneSign(scene, 'KARL WAR HIER', -2.45, 1.7, -0.4, 2.6, {
    ink: '#c8c2ad',
    plate: '#5f5e56',
  });
  graffiti.rotation.y = Math.PI / 2;
  const tally = sceneSign(scene, 'TAG 1', -2.45, 1.7, 1.9, 1.6, {
    ink: '#c8c2ad',
    plate: '#5f5e56',
  });
  tally.rotation.y = Math.PI / 2;
  sceneSign(scene, 'AUSNUECHTERUNGSZELLE 3', -0.15, 2.9, -3.48, 4.4);

  let flicker = 0;
  return {
    ...kit,
    destination: destinationRing(scene, level),
    update(delta: number) {
      flicker += delta;
      const glow = 0.32 + Math.abs(Math.sin(flicker * 1.7) * Math.sin(flicker * 0.6)) * 0.22;
      lamp.emissiveColor.set(glow, glow * 0.86, glow * 0.55);
    },
  };
}
