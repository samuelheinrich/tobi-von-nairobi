import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import type { LevelDefinition } from '@tobi/contracts';
import { zurichLayout } from '@tobi/game-data';
import type { HavokWorld } from '../physics/havok-world.js';
import { box, material } from './materials.js';
import { destinationRing, sceneKit, sceneSign } from './scene-kit.js';

/** Zurich's lake basin as an original low-poly blockout: no map data, no photographic textures.
 * Geometry comes from `zurichLayout`, the same source the level-placement test validates against.
 */
export function createParadeScene(scene: Scene, world: HavokWorld, level: LevelDefinition) {
  const kit = sceneKit(scene, world, '#151d38', {
    fogStart: 95,
    fogEnd: 260,
    ambient: 0.62,
    sun: 0.4,
    shadowMap: 1024,
  });
  const asphalt = material(scene, 'parade-road', '#4c5360');
  const promenade = material(scene, 'zurich-promenade', '#6d6a5c');
  const stone = material(scene, 'zurich-stone', '#c8bda6');
  const oldtown = material(scene, 'zurich-oldtown', '#d9b98c');
  const grand = material(scene, 'zurich-grand', '#e3d8bd');
  const copper = material(scene, 'zurich-copper', '#4f9c86');
  const roof = material(scene, 'zurich-roof', '#8a5344');
  const glass = material(scene, 'zurich-window', '#f2d777');
  glass.emissiveColor = Color3.FromHexString('#6a5320');
  const lake = material(scene, 'zuerichsee', '#1f4f76');
  lake.emissiveColor = Color3.FromHexString('#0d2438');
  lake.specularColor = Color3.FromHexString('#7fb6d8');
  const steel = material(scene, 'zurich-steel', '#8c94a0');
  const pink = material(scene, 'parade-pink', '#ef70b2');
  const cyan = material(scene, 'parade-cyan', '#58c8d1');
  const dark = material(scene, 'parade-speakers', '#283542');
  const green = material(scene, 'zurich-leaves', '#2f6f4e');
  const trunk = material(scene, 'zurich-trunk', '#4a3729');

  const ground = zurichLayout.ground;
  kit.solid(
    box(
      scene,
      'island-ground',
      [ground.maxX - ground.minX, 1, ground.maxZ - ground.minZ],
      [(ground.minX + ground.maxX) / 2, -0.5, (ground.minZ + ground.maxZ) / 2],
      asphalt,
    ),
  );
  // Painted squares and quays: decoration only, the ground plate underneath carries the physics.
  for (const strip of zurichLayout.promenades) {
    const paint = box(
      scene,
      `promenade-${strip.id}`,
      [strip.width, 0.04, strip.depth],
      [strip.x, 0.02, strip.z],
      promenade,
    );
    paint.isPickable = false;
    paint.receiveShadows = true;
  }

  const waters: Mesh[] = [];
  for (const basin of zurichLayout.water) {
    const width = basin.maxX - basin.minX,
      depth = basin.maxZ - basin.minZ;
    const centreX = (basin.minX + basin.maxX) / 2,
      centreZ = (basin.minZ + basin.maxZ) / 2;
    const surface = box(
      scene,
      `water-${basin.id}`,
      [width, 0.12, depth],
      [centreX, 0.03, centreZ],
      lake,
    );
    kit.nav(surface);
    waters.push(surface);
    // The water blocks navigation; these barriers stop Tobi walking onto the ground plate
    // underneath it, without ever catching a thrown bottle in mid-air above the shore.
    for (const [x, z, w, d] of [
      [basin.minX, centreZ, 0.4, depth],
      [basin.maxX, centreZ, 0.4, depth],
      [centreX, basin.minZ, width, 0.4],
      [centreX, basin.maxZ, width, 0.4],
    ] as const)
      kit.barrier(box(scene, `quay-${basin.id}`, [w, 2.6, d], [x, 1.3, z], stone));
  }
  for (const bridge of zurichLayout.bridges) {
    const width = bridge.maxX - bridge.minX,
      depth = bridge.maxZ - bridge.minZ;
    const centreX = (bridge.minX + bridge.maxX) / 2,
      centreZ = (bridge.minZ + bridge.maxZ) / 2;
    // The deck is paint on the ground plate, not a raised slab: a 25 cm lip stops the
    // character controller dead at both bridgeheads.
    const deck = box(
      scene,
      `bridge-${bridge.id}`,
      [width, 0.1, depth],
      [centreX, 0.02, centreZ],
      stone,
    );
    deck.isPickable = false;
    deck.receiveShadows = true;
    for (const side of [bridge.minZ, bridge.maxZ]) {
      const rail = kit.solid(
        box(scene, `bridge-rail-${bridge.id}`, [width, 1.05, 0.3], [centreX, 0.75, side], steel),
        false,
      );
      rail.receiveShadows = true;
    }
  }

  const facade = (style: string): StandardMaterial =>
    style === 'oldtown' ? oldtown : style === 'grand' ? grand : style === 'shed' ? steel : stone;
  for (const block of zurichLayout.blocks) {
    const body = kit.solid(
      box(
        scene,
        `zurich-${block.id}`,
        [block.width, block.height, block.depth],
        [block.x, block.height / 2, block.z],
        facade(block.style),
      ),
    );
    body.receiveShadows = true;
    const hat = MeshBuilder.CreateCylinder(
      `roof-${block.id}`,
      {
        height: block.style === 'church' ? 3.4 : 2.2,
        diameterTop: 0,
        diameterBottom: Math.max(block.width, block.depth) * 1.24,
        tessellation: 4,
      },
      scene,
    );
    hat.rotation.y = Math.PI / 4;
    hat.position.set(block.x, block.height + (block.style === 'church' ? 1.7 : 1.1), block.z);
    hat.material = block.style === 'church' ? copper : roof;
    hat.isPickable = false;
    kit.shadows.addShadowCaster(hat);
    for (let row = 2; row < block.height - 1.5; row += 3.4)
      for (let offset = -block.width / 2 + 1.6; offset < block.width / 2 - 1; offset += 2.6) {
        const pane = box(
          scene,
          `zurich-window-${block.id}`,
          [1.1, 1.4, 0.1],
          [block.x + offset, row, block.z - block.depth / 2 - 0.06],
          glass,
        );
        pane.isPickable = false;
      }
    if (block.label)
      sceneSign(scene, block.label, block.x, 1.9, block.z - block.depth / 2 - 0.12, 5.4);
  }
  for (const tower of zurichLayout.towers) {
    kit.solid(
      box(
        scene,
        `zurich-${tower.id}`,
        [tower.width, tower.height, tower.depth],
        [tower.x, tower.height / 2, tower.z],
        stone,
      ),
    );
    const spire = MeshBuilder.CreateCylinder(
      `spire-${tower.id}`,
      { height: 6, diameterTop: 0, diameterBottom: tower.width * 1.3, tessellation: 4 },
      scene,
    );
    spire.rotation.y = Math.PI / 4;
    spire.position.set(tower.x, tower.height + 3, tower.z);
    spire.material = copper;
    spire.isPickable = false;
  }

  const speakers: Mesh[] = [];
  for (const [index, truck] of zurichLayout.loveMobiles.entries()) {
    const colour = index % 2 ? cyan : pink;
    kit.solid(
      box(
        scene,
        `love-mobile-${truck.id}`,
        [truck.width, truck.height, truck.depth],
        [truck.x, truck.height / 2, truck.z],
        colour,
      ),
    );
    for (const dz of [-truck.depth / 2 + 1.4, truck.depth / 2 - 1.4]) {
      box(
        scene,
        'speaker-stack',
        [truck.width * 0.75, 2.4, 1.8],
        [truck.x, truck.height + 1.2, truck.z + dz],
        dark,
      );
      for (const dy of [truck.height + 0.6, truck.height + 1.8]) {
        const cone = MeshBuilder.CreateSphere(
          'speaker-cone',
          { diameter: 0.8, segments: 8 },
          scene,
        );
        cone.scaling.x = 0.16;
        cone.position.set(truck.x - truck.width / 2 - 0.04, dy, truck.z + dz);
        cone.material = colour;
        cone.isPickable = false;
        speakers.push(cone);
      }
    }
    sceneSign(
      scene,
      truck.id.replace(/_/g, ' ').toUpperCase(),
      truck.x,
      truck.height + 2.9,
      truck.z,
      5.4,
      { ink: '#12202c', plate: index % 2 ? '#58c8d1' : '#ef70b2' },
    );
  }

  // Tram rails on Bahnhofstrasse and along Bellevue, the two lines every Zuercher recognises.
  for (const dx of [-1.6, 1.6])
    box(scene, 'tram-track', [0.1, 0.03, 44], [-34 + dx, 0.05, 21], steel);
  for (const dz of [-1.6, 1.6])
    box(scene, 'tram-track', [15, 0.03, 0.1], [22.5, 0.05, -1 + dz], steel);

  const tree = (x: number, z: number, height: number): void => {
    const stem = MeshBuilder.CreateCylinder(
      'quay-tree',
      { height, diameter: 0.5, tessellation: 6 },
      scene,
    );
    stem.position.set(x, height / 2, z);
    stem.material = trunk;
    stem.isPickable = false;
    const crown = MeshBuilder.CreateSphere('quay-crown', { diameter: 4.4, segments: 5 }, scene);
    crown.scaling.y = 0.8;
    crown.position.set(x, height + 1.4, z);
    crown.material = green;
    crown.isPickable = false;
    kit.shadows.addShadowCaster(crown);
  };
  for (const z of [-46, -38, -22, -14]) tree(25.6, z, 5.5);
  for (const z of [-42, -34, -22, -16]) tree(-38.5, z, 5.5);
  for (const z of [2, 12, 26, 38]) tree(-28.5, z, 5);
  for (const [x, z] of [
    [30, -50],
    [40, -52],
    [46, -46],
    [38, -44],
  ] as const)
    tree(x, z, 6);

  // Invisible plate edge: the blockout ends here, the silhouettes beyond are painted scenery.
  for (const [x, z, w, d] of [
    [ground.minX, 0, 1, ground.maxZ - ground.minZ],
    [ground.maxX, 0, 1, ground.maxZ - ground.minZ],
    [0, ground.minZ, ground.maxX - ground.minX, 1],
    [0, ground.maxZ, ground.maxX - ground.minX, 1],
  ] as const)
    kit.barrier(box(scene, 'city-boundary', [w, 9, d], [x, 4.5, z], stone));
  const hill = MeshBuilder.CreateCylinder(
    'uetliberg',
    { height: 30, diameterTop: 8, diameterBottom: 80, tessellation: 7 },
    scene,
  );
  hill.position.set(-92, 12, 14);
  hill.material = green;
  hill.isPickable = false;
  for (const [x, z, h] of [
    [-30, -104, 44],
    [10, -112, 52],
    [54, -100, 38],
  ] as const) {
    const alp = MeshBuilder.CreateCylinder(
      'alpen-silhouette',
      { height: h, diameterTop: 0, diameterBottom: h * 1.5, tessellation: 5 },
      scene,
    );
    alp.position.set(x, h / 2 - 6, z);
    alp.material = stone;
    alp.isPickable = false;
  }

  sceneSign(scene, 'UTOQUAI · START', 21, 3.2, -49, 9);
  sceneSign(scene, 'QUAIBRUECKE', -5, 3.4, -1.6, 9, { ink: '#12202c', plate: '#e3d8bd' });
  sceneSign(scene, 'BUERKLIPLATZ', -32, 3.2, -13.6, 8);
  sceneSign(scene, 'HAFENDAMM ENGE · BACKSTAGE', -40, 3.4, -49.6, 10);

  let pulse = 0;
  return {
    ...kit,
    destination: destinationRing(scene, level),
    update(delta: number) {
      pulse += delta;
      const beat = 0.5 + Math.abs(Math.sin(pulse * 3.1)) * 0.5;
      pink.emissiveColor.set(beat * 0.55, beat * 0.12, beat * 0.34);
      cyan.emissiveColor.set(beat * 0.1, beat * 0.42, beat * 0.48);
      for (const [index, cone] of speakers.entries())
        cone.scaling.x = 0.16 + Math.abs(Math.sin(pulse * 6 + index)) * 0.09;
      for (const [index, basin] of waters.entries())
        basin.position.y = 0.03 + Math.sin(pulse * 0.9 + index) * 0.015;
    },
  };
}
