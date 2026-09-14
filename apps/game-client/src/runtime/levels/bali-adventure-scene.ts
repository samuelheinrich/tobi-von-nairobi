import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { LevelDefinition } from '@tobi/contracts';
import { baliAdventureLayout as layout, baliGroundAt } from '@tobi/game-data';
import type { HavokWorld } from '../physics/havok-world.js';
import { box, material } from './materials.js';
import { destinationRing, sceneKit, sceneSign } from './scene-kit.js';
import { palm, parasol } from './scenery.js';

/** One physically connected coastal district: beach -> market elbow -> old-town escape alleys. */
export function createBaliAdventureScene(scene: Scene, world: HavokWorld, level: LevelDefinition) {
  const kit = sceneKit(scene, world, '#e9b8af', { fogStart: 100, fogEnd: 250 });
  const sand = material(scene, 'coast-sand', '#e8c893');
  const water = material(scene, 'coast-water', '#279eae');
  const foam = material(scene, 'coast-foam', '#b3e6d7');
  const rock = material(scene, 'coast-stone', '#8e967d');
  const wood = material(scene, 'coast-wood', '#84543f');
  const leaves = material(scene, 'coast-leaves', '#44865e');
  const pink = material(scene, 'coast-pink', '#ed7b8f');
  const teal = material(scene, 'coast-teal', '#4cafa1');
  const gold = material(scene, 'market-lamp', '#ffda80');
  gold.emissiveColor.set(0.7, 0.45, 0.15);
  const road = material(scene, 'coast-road', '#af9f87');
  box(scene, 'infinite-ocean', [900, 0.2, 900], [0, -0.8, 20], water);
  for (const r of layout.ground)
    kit.solid(
      box(
        scene,
        'island-ground',
        [r.maxX - r.minX, 1.6, r.maxZ - r.minZ],
        [(r.maxX + r.minX) / 2, -0.8, (r.maxZ + r.minZ) / 2],
        sand,
      ),
      false,
    );
  // Boundary follows the union outline. Visible quays, bamboo fences and rock faces seal it.
  const edges = new Map<string, [number, number, number, number]>();
  const edge = (x1: number, z1: number, x2: number, z2: number) => {
    const key = `${Math.min(x1, x2)},${Math.min(z1, z2)},${Math.max(x1, x2)},${Math.max(z1, z2)}`;
    if (edges.has(key)) edges.delete(key);
    else edges.set(key, [x1, z1, x2, z2]);
  };
  for (let x = -40; x < 56; x += 8)
    for (let z = -48; z < 88; z += 8) {
      if (!baliGroundAt(x + 4, z + 4)) {
        // These invisible navigation rectangles represent water only, never a hidden walkable slab.
        const noWalk = box(scene, 'ocean-navigation', [8, 3, 8], [x + 4, 1.5, z + 4], water);
        kit.nav(noWalk);
        noWalk.isVisible = false;
        noWalk.metadata = { ...noWalk.metadata, navigationObstacle: true, sightObstacle: false };
        continue;
      }
      edge(x, z, x + 8, z);
      edge(x + 8, z, x + 8, z + 8);
      edge(x + 8, z + 8, x, z + 8);
      edge(x, z + 8, x, z);
    }
  for (const [x1, z1, x2, z2] of edges.values()) {
    const x = (x1 + x2) / 2,
      z = (z1 + z2) / 2,
      horizontal = z1 === z2;
    const size: [number, number, number] = horizontal ? [8, 3.2, 0.45] : [0.45, 3.2, 8];
    const boundary = kit.solid(box(scene, 'bamboo-coast-fence', size, [x, 1.6, z], wood), false);
    boundary.visibility = 0.38;
    kit.solid(
      box(scene, 'quay-rock', horizontal ? [8, 0.9, 1.2] : [1.2, 0.9, 8], [x, 0.1, z], rock),
      false,
    );
    box(scene, 'shore-foam', horizontal ? [8, 0.04, 2.4] : [2.4, 0.04, 8], [x, -0.45, z], foam);
    for (const t of [-3, 0, 3])
      box(
        scene,
        'bamboo-post',
        [0.16, 3.2, 0.16],
        [x + (horizontal ? t : 0), 1.6, z + (horizontal ? 0 : t)],
        wood,
      );
  }
  // Beach bar and proper sandy forecourt, bathing coast and chairs.
  kit.solid(box(scene, 'karls-beach-counter', [11, 1.2, 2.5], [-20, 0.6, -40], wood), false);
  box(scene, 'beach-bar-roof', [14, 0.28, 5], [-20, 3.5, -41], pink);
  for (const x of [-26, -14])
    kit.solid(box(scene, 'bar-post', [0.25, 3.5, 0.25], [x, 1.75, -41], wood), false);
  sceneSign(scene, 'KARLS BEACH BAR', -20, 2.7, -38.6, 9);
  for (const x of [-32, -22, -12, 0]) {
    parasol(scene, x, -23, x % 3 ? pink : teal, wood, kit.shadows);
    palm(scene, x, -44, 7, wood, leaves, kit.shadows);
  }
  for (let i = 0; i < 8; i++)
    box(scene, 'bar-bottle-display', [0.25, 0.7, 0.25], [-24 + i * 1.1, 1.55, -40], teal);
  sceneSign(scene, 'ZUM NIGHT MARKET', 4, 3, -17, 7);
  box(scene, 'market-link-road', [6, 0.025, 27], [3, 0.02, -4], road);
  // An east-facing market street creates the L turn. Lamps carry the night-market identity.
  box(scene, 'market-road', [60, 0.03, 7], [22, 0.025, 14], road);
  for (const x of [0, 10, 20, 30, 50])
    for (const z of [22, 33]) {
      kit.solid(box(scene, 'coast-market-stall', [5, 1.4, 3], [x, 0.7, z], wood), false);
      box(scene, 'coast-market-awning', [6, 0.2, 4], [x, 2.9, z], z === 22 ? teal : pink);
      for (const dx of [-1.5, 0, 1.5])
        box(scene, 'fruit-crate', [0.8, 0.4, 1.5], [x + dx, 1.55, z], gold);
    }
  // A break in the eastern stalls provides a continuous northward road to the escape quarter.
  // Stalls straddle X=40 but their depth ends before the route crossing at Z=26.
  for (const z of [10, 26, 38]) {
    box(scene, 'lantern-wire', [58, 0.04, 0.04], [24, 4.6, z], wood);
    for (let x = -3; x < 53; x += 4) {
      const lamp = MeshBuilder.CreateSphere(
        'coast-market-lantern',
        { diameter: 0.5, segments: 5 },
        scene,
      );
      lamp.position.set(x, 4.4, z);
      lamp.material = gold;
      lamp.isPickable = false;
    }
  }
  sceneSign(scene, 'NIGHT MARKET / KONTO LEER', 22, 4.8, 8.7, 12);
  // Narrow old-town streets, T junctions and back alleys provide sight-breaking escape routes.
  const colors = ['#efae8e', '#e6c27a', '#78aaa2', '#bd99ad'];
  for (const [i, h] of layout.buildings.entries()) {
    const wall = material(scene, `coast-house-${i}`, colors[i % colors.length]!);
    kit.solid(box(scene, 'escape-building', [h.w, 4.8, h.d], [h.x, 2.4, h.z], wall));
    box(scene, 'escape-roof', [h.w + 0.6, 0.5, h.d + 0.6], [h.x, 5, h.z], wood);
    box(scene, 'escape-door', [1.3, 2.5, 0.1], [h.x, 1.25, h.z - h.d / 2 - 0.06], teal);
    for (const dx of [-1.8, 1.8])
      box(scene, 'escape-window', [1.1, 1.2, 0.1], [h.x + dx, 2.8, h.z - h.d / 2 - 0.08], gold);
  }
  sceneSign(scene, 'ALTSTADT / CASA TOBI', 40, 4, 39, 9);
  kit.solid(box(scene, 'coast-casa', [8, 4, 6], [4, 2, 83], teal));
  sceneSign(scene, 'CASA TOBI', 4, 3.2, 79.9, 6);
  // Distant islands fill the horizon; all playable edges meet ocean or visible scenery.
  for (const [x, z] of [
    [-100, 80],
    [110, -30],
    [100, 150],
  ]) {
    const island = MeshBuilder.CreateSphere('distant-island', { diameter: 1, segments: 5 }, scene);
    island.scaling.set(75, 20, 50);
    island.position.set(x!, 0, z!);
    island.material = leaves;
  }
  let time = 0;
  return {
    ...kit,
    destination: destinationRing(scene, level),
    update(delta: number) {
      time += delta;
      water.diffuseColor = Color3.FromHexString('#279eae').scale(1 + Math.sin(time * 0.5) * 0.04);
    },
  };
}
