import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { LevelDefinition, Position3 } from '@tobi/contracts';
import { aircraftLayout as layout } from '@tobi/game-data';
import type { HavokWorld } from '../physics/havok-world.js';
import { box, solidBox, material } from './materials.js';
import { destinationRing, sceneKit, sceneSign } from './scene-kit.js';
import { createNpc, npcPalette } from './npc-kit.js';
import { SeatAnchor, SeatSurface } from '../character/seating/seat-anchor.js';
import { loadAircraftModel } from '../aircraft/aircraft-model-loader.js';
import { updateGeometryAudit } from '../rendering/geometry-validation.js';
import { createFlightLandscape } from '../aircraft/flight-landscape.js';
import { createAirportEnvironment } from '../airport/airport-environment.js';

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
  const exteriorRoot = new TransformNode('aircraft-flight-root', scene);
  exteriorRoot.setEnabled(false);
  const exteriorFallback: Mesh[] = [];
  const seatAnchors: SeatAnchor[] = [];
  const physical = (
    name: string,
    size: [number, number, number],
    at: [number, number, number],
    mat = cream,
  ) => kit.solid(box(scene, name, size, at, mat), false);
  // Visible lower fuselage, wings and four engines establish the aircraft from the open cutaway.
  const hull = MeshBuilder.CreateSphere('a380-fuselage', { diameter: 1, segments: 20 }, scene);
  hull.scaling.set(17, 12, 136);
  hull.position.y = 0;
  hull.material = cream;
  hull.isPickable = false;
  hull.parent = exteriorRoot;
  exteriorFallback.push(hull);
  for (const side of [-1, 1]) {
    const wing = box(scene, 'a380-wing', [23, 0.35, 8], [side * 18, -1.8, 4], cream);
    wing.rotation.y = side * -0.32;
    wing.parent = exteriorRoot;
    exteriorFallback.push(wing);
    for (const offset of [12, 22]) {
      const engine = MeshBuilder.CreateCylinder(
        'a380-engine',
        { diameter: 2.5, height: 5, tessellation: 12 },
        scene,
      );
      engine.rotation.x = Math.PI / 2;
      engine.position.set(side * offset, -3, -1 + offset * 0.2);
      engine.material = navy;
      engine.parent = exteriorRoot;
      exteriorFallback.push(engine);
    }
  }
  const exteriorModel = loadAircraftModel(scene, {
    url: '/objects/airplane/airbus_a380-841_lufthansa.glb',
    parent: exteriorRoot,
    centre: [0, 0, 0],
    maximumSize: [82, 25, 76],
  })
    .then(() => exteriorFallback.forEach((mesh) => mesh.setEnabled(false)))
    .catch((error: unknown) => console.warn('[aircraft] A380 model unavailable', error));
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
      if (!(upper && end > 0))
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
      solidBox(
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
            Math.abs(s.position.y - floor - 0.9) < 0.01,
        );
        const surface = free ? green : upper ? brass : navy;
        const seatWidth = upper ? 1.3 : 0.95;
        const cushion = box(
          scene,
          'aircraft-seat-cushion',
          [seatWidth, 0.48, 0.95],
          [x, floor + 0.24, z],
          surface,
        );
        box(
          scene,
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
        world.addCollider(cushion, {
          collision: 'box',
          layer: 'WORLD_STATIC',
          parts: [
            { size: [seatWidth, 0.48, 0.95], position: [0, 0, 0] },
            { size: [seatWidth, 1.25, 0.18], position: [0, 0.63, -0.5] },
            { size: [0.08, 0.12, 0.8], position: [-seatWidth / 2, 0.48, 0] },
            { size: [0.08, 0.12, 0.8], position: [seatWidth / 2, 0.48, 0] },
          ],
        });
        kit.colliders.push(cushion);
        const occupied = !free && person++ % 4 === 0;
        if (free || occupied) {
          const authored = layout.seats.find(
            (spot) =>
              spot.kind === 'seat' &&
              spot.position.x === x &&
              spot.position.z === z &&
              Math.abs(spot.position.y - floor - 0.9) < 0.01,
          );
          const id = authored?.id
            ? `aircraft-seat-${authored.id}`
            : `aircraft-passenger-seat-${floor}-${z}-${x}`;
          const seatSurface = new SeatSurface(scene, {
            id,
            position: [x, floor + 0.48, z],
            width: seatWidth,
            depth: 0.95,
            collider: cushion,
          });
          const seatAnchor = new SeatAnchor({
            id,
            type: 'airplane',
            surface: seatSurface,
            position: [0, 0.25, -0.08],
            yaw: 0,
            footTargetLeft: [-0.18, -0.48, 0.62],
            footTargetRight: [0.18, -0.48, 0.62],
          });
          seatAnchors.push(seatAnchor);
          if (!occupied) continue;
          const rig = createNpc(
            scene,
            `flight-passenger-${person}`,
            npcPalette(scene, person),
            null,
            true,
          );
          rig.root.position.set(x, floor, z);
          rig.seatAnchor = seatAnchor;
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
      // Toilet remains scenery; hiding is no longer part of this level's objective.
      for (const z of [-2.1, 1.1]) physical('wc-wall', [3.4, 2.4, 0.2], [-6.25, 1.2, z]);
      physical('wc-back', [0.2, 2.4, 3.2], [-7.8, 1.2, -0.5]);
      box(scene, 'wc-bowl', [0.65, 0.5, 0.9], [-6.8, 0.25, -0.5], cream);
      box(scene, 'wc-sink', [0.55, 0.8, 0.5], [-5.1, 0.4, 0.6], cream);
      sceneSign(scene, 'WC', -5.6, 2.6, 0.9, 3);
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
  // The upper-deck flight deck extends beyond the passenger pressure bulkhead. The door itself
  // owns a removable collider so the breach changes the same geometry the player collides with.
  const cockpitFallback: Mesh[] = [];
  const cockpitCollisionShell: Mesh[] = [];
  cockpitCollisionShell.push(
    physical('cockpit-floor', [14.8, 0.25, 20], [0, layout.floorHeight - 0.125, 58], carpet),
  );
  for (const side of [-1, 1])
    cockpitCollisionShell.push(
      physical('cockpit-sidewall', [0.25, 3.2, 20], [side * 7.3, 6, 58], cream),
    );
  cockpitCollisionShell.push(physical('cockpit-nose-wall', [14.8, 3.2, 0.25], [0, 6, 68], cream));
  for (const x of [-5.1, 5.1])
    cockpitCollisionShell.push(
      physical('cockpit-door-frame', [4.6, 3.2, 0.28], [x, 6, layout.takeover.cockpitDoor.z], navy),
    );
  const cockpitDoor = box(
    scene,
    'cockpit-breachable-door',
    [3.8, 2.7, 0.25],
    [layout.takeover.cockpitDoor.x, layout.takeover.cockpitDoor.y, layout.takeover.cockpitDoor.z],
    navy,
  );
  const cockpitDoorCollider = world.addCollider(cockpitDoor, {
    collision: 'box',
    layer: 'WORLD_STATIC',
    walkable: false,
  })!;
  kit.colliders.push(cockpitDoor);
  sceneSign(scene, 'COCKPIT · CREW ONLY', 0, 6.25, 55.84, 4.2, { plate: '#a7272f' });
  cockpitFallback.push(physical('instrument-panel', [10.5, 1.4, 1.2], [0, 5.25, 66], navy));
  for (const x of [-2.15, 2.15]) {
    const pilotCushion = physical('pilot-seat', [1.5, 0.55, 1.6], [x, 4.68, 63], navy);
    const pilotBack = physical('pilot-seat-back', [1.5, 1.8, 0.3], [x, 5.65, 62.25], navy);
    const sidestick = box(
      scene,
      'sidestick',
      [0.12, 0.65, 0.12],
      [x + Math.sign(x) * 0.9, 5.15, 64],
      brass,
    );
    cockpitFallback.push(pilotCushion, pilotBack, sidestick);
    if (x < 0) pilotCushion.metadata = { ...pilotCushion.metadata, pilotSeat: true };
  }
  for (let screen = -4; screen <= 4; screen += 2) {
    const display = box(scene, 'cockpit-display', [1.5, 0.75, 0.05], [screen, 5.65, 65.37], glass);
    display.rotation.x = -0.22;
    cockpitFallback.push(display);
  }
  const cockpitModelRoot = new TransformNode('cockpit-model-root', scene);
  const cockpitModel = loadAircraftModel(scene, {
    url: '/objects/airplane/free_plane_cockpit.glb',
    parent: cockpitModelRoot,
    centre: [0, 6.3, 62.2],
    maximumSize: [12.5, 6.5, 13.5],
    yaw: 0,
  })
    .then(() => {
      [...cockpitFallback, ...cockpitCollisionShell].forEach((mesh) => (mesh.visibility = 0));
      updateGeometryAudit(scene);
    })
    .catch((error: unknown) => console.warn('[aircraft] cockpit model unavailable', error));
  const modelReady = Promise.all([exteriorModel, cockpitModel]).then(() => undefined);
  const pilotSurface = new SeatSurface(scene, {
    id: 'pilot-seat-anchor',
    parent: exteriorRoot,
    position: [-2.15, 4.95, 63],
    width: 1.5,
    depth: 1.6,
  });
  const pilotSeatAnchor = new SeatAnchor({
    id: 'pilot-seat-anchor',
    type: 'airplane',
    surface: pilotSurface,
    position: [0, 0.27, -0.12],
    yaw: 0,
    footTargetLeft: [-0.18, -0.55, 0.9],
    footTargetRight: [0.18, -0.55, 0.9],
  });
  seatAnchors.push(pilotSeatAnchor);
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
    const side = i % 2 ? 1 : -1;
    const lateral = 52 + (i % 5) * 9;
    const vertical = -28 + (i % 7) * 8;
    mesh.position.set(side * lateral, vertical, i * 9 - 130);
    mesh.material = white;
    mesh.isPickable = false;
    return { mesh, side, lateral, vertical };
  });
  const destination = destinationRing(scene, level);
  destination.setEnabled(false);
  const landscape = createFlightLandscape(scene);
  const airport = createAirportEnvironment(scene, world);
  let airportActive = false;
  const airportAudioZones = [
    {
      id: 'airport-apron',
      x: 5,
      y: 0,
      z: 1450,
      radius: 130,
      kind: 'traffic',
      tempo: 1.8,
      note: 110,
      volume: 0.45,
    },
    {
      id: 'airport-terminal',
      x: 175,
      y: 0,
      z: 1450,
      radius: 105,
      kind: 'voices',
      tempo: 1.25,
      note: 240,
      volume: 0.42,
    },
    {
      id: 'airport-party',
      x: 238,
      y: 0,
      z: 1498,
      radius: 48,
      kind: 'music',
      tempo: 0.42,
      note: 118,
      volume: 0.75,
    },
  ] as const;
  const homeAnchor = seatAnchors.find((anchor) => anchor.id === 'aircraft-seat-tobi-seat');
  return {
    ...kit,
    destination,
    seatAnchors,
    restSpots: layout.seats
      .filter((spot) => spot.id === 'tobi-seat')
      .map((spot) => (homeAnchor ? { ...spot, seatAnchorId: homeAnchor.id } : spot)),
    aircraft: {
      cockpitDoor,
      cockpitDoorCollider,
      exteriorRoot,
      pilotSeatAnchor,
      modelReady,
      trolleySpawn: [
        layout.takeover.trolleySpawn.x,
        layout.takeover.trolleySpawn.y,
        layout.takeover.trolleySpawn.z,
      ] as const,
      cockpitApproach: [
        layout.takeover.cockpitApproach.x,
        layout.takeover.cockpitApproach.y,
        layout.takeover.cockpitApproach.z,
      ] as const,
      pilotApproach: [
        layout.takeover.pilotApproach.x,
        layout.takeover.pilotApproach.y,
        layout.takeover.pilotApproach.z,
      ] as const,
      airportExit: airport.exit,
      evacuationRoutes: airport.evacuationRoutes,
      setFlightPresentation(active: boolean) {
        exteriorRoot.setEnabled(active);
        landscape.setEnabled(active);
        airport.setEnabled(false);
        destination.setEnabled(false);
        scene.fogStart = active ? 480 : 100;
        scene.fogEnd = active ? 1900 : 220;
        cockpitModelRoot.setEnabled(!active);
        for (const group of groups) for (const mesh of group.meshes) mesh.setEnabled(!active);
        cockpitDoor.setEnabled(!active);
      },
      setAirportPresentation(active: boolean) {
        airportActive = active;
        airport.setEnabled(active);
        destination.setEnabled(active);
        exteriorRoot.setEnabled(active);
        landscape.setEnabled(active);
        scene.fogStart = active ? 160 : 480;
        scene.fogEnd = active ? 520 : 1900;
        if (active) updateGeometryAudit(scene);
      },
    },
    get audioZones() {
      return airportActive ? airportAudioZones : undefined;
    },
    cameraMode() {
      return airportActive ? ('follow' as const) : ('interior' as const);
    },
    debugTeleports: [
      { label: 'Servicewagen', position: { x: 0, y: 5.5, z: 46.5 } },
      { label: 'Cockpittür', position: { x: 0, y: 5.5, z: 53 } },
      { label: 'Pilotensitz', position: { x: -2.15, y: 5.5, z: 62 } },
      { label: 'Terminal-Party', position: { x: 214, y: 1.5, z: 1498 } },
    ],
    focus(position: Position3) {
      for (const group of groups)
        for (const mesh of group.meshes)
          // The physical-only safety barriers must never become visible.
          if (mesh.name !== 'cabin-boundary') mesh.isVisible = group.floor < position.y - 0.2;
      destination.isVisible = false;
    },
    update(delta: number) {
      airport.update(delta);
      for (const { mesh: cloud, side, lateral, vertical } of clouds) {
        cloud.position.z -= delta * 14;
        const centre = exteriorRoot.isEnabled() ? exteriorRoot.position.z : 0;
        if (cloud.position.z < centre - 130) cloud.position.z += 260;
        if (exteriorRoot.isEnabled()) {
          cloud.position.x = exteriorRoot.position.x + side * lateral;
          cloud.position.y = exteriorRoot.position.y + vertical;
        }
      }
    },
  };
}
