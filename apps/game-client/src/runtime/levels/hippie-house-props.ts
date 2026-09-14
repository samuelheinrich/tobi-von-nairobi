import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { hippieHouseLayout } from '@tobi/game-data';
import { box, material, cylinderBetween } from './materials.js';

/** Original low-poly WG furniture, away from the door and central pickup in every room. */
export function houseProps(scene: Scene, floor: number, x: number, z: number, room: number): void {
  const y = floor * hippieHouseLayout.floorHeight;
  const wood = scene.getMaterialByName('wg-wood') ?? material(scene, 'wg-wood', '#926842');
  const leaf = scene.getMaterialByName('wg-leaf') ?? material(scene, 'wg-leaf', '#5a996a');
  const coral = scene.getMaterialByName('wg-coral') ?? material(scene, 'wg-coral', '#db9274');
  const textiles = ['#bc83ab', '#dba456', '#64a6a2'];
  const cloth = material(scene, `wg-cloth-${floor}-${room}`, textiles[(room + floor) % 3]!);
  const rug = MeshBuilder.CreateCylinder(
    'woven-round-rug',
    { diameter: 5.5, height: 0.03, tessellation: 20 },
    scene,
  );
  rug.position.set(x, y + 0.025, z);
  rug.material = cloth;
  for (const diameter of [3.5, 4.5, 5.2]) {
    const ring = MeshBuilder.CreateTorus(
      'rug-weave',
      { diameter, thickness: 0.045, tessellation: 24 },
      scene,
    );
    ring.position.set(x, y + 0.05, z);
    ring.material = coral;
  }
  // Low furniture remains decorative so it never traps a player in a narrow furnished room.
  const outer = x + Math.sign(x) * 3;
  const style = floor === 2 && room === 0 ? 0 : (room + floor) % 3;
  if (style === 0) {
    box(scene, 'pallet-bed', [3, 0.25, 2], [outer, y + 0.2, z + 2.5], wood);
    box(scene, 'patchwork-mattress', [2.8, 0.3, 1.9], [outer, y + 0.47, z + 2.5], cloth);
    box(scene, 'pillow', [0.7, 0.22, 1.6], [outer + 0.8, y + 0.73, z + 2.5], coral);
  } else if (style === 1) {
    box(scene, 'communal-table', [2.5, 0.15, 1.8], [outer, y + 0.8, z + 2.5], wood);
    for (const dx of [-0.9, 0.9])
      box(scene, 'table-leg', [0.18, 0.8, 1.3], [outer + dx, y + 0.4, z + 2.5], wood);
    for (const dz of [-1.6, 1.6])
      box(scene, 'floor-cushion', [1, 0.25, 0.9], [outer, y + 0.15, z + 2.5 + dz], cloth);
  } else {
    for (const dz of [-0.5, 0.6])
      box(scene, 'yoga-mat', [3, 0.05, 0.85], [outer, y + 0.05, z + 2.5 + dz], cloth);
    box(scene, 'vinyl-shelf', [0.5, 1.5, 2.5], [outer + Math.sign(x), y + 0.75, z - 2], wood);
    for (let i = 0; i < 8; i++)
      box(
        scene,
        'record-sleeve',
        [0.55, 0.6, 0.12],
        [outer + Math.sign(x), y + 0.7, z - 3 + i * 0.27],
        i % 2 ? cloth : coral,
      );
  }
  const pot = MeshBuilder.CreateCylinder(
    'terracotta-pot',
    { height: 0.5, diameterTop: 0.65, diameterBottom: 0.4, tessellation: 8 },
    scene,
  );
  pot.position.set(outer, y + 0.25, z - 3);
  pot.material = coral;
  box(scene, 'peace-tapestry', [2.3, 2.2, 0.04], [outer, y + 1.4, z + 4.82], cloth);
  const peace = MeshBuilder.CreateTorus(
    'peace-circle',
    { diameter: 1.35, thickness: 0.06, tessellation: 24 },
    scene,
  );
  peace.rotation.x = Math.PI / 2;
  peace.position.set(outer, y + 1.4, z + 4.77);
  peace.material = coral;
  for (const [dx, dy] of [
    [0, 0.67],
    [0, -0.67],
    [-0.47, -0.47],
    [0.47, -0.47],
  ])
    cylinderBetween(
      scene,
      'peace-lines',
      new Vector3(outer, y + 1.4, z + 4.77),
      new Vector3(outer + dx!, y + 1.4 + dy!, z + 4.77),
      0.055,
      coral,
    );
  for (const side of [-1, 0, 1]) {
    const plant = MeshBuilder.CreateSphere('houseplant', { diameter: 0.9, segments: 6 }, scene);
    plant.scaling.set(0.65, 1.3, 0.65);
    plant.position.set(outer + side * 0.22, y + 1 + Math.abs(side) * 0.15, z - 3);
    plant.rotation.z = side * 0.4;
    plant.material = leaf;
  }
}
