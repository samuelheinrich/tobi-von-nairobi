import { Plane } from '@babylonjs/core/Maths/math.plane.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { LevelDefinition, Position3 } from '@tobi/contracts';
import { hippieHouseLayout } from '@tobi/game-data';
import type { HavokWorld } from '../physics/havok-world.js';
import { box, material } from './materials.js';
import { destinationRing, sceneKit, sceneSign } from './scene-kit.js';
import { houseProps } from './hippie-house-props.js';

/** Three real stacked storeys, six rooms each, connected by two continuous U-shaped stairways. */
export function createHippieHouseScene(scene: Scene, world: HavokWorld, level: LevelDefinition) {
  const kit = sceneKit(scene, world, '#c6b6a2');
  const wood = material(scene, 'wg-wood', '#926842');
  const stairs = material(scene, 'wg-stairs', '#c9a575');
  const trim = material(scene, 'wg-trim', '#eed5ae');
  const groups: { height: number; meshes: Mesh[] }[] = [];
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
    solid('wg-south-wall', [30, 3.8, 0.3], [0, y + 1.9, -15]);
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
    groups.push({ height: y, meshes: scene.meshes.slice(before) as Mesh[] });
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
    groups.push({ height: lower, meshes: scene.meshes.slice(before) as Mesh[] });
  }
  // No false door on the upper floors. E completes the actual ground-floor exit threshold.
  const door = box(scene, 'wg-exit-door', [2.2, 2.8, 0.15], [0, 1.4, -14.8], wood);
  const exitSign = sceneSign(scene, 'AUSGANG', 0, 3, -14.65, 3);
  const destination = destinationRing(scene, level);
  scene.clipPlane = new Plane(0, 1, 0, -20);
  const focus = (position: Position3): void => {
    // Clip graphics only; all floors/walls keep their Havok bodies and block thrown bottles.
    scene.clipPlane!.d = -(position.y + 1.5);
    for (const group of groups)
      for (const mesh of group.meshes) mesh.isVisible = group.height < position.y - 0.2;
    door.isVisible = exitSign.isVisible = destination.isVisible = position.y < floorHeight;
  };
  focus(level.spawn);
  return { ...kit, destination, focus };
}
