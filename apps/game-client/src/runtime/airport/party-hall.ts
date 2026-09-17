import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { HavokWorld } from '../physics/havok-world.js';
import { createNpc, npcPalette } from '../levels/npc-kit.js';
import { box, material } from '../levels/materials.js';
import { sceneSign } from '../levels/scene-kit.js';

export interface AirportPartyHall {
  readonly root: TransformNode;
  readonly destination: Readonly<{ x: number; y: number; z: number }>;
  update(delta: number): void;
}

/** A fully traversable terminal venue. Motion is emissive geometry, keeping the light show cheap. */
export function createAirportPartyHall(scene: Scene, world: HavokWorld): AirportPartyHall {
  const root = new TransformNode('airport-party-hall', scene);
  const black = material(scene, 'terminal-club-black', '#11131a');
  const steel = material(scene, 'terminal-club-steel', '#454b59');
  const pink = material(scene, 'terminal-club-pink', '#ff3fa4');
  const cyan = material(scene, 'terminal-club-cyan', '#21d9ff');
  const lime = material(scene, 'terminal-club-lime', '#a8ff42');
  const violet = material(scene, 'terminal-club-violet', '#984cff');
  pink.emissiveColor = Color3.FromHexString('#b21c70');
  cyan.emissiveColor = Color3.FromHexString('#087a9c');
  lime.emissiveColor = Color3.FromHexString('#547f18');
  violet.emissiveColor = Color3.FromHexString('#53218d');
  const animated: {
    mesh: ReturnType<typeof box>;
    phase: number;
    kind: 'tile' | 'laser' | 'scan';
  }[] = [];
  const solid = (
    name: string,
    size: [number, number, number],
    position: [number, number, number],
    surface = black,
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
    surface = black,
  ) => {
    const mesh = box(scene, name, size, position, surface);
    mesh.parent = root;
    mesh.isPickable = false;
    return mesh;
  };

  // The west wall has a broad central opening: the hall is entered from the arrivals concourse.
  solid('party-hall-floor', [56, 0.16, 76], [232, 0.12, 1498], black);
  solid('party-hall-north-wall', [56, 8, 0.35], [232, 4, 1460], steel);
  solid('party-hall-south-wall', [56, 8, 0.35], [232, 4, 1536], steel);
  solid('party-hall-east-wall', [0.35, 8, 76], [260, 4, 1498], steel);
  for (const z of [1471, 1525]) solid('party-hall-west-wall', [0.35, 8, 22], [204, 4, z], steel);
  prop('party-hall-open-roof', [56, 0.2, 76], [232, 8, 1498], black).visibility = 0.7;

  const sign = sceneSign(scene, 'FINAL CALL · ARRIVALS RAVE', 204.2, 6.6, 1498, 12, {
    plate: '#55133e',
    ink: '#ffd8f1',
  });
  sign.rotation.y = Math.PI / 2;
  sign.parent = root;

  // Two airport-style scanner arches provide the visual threshold into the party.
  for (const z of [1490, 1506]) {
    for (const dz of [-2.1, 2.1])
      solid('party-scanner-post', [0.45, 3.4, 0.45], [208, 1.7, z + dz], steel);
    solid('party-scanner-header', [0.45, 0.45, 4.65], [208, 3.4, z], steel);
    const sweep = prop('party-scanner-sweep', [0.08, 2.7, 4], [207.75, 1.55, z], cyan);
    animated.push({ mesh: sweep, phase: z, kind: 'scan' });
  }

  // Checkerboard dance floor, bar and a raised DJ stage are all physical and traversable.
  const tiles = [pink, cyan, lime, violet];
  let tileIndex = 0;
  for (let x = 214; x <= 244; x += 5)
    for (let z = 1472; z <= 1522; z += 5) {
      const tile = prop(
        'party-dance-tile',
        [4.75, 0.05, 4.75],
        [x, 0.23, z],
        tiles[tileIndex % tiles.length],
      );
      animated.push({ mesh: tile, phase: tileIndex * 0.47, kind: 'tile' });
      tileIndex++;
    }
  solid('party-dj-stage', [12, 0.65, 16], [253.5, 0.48, 1498], steel);
  solid('party-dj-booth', [2.2, 1.25, 12], [250, 1.1, 1498], black);
  for (const z of [1494, 1502]) {
    const deck = MeshBuilder.CreateCylinder(
      'party-dj-deck',
      { diameter: 1.3, height: 0.18, tessellation: 20 },
      scene,
    );
    deck.rotation.z = Math.PI / 2;
    deck.position.set(248.85, 1.85, z);
    deck.material = cyan;
    deck.parent = root;
  }
  for (const z of [1470, 1526]) {
    solid('party-terminal-bar', [16, 1.1, 2.5], [230, 0.67, z], black);
    for (let x = 224; x <= 236; x += 3)
      prop('party-bar-bottle', [0.22, 0.65, 0.22], [x, 1.55, z], x % 2 ? pink : cyan);
  }

  // Lasers are thin emissive prisms rather than dynamic lights. They rotate and pulse above heads.
  for (let i = 0; i < 12; i++) {
    const z = 1468 + (i % 6) * 12;
    const laser = prop(
      'party-laser',
      [0.06, 0.06, 44],
      [232, 5.6 + (i % 3) * 0.45, z],
      tiles[i % tiles.length],
    );
    laser.rotation.y = i * 0.43;
    animated.push({ mesh: laser, phase: i * 0.8, kind: 'laser' });
  }
  for (const x of [212, 224, 236, 248])
    for (const z of [1464, 1532]) {
      const scanner = MeshBuilder.CreateCylinder(
        'party-moving-head',
        { diameter: 0.75, height: 0.65, tessellation: 12 },
        scene,
      );
      scanner.position.set(x, 6.7, z);
      scanner.material = steel;
      scanner.parent = root;
    }

  // Two distinct DJs plus dancers make the room read as a destination, not empty scenery.
  for (const [index, z] of [1495.5, 1500.5].entries()) {
    const dj = createNpc(scene, `airport-party-dj-${index}`, npcPalette(scene, 20 + index), null);
    dj.root.position.set(254, 0.8, z);
    dj.root.rotation.y = -Math.PI / 2;
    dj.root.parent = root;
    dj.gesture('dance');
  }
  for (let i = 0; i < 8; i++) {
    const guest = createNpc(scene, `airport-party-guest-${i}`, npcPalette(scene, 40 + i), null);
    guest.root.position.set(216 + (i % 5) * 6, 0.2, 1478 + Math.floor(i / 5) * 13 + (i % 2) * 2);
    guest.root.rotation.y = (i * 1.73) % (Math.PI * 2);
    guest.root.parent = root;
    guest.gesture(i % 4 === 0 ? 'cheer' : 'dance');
  }

  let time = 0;
  return {
    root,
    destination: { x: 244, y: 0.8, z: 1498 },
    update(delta) {
      if (!root.isEnabled()) return;
      time += delta;
      for (const item of animated) {
        if (item.kind === 'laser') {
          item.mesh.rotation.y += delta * (0.28 + (item.phase % 3) * 0.08);
          item.mesh.visibility = 0.32 + 0.35 * (0.5 + Math.sin(time * 3 + item.phase) * 0.5);
        } else if (item.kind === 'scan') {
          item.mesh.position.y = 1.55 + Math.sin(time * 2.5 + item.phase) * 1.05;
          item.mesh.visibility = 0.45;
        } else {
          item.mesh.visibility = 0.58 + Math.sin(time * 4 + item.phase) * 0.32;
        }
      }
    },
  };
}
