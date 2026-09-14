import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { LevelDefinition, Position3 } from '@tobi/contracts';
import { aircraftLayout as layout } from '@tobi/game-data';
import type { HavokWorld } from '../physics/havok-world.js';
import { box, material } from './materials.js';
import { destinationRing, sceneKit, sceneSign } from './scene-kit.js';
import { createNpc, npcPalette } from './npc-kit.js';

/** Two full passenger decks, two aisles, front/rear stairs and moving clouds.
 * The cutaway changes visibility only; both physical decks remain present at all times.
 */
export function createAircraftScene(scene: Scene, world: HavokWorld, level: LevelDefinition) {
  const kit = sceneKit(scene, world, '#83bbdf', { fogStart: 100, fogEnd: 220, sun: 0.45 });
  const cream = material(scene, 'cabin-ivory', '#e6e2d8');
  const navy = material(scene, 'cabin-navy', '#254460');
  const carpet = material(scene, 'cabin-carpet', '#697c8b');
  const brass = material(scene, 'cabin-brass', '#cfa96e');
  const white = material(scene, 'cloud-white', '#f8fcff');
  const glass = material(scene, 'cabin-windows', '#92d4ff');
  glass.emissiveColor.set(0.25, 0.45, 0.65);
  const green = material(scene, 'free-seat-green', '#69c5a9');
  const groups: { floor: number; meshes: Mesh[] }[] = [];
  const physical = (
    name: string,
    size: [number, number, number],
    at: [number, number, number],
    mat = cream,
  ) => kit.solid(box(scene, name, size, at, mat), false);
  // Visible lower fuselage, wings and four engines establish the aircraft from the open cutaway.
  const hull = MeshBuilder.CreateSphere('a380-fuselage', { diameter: 1, segments: 20 }, scene);
  hull.scaling.set(17, 6, 106);
  hull.position.y = -3.4;
  hull.material = cream;
  hull.isPickable = false;
  for (const side of [-1, 1]) {
    const wing = box(scene, 'a380-wing', [23, 0.35, 8], [side * 18, -1.8, 4], cream);
    wing.rotation.y = side * -0.32;
    for (const offset of [12, 22]) {
      const engine = MeshBuilder.CreateCylinder(
        'a380-engine',
        { diameter: 2.5, height: 5, tessellation: 12 },
        scene,
      );
      engine.rotation.x = Math.PI / 2;
      engine.position.set(side * offset, -3, -1 + offset * 0.2);
      engine.material = navy;
    }
  }
  let person = 0;
  for (const floor of [0, layout.floorHeight]) {
    const before = scene.meshes.length;
    const upper = floor > 0;
    const width = upper ? 14.8 : 16;
    physical(`cabin-floor-${floor}`, [width, 0.25, 68], [0, floor - 0.125, 0], carpet);
    // End galleries flank the stair openings; the ramp occupies only the centre.
    for (const end of [-1, 1]) {
      for (const side of [-1, 1])
        physical(
          'stair-side-floor',
          [5.5, 0.25, 12],
          [side * 4.55, floor - 0.125, end * 40],
          carpet,
        );
      physical('stair-end-landing', [width, 0.25, 2], [0, floor - 0.125, end * 47], carpet);
      physical('pressure-bulkhead', [width, 2, 0.25], [0, floor + 1, end * 48]);
    }
    for (const side of [-1, 1]) {
      physical('cabin-sidewall', [0.2, 1.2, 96], [(side * width) / 2, floor + 0.6, 0]);
      kit.barrier(
        box(scene, 'cabin-boundary', [0.2, 5, 96], [(side * width) / 2, floor + 2.5, 0], cream),
      );
      for (let z = -43; z <= 43; z += 3) {
        const window = MeshBuilder.CreateSphere('oval-window', { diameter: 1, segments: 8 }, scene);
        window.scaling.set(0.08, 0.62, 0.42);
        window.position.set(side * (width / 2 - 0.12), floor + 1.8, z);
        window.material = glass;
        window.isPickable = false;
      }
      // Outer overhead lockers keep the aisles visible from above.
      box(
        scene,
        'overhead-bin',
        [0.6, 0.38, 64],
        [side * (width / 2 - 0.4), floor + 2.8, 0],
        cream,
      );
    }
    const rows = upper ? layout.upperRows : layout.lowerRows;
    const columns = upper ? layout.upperColumns : layout.lowerColumns;
    for (const z of rows)
      for (const x of columns) {
        const free = layout.seats.some(
          (s) =>
            s.kind === 'seat' &&
            s.position.x === x &&
            s.position.z === z &&
            Math.abs(s.position.y - floor - 1.45) < 0.01,
        );
        const surface = free ? green : upper ? brass : navy;
        const seatWidth = upper ? 1.3 : 0.95;
        physical('aircraft-seat-cushion', [seatWidth, 0.48, 0.95], [x, floor + 0.24, z], surface);
        physical(
          'aircraft-seat-back',
          [seatWidth, 1.25, 0.18],
          [x, floor + 0.87, z - 0.5],
          surface,
        );
        box(
          scene,
          'headrest-cover',
          [seatWidth * 0.7, 0.28, 0.05],
          [x, floor + 1.35, z - 0.39],
          cream,
        );
        for (const side of [-1, 1])
          box(
            scene,
            'seat-armrest',
            [0.08, 0.12, 0.8],
            [x + (side * seatWidth) / 2, floor + 0.72, z],
            cream,
          );
        if (!free && person++ % 4 === 0) {
          const rig = createNpc(
            scene,
            `flight-passenger-${person}`,
            npcPalette(scene, person),
            null,
            true,
          );
          rig.root.position.set(x, floor + 0.45, z);
          rig.root.scaling.setAll(0.8);
        }
      }
    // Standing passengers genuinely occupy the aisle; gaps between rows allow a detour.
    const standingZ = upper ? -13 : 6;
    const standing = createNpc(scene, `aisle-passenger-${floor}`, npcPalette(scene, 3), null);
    standing.root.position.set(3.2, floor, standingZ);
    const body = physical(
      'standing-passenger-body',
      [0.75, 1.7, 0.7],
      [3.2, floor + 0.85, standingZ],
      navy,
    );
    body.visibility = 0;
    // Mid-cabin galley has two ways around its centre island.
    const consoleZ = upper ? 19 : 12;
    physical(
      'galley-middle-console',
      [3.8, 2.2, upper ? 8 : 2.4],
      [0, floor + 1.1, consoleZ],
      navy,
    );
    box(scene, 'galley-worktop', [4, 0.1, upper ? 8.2 : 2.6], [0, floor + 2.25, consoleZ], brass);
    for (const side of [-1, 1]) {
      physical('galley-storage', [1.6, 1.8, 2], [side * 6.2, floor + 0.9, upper ? 36 : -13]);
      for (let drawer = 0; drawer < 3; drawer++)
        box(
          scene,
          'galley-drawer',
          [1.3, 0.35, 0.05],
          [side * 6.2, floor + 0.4 + drawer * 0.45, (upper ? 36 : -13) - 1.02],
          navy,
        );
    }
    if (!upper) {
      // A trolley blocks one aisle; cross behind the row block into the other aisle.
      for (const [x, z] of [
        [3.1, -13],
        [-3.1, 13],
      ] as const) {
        physical('drinks-trolley', [1.2, 1.4, 1.2], [x, 0.7, z], brass);
        for (const dx of [-0.4, 0.4])
          for (const dz of [-0.4, 0.4])
            box(scene, 'trolley-wheel', [0.15, 0.2, 0.2], [x + dx, 0.1, z + dz], navy);
        for (let cup = 0; cup < 3; cup++)
          box(scene, 'trolley-cup', [0.18, 0.25, 0.18], [x - 0.3 + cup * 0.3, 1.5, z], cream);
      }
      // Toilet: three solid walls, a side entry facing the left aisle.
      for (const z of [-2.1, 1.1]) physical('wc-wall', [3.4, 2.4, 0.2], [-6.25, 1.2, z]);
      physical('wc-back', [0.2, 2.4, 3.2], [-7.8, 1.2, -0.5]);
      box(scene, 'wc-bowl', [0.65, 0.5, 0.9], [-6.8, 0.25, -0.5], cream);
      box(scene, 'wc-sink', [0.55, 0.8, 0.5], [-5.1, 0.4, 0.6], cream);
      sceneSign(scene, 'WC / E VERSTECKEN', -5.6, 2.6, 0.9, 3);
    }
    for (const s of layout.seats.filter((s) => s.kind === 'seat' && s.position.y > 4 === upper)) {
      const sign = sceneSign(scene, `${s.label} / E`, s.exit.x, floor + 0.03, s.exit.z, 2.4, {
        plate: '#1c735b',
      });
      sign.rotation.x = Math.PI / 2;
    }
    sceneSign(scene, upper ? 'UPPER DECK / LOUNGE' : 'MAIN DECK / ECONOMY', 0, floor + 2.5, 33, 5);
    groups.push({ floor, meshes: scene.meshes.slice(before) as Mesh[] });
  }
  for (const side of [-1, 1]) {
    // Continuous ramps carry shallow cosmetic stair treads, avoiding capsule snagging.
    const ramp = box(
      scene,
      'a380-stair-ramp',
      [3.4, 0.18, Math.hypot(12, layout.floorHeight)],
      [0, layout.floorHeight / 2 - 0.09, side * 40],
      carpet,
    );
    ramp.rotation.x = -side * Math.atan2(layout.floorHeight, 12);
    kit.solid(ramp, false);
    for (let i = 0; i <= 24; i++)
      box(
        scene,
        'a380-stair-tread',
        [3.35, 0.02, 0.06],
        [0, (i / 24) * layout.floorHeight + 0.02, side * (34 + i / 2)],
        brass,
      );
    for (const x of [-1.85, 1.85]) {
      const rail = box(
        scene,
        'stair-handrail',
        [0.12, 0.12, Math.hypot(12, layout.floorHeight)],
        [x, layout.floorHeight / 2 + 1, side * 40],
        brass,
      );
      rail.rotation.x = ramp.rotation.x;
      // Prevent stepping off the ramp into the lower gallery midway up.
      kit.barrier(box(scene, 'stair-side-guard', [0.15, 6, 11.5], [x, 3, side * 40], cream));
    }
  }
  const clouds = Array.from({ length: 30 }, (_, i) => {
    const mesh = MeshBuilder.CreateSphere('passing-cloud', { diameter: 1, segments: 6 }, scene);
    mesh.scaling.set(8 + (i % 5), 2 + (i % 3), 5 + (i % 4));
    mesh.position.set((i % 2 ? 1 : -1) * (18 + (i % 7) * 5), -3 + (i % 4), i * 7 - 100);
    mesh.material = white;
    mesh.isPickable = false;
    return mesh;
  });
  const pass = box(
    scene,
    'karls-lounge-card',
    [0.8, 0.06, 0.5],
    [0, layout.floorHeight + 0.12, 12],
    green,
  );
  pass.isPickable = false;
  const passSign = sceneSign(scene, 'KARLS LOUNGE-KARTE', 0, layout.floorHeight + 0.05, 12, 3, {
    plate: '#1c735b',
  });
  passSign.rotation.x = Math.PI / 2;
  groups.push({ floor: layout.floorHeight, meshes: [pass, passSign] });
  const destination = destinationRing(scene, level);
  return {
    ...kit,
    destination,
    restSpots: layout.seats,
    focus(position: Position3) {
      for (const group of groups)
        for (const mesh of group.meshes)
          // The physical-only safety barriers must never become visible.
          if (mesh.name !== 'cabin-boundary') mesh.isVisible = group.floor < position.y - 0.2;
      destination.isVisible = position.y > layout.floorHeight;
    },
    update(delta: number) {
      for (const cloud of clouds) {
        cloud.position.z -= delta * 14;
        if (cloud.position.z < -110) cloud.position.z += 220;
      }
    },
  };
}
