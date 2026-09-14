import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import type { LevelDefinition } from '@tobi/contracts';
import { nanaPlazaLayout } from '@tobi/game-data';
import type { HavokWorld } from '../physics/havok-world.js';
import { box, material } from './materials.js';
import { destinationRing, sceneKit, sceneSign } from './scene-kit.js';

/** Three storeys of neon around a courtyard, eight poles and a disco floor that actually pulses.
 * Original low-poly geometry and invented bar names; no real venue branding is reproduced.
 */
export function createNanaPlazaScene(scene: Scene, world: HavokWorld, level: LevelDefinition) {
  const kit = sceneKit(scene, world, '#0a0d1c', {
    fogStart: 55,
    fogEnd: 150,
    ambient: 0.52,
    sun: 0.32,
  });
  const layout = nanaPlazaLayout;
  const tarmac = material(scene, 'nana-tarmac', '#2b2b33');
  const tiles = material(scene, 'nana-courtyard', '#3a3340');
  const plaster = material(scene, 'nana-plaster', '#5a4a56');
  const balcony = material(scene, 'nana-balcony', '#2a2230');
  const concrete = material(scene, 'nana-concrete', '#3c4250');
  const pole = material(scene, 'nana-pole', '#d9d2c2');
  pole.emissiveColor = Color3.FromHexString('#3a372c');
  const magenta = material(scene, 'nana-magenta', '#ff3da8');
  const cyan = material(scene, 'nana-cyan', '#3ce8ff');
  const amber = material(scene, 'nana-amber', '#ffb43c');
  const violet = material(scene, 'nana-violet', '#9a5cff');
  const neons = [magenta, cyan, amber, violet];
  for (const neon of neons) neon.emissiveColor = Color3.FromHexString('#404040');
  const windows = material(scene, 'nana-tower-window', '#ffd98a');
  windows.emissiveColor = Color3.FromHexString('#6b5222');

  kit.solid(box(scene, 'island-ground', [70, 1, 84], [0, -0.5, 0], tarmac));
  const court = layout.courtyard;
  const floor = box(
    scene,
    'nana-courtyard-floor',
    [court.maxX - court.minX, 0.06, court.maxZ - court.minZ],
    [(court.minX + court.maxX) / 2, 0.03, (court.minZ + court.maxZ) / 2],
    tiles,
  );
  floor.receiveShadows = true;
  floor.isPickable = false;
  box(scene, 'soi-four-lane', [12, 0.06, 13], [0, 0.03, -20.5], tiles).isPickable = false;

  const height = layout.storeys * layout.storeyHeight;
  const wing = (
    name: string,
    x: number,
    z: number,
    width: number,
    depth: number,
    faceZ: number,
    faceX: number,
  ): void => {
    const body = kit.solid(
      box(scene, `nana-${name}`, [width, height, depth], [x, height / 2, z], plaster),
    );
    body.receiveShadows = true;
    for (let storey = 1; storey < layout.storeys; storey++) {
      const y = storey * layout.storeyHeight;
      box(
        scene,
        'nana-balcony',
        [faceX ? 0.5 : width, 0.22, faceX ? depth : 0.5],
        [x + faceX * (width / 2 + 0.25), y, z + faceZ * (depth / 2 + 0.25)],
        balcony,
      ).isPickable = false;
      box(
        scene,
        'nana-railing',
        [faceX ? 0.14 : width, 0.95, faceX ? depth : 0.14],
        [x + faceX * (width / 2 + 0.5), y + 0.55, z + faceZ * (depth / 2 + 0.5)],
        balcony,
      ).isPickable = false;
    }
  };
  wing('wing-west', -18, 6, 8, 40, 0, 1);
  wing('wing-east', 18, 6, 8, 40, 0, -1);
  wing('wing-north', 0, 22, 44, 8, -1, 0);
  // Soi walls funnel the entrance; the courtyard is only reachable through them.
  for (const side of [-1, 1]) {
    kit.solid(
      box(scene, 'soi-wall', [16, 9, 0.6], [side * 14, 4.5, -14], concrete),
    ).receiveShadows = true;
    kit.solid(box(scene, 'soi-side', [0.6, 9, 13], [side * 6, 4.5, -20.5], concrete));
  }

  // Neon strip per storey and bar name plates, the venue's whole light identity.
  const strips: Mesh[] = [];
  for (let storey = 0; storey < layout.storeys; storey++) {
    const y = storey * layout.storeyHeight + 3.3;
    for (const [index, [x, z, w, d]] of (
      [
        [-13.6, 6, 0.2, 38],
        [13.6, 6, 0.2, 38],
        [0, 17.6, 42, 0.2],
      ] as const
    ).entries()) {
      const strip = box(scene, 'nana-neon', [w, 0.3, d], [x, y, z], neons[(storey + index) % 4]!);
      strip.isPickable = false;
      strips.push(strip);
    }
  }
  for (const [index, [name, x, z, rotation]] of (
    [
      ['MAMA KARL BAR', -13.2, -4, Math.PI / 2],
      ['GOLDEN TUK TUK', -13.2, 10, Math.PI / 2],
      ['SOI SUNSET', 13.2, -4, -Math.PI / 2],
      ['HAPPY BUFFALO', 13.2, 10, -Math.PI / 2],
      ['TOBI GO GO', 0, 17.4, 0],
    ] as const
  ).entries()) {
    const sign = sceneSign(scene, name, x, 6.4, z, 7.2, {
      ink: '#16121c',
      plate: ['#ff3da8', '#3ce8ff', '#ffb43c', '#9a5cff'][index % 4]!,
    });
    sign.rotation.y = rotation;
  }
  sceneSign(scene, 'NANA PLAZA · SOI 4', 0, 8, -14.4, 12, { ink: '#16121c', plate: '#ff3da8' });

  // Disco floor: a ring of tiles plus beams from a mirror ball, all emissive geometry.
  const dance = layout.danceFloor;
  const discoTiles: { mesh: Mesh; surface: StandardMaterial }[] = [];
  for (let ring = 1; ring <= 3; ring++)
    for (let i = 0; i < ring * 7; i++) {
      const angle = (i / (ring * 7)) * Math.PI * 2;
      const radius = (ring / 3) * dance.radius * 0.86;
      const surface = material(scene, `disco-tile-${ring}-${i}`, '#ffffff');
      const tile = MeshBuilder.CreateBox(
        'disco-tile',
        { width: 1.7, height: 0.08, depth: 1.7 },
        scene,
      );
      tile.position.set(
        dance.x + Math.sin(angle) * radius,
        0.08,
        dance.z + Math.cos(angle) * radius,
      );
      tile.rotation.y = angle;
      tile.material = surface;
      tile.isPickable = false;
      discoTiles.push({ mesh: tile, surface });
    }
  const ball = MeshBuilder.CreateSphere('mirror-ball', { diameter: 1.8, segments: 6 }, scene);
  ball.position.set(dance.x, 7.4, dance.z);
  ball.material = pole;
  const beams: Mesh[] = [];
  for (let i = 0; i < 6; i++) {
    const beam = MeshBuilder.CreateCylinder(
      'disco-beam',
      { height: 13, diameterTop: 0.25, diameterBottom: 4.4, tessellation: 10 },
      scene,
    );
    beam.material = neons[i % 4]!;
    beam.isPickable = false;
    beam.visibility = 0.22;
    beam.parent = ball;
    beam.position.set(0, -6.2, 0);
    beam.rotation.z = 0.55;
    beam.rotation.y = (i / 6) * Math.PI * 2;
    beams.push(beam);
  }

  for (const [index, spot] of layout.poles.entries()) {
    const podium = MeshBuilder.CreateCylinder(
      'gogo-podium',
      { height: 0.6, diameter: 2.6, tessellation: 12 },
      scene,
    );
    podium.position.set(spot.x, 0.3, spot.z);
    podium.material = neons[index % 4]!;
    kit.solid(podium, false);
    const bar = MeshBuilder.CreateCylinder(
      'gogo-pole',
      { height: 3.6, diameter: 0.14, tessellation: 8 },
      scene,
    );
    bar.position.set(spot.x, 2.4, spot.z);
    bar.material = pole;
    bar.isPickable = false;
  }

  for (const [index, counter] of layout.bars.entries()) {
    const alongZ = counter.z !== 16.6;
    const size: [number, number, number] = alongZ
      ? [1.3, 1.1, counter.length]
      : [counter.length, 1.1, 1.3];
    kit.solid(box(scene, 'nana-bar-counter', size, [counter.x, 0.55, counter.z], balcony), false);
    box(
      scene,
      'nana-bar-top',
      alongZ ? [1.6, 0.1, counter.length + 0.4] : [counter.length + 0.4, 0.1, 1.6],
      [counter.x, 1.14, counter.z],
      neons[index % 4]!,
    ).isPickable = false;
    for (let i = -Math.floor(counter.length / 2.2); i <= Math.floor(counter.length / 2.2); i++) {
      const stool = MeshBuilder.CreateCylinder(
        'bar-stool',
        { height: 0.85, diameter: 0.44, tessellation: 8 },
        scene,
      );
      stool.position.set(
        alongZ ? counter.x + counter.side * 1.5 : counter.x + i * 2.2,
        0.42,
        alongZ ? counter.z + i * 2.2 : counter.z + counter.side * 1.5,
      );
      stool.material = plaster;
      stool.isPickable = false;
    }
  }

  for (const tower of layout.towers) {
    const body = box(
      scene,
      'bangkok-tower',
      [tower.width, tower.height, tower.depth],
      [tower.x, tower.height / 2, tower.z],
      concrete,
    );
    body.isPickable = false;
    for (let y = 4; y < tower.height - 3; y += 3.6)
      for (let x = -tower.width / 2 + 1.8; x < tower.width / 2 - 1; x += 3) {
        const pane = box(
          scene,
          'tower-window',
          [1.5, 1.5, 0.12],
          [tower.x + x, y, tower.z - tower.depth / 2 - 0.07],
          windows,
        );
        pane.isPickable = false;
      }
  }
  // Invisible plate edge keeps the soi from leaking into the empty tarmac.
  for (const [x, z, w, d] of [
    [-30, -2, 1, 84],
    [30, -2, 1, 84],
    [0, -34, 70, 1],
    [0, 30, 70, 1],
  ] as const)
    kit.barrier(box(scene, 'plaza-boundary', [w, 10, d], [x, 5, z], concrete));

  let pulse = 0;
  return {
    ...kit,
    destination: destinationRing(scene, level),
    update(delta: number) {
      pulse += delta;
      ball.rotation.y += delta * 0.9;
      const beat = Math.abs(Math.sin(pulse * 3.4));
      for (const [index, tile] of discoTiles.entries()) {
        const wave = Math.sin(pulse * 4.6 + index * 0.6);
        const colour = neons[(index + Math.floor(pulse * 2)) % 4]!.diffuseColor;
        tile.surface.emissiveColor.set(
          colour.r * (0.2 + Math.max(0, wave) * 0.8),
          colour.g * (0.2 + Math.max(0, wave) * 0.8),
          colour.b * (0.2 + Math.max(0, wave) * 0.8),
        );
      }
      for (const [index, strip] of strips.entries())
        strip.visibility = 0.55 + Math.abs(Math.sin(pulse * 2.2 + index)) * 0.45;
      for (const [index, beam] of beams.entries())
        beam.visibility = 0.1 + beat * 0.25 * (0.5 + (index % 3) / 3);
    },
  };
}
