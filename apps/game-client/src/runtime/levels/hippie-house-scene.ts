import { createWorldBuilder } from '../world/scene-builder.js';
import { buildNeighbourhood } from './arlesheim/neighbourhood.js';
import { Plane } from '@babylonjs/core/Maths/math.plane.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh.js';
import type { LevelDefinition, Position3 } from '@tobi/contracts';
import { arlesheimSectors, insideHippieHouse, hippieHouseLayout } from '@tobi/game-data';
import type { HavokWorld } from '../physics/havok-world.js';
import { box, material } from './materials.js';
import { destinationRing, sceneSign } from './scene-kit.js';
import { houseProps } from './hippie-house-props.js';

/** Three real stacked storeys, six rooms each, connected by two continuous U-shaped stairways. */
export function createHippieHouseScene(scene: Scene, world: HavokWorld, level: LevelDefinition) {
  const kit = createWorldBuilder(scene, world, arlesheimSectors, '#c7d9df');
  const neighbourhood = buildNeighbourhood(kit);
  const wood = material(scene, 'wg-wood', '#926842');
  const stairs = material(scene, 'wg-stairs', '#c9a575');
  const trim = material(scene, 'wg-trim', '#eed5ae');
  const groups: { height: number; meshes: AbstractMesh[] }[] = [];
  const floorHeight = hippieHouseLayout.floorHeight;
  for (const [floor, data] of hippieHouseLayout.floors.entries()) {
    const before = scene.meshes.length;
    const y = floor * floorHeight;
    const wall = material(scene, `wg-wall-${floor}`, data.color);
    const solid = (
      name: string,
      size: [number, number, number],
      p: [number, number, number],
      surface = wall,
    ) => kit.solid(box(scene, name, size, p, surface), false);
    solid(`wg-floor-${floor}`, [30, 0.25, 30], [0, y - 0.125, 0], stairs);
    // Fully collidable walls; the cutaway shader reveals their lower portions from above.
    for (const x of [-15, 15]) solid('wg-exterior-wall', [0.3, 3.8, 30], [x, y + 1.9, 0]);
    if (floor === 0) {
      for (const x of [-8.25, 8.25]) solid('wg-south-wall', [13.5, 3.8, 0.3], [x, y + 1.9, -15]);
      solid('wg-entry-lintel', [3, 0.7, 0.3], [0, 3.45, -15]);
    } else solid('wg-south-wall', [30, 3.8, 0.3], [0, y + 1.9, -15]);
    for (const x of [-9.5, 9.5]) solid('wg-north-wall', [11, 3.8, 0.3], [x, y + 1.9, 15]);
    for (const x of [-9, 9]) {
      for (const z of [-5, 5]) solid('wg-room-divider', [12, 3.8, 0.22], [x, y + 1.9, z]);
      for (const z of hippieHouseLayout.roomRows) {
        for (const dz of [-3.15, 3.15])
          solid('wg-door-wall', [0.22, 3.8, 3.7], [Math.sign(x) * 3, y + 1.9, z + dz]);
        solid('wg-door-lintel', [0.25, 0.7, 2.6], [Math.sign(x) * 3, y + 3.45, z], trim);
      }
    }
    for (const [row, z] of hippieHouseLayout.roomRows.entries())
      for (const [side, x] of hippieHouseLayout.roomColumns.entries()) {
        const room = row * 2 + side;
        houseProps(scene, floor, x, z, room);
        const sign = sceneSign(scene, data.rooms[room]!, x, y + 0.09, z - 2.8, 5);
        sign.rotation.x = Math.PI / 2;
      }
    const floorSign = sceneSign(scene, data.name, 0, y + 0.08, 3, 5);
    floorSign.rotation.x = Math.PI / 2;
    const note = sceneSign(
      scene,
      floor === 2
        ? 'KARL SPUELT SPAETER'
        : floor === 1
          ? 'NAMASTE. WO IST DER AUSGANG?'
          : 'BUCHUNG BEENDET / ABWASCH OFFEN',
      0,
      y + 0.09,
      -8,
      5,
    );
    note.rotation.x = Math.PI / 2;
    solid('stair-front-landing', [9.6, 0.25, 1.4], [0, y - 0.125, 15.6], stairs);
    // Side annex is enclosed; entry only from the central hall.
    for (const x of [-4.8, 4.8])
      solid('stairwell-outer-wall', [0.25, floorHeight, 16], [x, y + floorHeight / 2, 23]);
    solid('stairwell-back-wall', [9.6, floorHeight, 0.25], [0, y + floorHeight / 2, 31]);
    for (const x of [-10, -6, 6, 10]) {
      box(
        scene,
        'wg-window',
        [1.7, 1.6, 0.08],
        [x, y + 2, -15.19],
        material(scene, 'wg-window-glass', '#536e71'),
      );
      for (const side of [-1, 1])
        box(scene, 'wg-shutter', [0.5, 1.8, 0.1], [x + side * 1.12, y + 2, -15.23], wood);
      box(scene, 'wg-window-sill', [2, 0.14, 0.4], [x, y + 1.16, -15.32], trim);
    }
    groups.push({ height: y, meshes: scene.meshes.slice(before) as AbstractMesh[] });
  }
  for (const upper of [floorHeight, floorHeight * 2]) {
    const before = scene.meshes.length;
    const lower = upper - floorHeight,
      middle = upper - floorHeight / 2;
    kit.solid(
      box(scene, 'stair-mid-landing', [9.6, 0.25, 3], [0, middle - 0.125, 29.5], stairs),
      false,
    );
    for (const [x, sign] of [
      [-2.2, 1],
      [2.2, -1],
    ] as const) {
      const angle = sign * Math.atan2(floorHeight / 2, 12);
      const centre = sign === 1 ? (upper + middle) / 2 : (middle + lower) / 2;
      const ramp = box(
        scene,
        'stair-flight',
        [4.15, 0.2, Math.hypot(12, floorHeight / 2)],
        [x, centre - 0.1, 22],
        stairs,
      );
      ramp.rotation.x = angle;
      kit.solid(ramp, false);
      // Shallow visual treads over a continuous slope avoid capsule snagging on small steps.
      for (let step = 0; step <= 24; step++) {
        const z = 16 + step * 0.5;
        const y =
          sign === 1
            ? upper - ((step / 24) * floorHeight) / 2
            : lower + ((step / 24) * floorHeight) / 2;
        box(scene, 'stair-tread', [4.1, 0.025, 0.045], [x, y + 0.015, z], wood);
      }
    }
    kit.solid(
      box(
        scene,
        'stair-centre-divider',
        [0.25, floorHeight + 1.8, 12],
        [0, lower + (floorHeight + 1.8) / 2, 22],
        trim,
      ),
      false,
    );
    groups.push({ height: lower, meshes: scene.meshes.slice(before) as AbstractMesh[] });
  }
  // The front door is now a physical opening into a connected neighbourhood.
  const door = box(scene, 'wg-open-door', [0.14, 2.8, 2.2], [1.6, 1.4, -16], wood);
  kit.solid(door);
  const exitSign = sceneSign(scene, 'GARTEN / DORF', 0, 3, -15.3, 4);
  const destination = destinationRing(scene, level);
  const roof = kit.prop('wg', 'wg-roof', [31, 0.3, 31], [0, 13.15, 0], '#936853', true);
  for (const side of [-1, 1]) {
    const slope = kit.prop(
      'wg',
      'wg-pitched-roof',
      [16.5, 0.25, 32],
      [side * 7.8, 15.1, 0],
      '#a66f52',
    );
    slope.rotation.z = -side * 0.24;
    const collider = world.addCollider(slope, { collision: 'box', walkable: true })!;
    kit.colliders.push(collider.mesh);
    groups.push({ height: 13, meshes: [slope] });
  }
  groups.push({ height: 13, meshes: [roof] });
  const cutPlane = new Plane(0, 1, 0, -20);
  const focus = (position: Position3): void => {
    const inside = insideHippieHouse(position);
    scene.clipPlane = inside ? cutPlane : null;
    cutPlane.d = -(position.y + 1.5);
    for (const group of groups)
      for (const mesh of group.meshes) mesh.isVisible = !inside || group.height < position.y - 0.2;
    door.isVisible =
      exitSign.isVisible =
      destination.isVisible =
        !inside || position.y < floorHeight;
    neighbourhood.focus(position);
  };
  focus(level.spawn);
  return {
    ...kit,
    ...neighbourhood,
    destination,
    focus,
    cameraMode: (p: Position3) =>
      insideHippieHouse(p) ? ('interior' as const) : ('follow' as const),
    worldLabel: (p: Position3) =>
      insideHippieHouse(p)
        ? 'HIPPIE-WG'
        : p.z > 55
          ? 'WALDWEG'
          : p.x > 35 && p.z > 0
            ? 'DORFPLATZ'
            : p.x < -22 && p.z > -25
              ? 'WG-GARTEN'
              : 'ARLESHEIM',
  };
}
