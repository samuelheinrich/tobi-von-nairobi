import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { WorldBuilder } from '../world/scene-builder.js';
import { box, cylinderBetween } from '../levels/materials.js';
import { sceneSign } from '../levels/scene-kit.js';

export interface PlatformDefinition {
  id: string;
  x: number;
  y: number;
  z: number;
  width: number;
  length: number;
  trackNumbers: readonly number[];
}

export function buildTrack(
  b: WorldBuilder,
  sector: string,
  id: string,
  x: number,
  y: number,
  z: number,
  length: number,
): void {
  b.prop(sector, `${id}-bed`, [3.7, 0.16, length], [x, y - 0.16, z], '#34393d');
  for (const dx of [-0.72, 0.72])
    b.prop(sector, `${id}-rail`, [0.09, 0.11, length], [x + dx, y, z], '#9ba2a6');
  for (let dz = -length / 2 + 1; dz < length / 2; dz += 1.45)
    b.prop(sector, `${id}-sleeper`, [2.25, 0.08, 0.2], [x, y - 0.05, z + dz], '#6c5141');
}

export function buildPlatform(
  b: WorldBuilder,
  sector: string,
  definition: PlatformDefinition,
): void {
  const d = definition;
  b.prop(
    sector,
    `${d.id}-platform`,
    [d.width, 0.35, d.length],
    [d.x, d.y - 0.175, d.z],
    '#aaa69c',
    true,
  );
  for (const side of [-1, 1])
    b.prop(
      sector,
      `${d.id}-safety-line`,
      [0.13, 0.025, d.length - 1],
      [d.x + (side * (d.width - 0.3)) / 2, d.y + 0.015, d.z],
      '#e8cf57',
    );
  for (let z = d.z - d.length / 2 + 7; z < d.z + d.length / 2; z += 13) {
    b.prop(sector, `${d.id}-canopy-post`, [0.16, 3.2, 0.16], [d.x, d.y + 1.6, z], '#778087', true);
    b.prop(
      sector,
      `${d.id}-canopy`,
      [d.width - 0.3, 0.14, 7],
      [d.x, d.y + 3.2, z],
      '#bbc2c7',
      // A platform canopy is shelter, not a gallery three metres over the tracks.
      'barrier',
    );
  }
  b.sign(
    sector,
    `GLEIS ${d.trackNumbers.join(' / ')}`,
    d.x,
    d.y + 4.15,
    d.z - d.length / 2 + 3,
    4.2,
  );
}

/** Continuous ramp collider plus shallow visual treads: reliable for the capsule controller. */
export function buildStationRamp(
  b: WorldBuilder,
  sector: string,
  id: string,
  from: Vector3,
  to: Vector3,
  width = 3,
): void {
  const delta = to.subtract(from),
    length = Math.hypot(delta.z, delta.y),
    ramp = box(
      b.scene,
      `${id}-ramp`,
      [width, 0.18, length],
      [(from.x + to.x) / 2, (from.y + to.y) / 2 - 0.09, (from.z + to.z) / 2],
      b.palette('#99958b'),
    );
  ramp.rotation.x = -Math.atan2(delta.y, delta.z);
  b.world.addStatic(ramp);
  ramp.metadata.navigationObstacle = false;
  b.colliders.push(ramp);
  b.sectors.add(sector, ramp);
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    b.prop(
      sector,
      `${id}-tread`,
      [width, 0.025, 0.09],
      [from.x, from.y + delta.y * t + 0.02, from.z + delta.z * t],
      '#c2bdb0',
    );
  }
  // Match the handrails to the ramp slope. Axis-aligned rails left triangular holes at both
  // ends where the capsule could fall through the station floor.
  for (const side of [-1, 1]) {
    const rail = box(
      b.scene,
      `${id}-rail`,
      [0.16, 1.05, length + 0.25],
      [from.x + (side * width) / 2, (from.y + to.y) / 2 + 0.48, (from.z + to.z) / 2],
      b.palette('#6c747b'),
    );
    rail.rotation.x = ramp.rotation.x;
    b.world.addStatic(rail);
    rail.metadata.navigationObstacle = false;
    b.colliders.push(rail);
    b.sectors.add(sector, rail);
  }
}

export function buildStationFurniture(
  b: WorldBuilder,
  sector: string,
  id: string,
  x: number,
  y: number,
  z: number,
): void {
  b.prop(sector, `${id}-bench-seat`, [2.6, 0.18, 0.7], [x, y + 0.52, z], '#6f4d38', true);
  b.prop(sector, `${id}-bench-back`, [2.6, 0.9, 0.14], [x, y + 0.92, z + 0.3], '#6f4d38', true);
  for (const side of [-1, 1])
    b.prop(sector, `${id}-bench-leg`, [0.15, 0.52, 0.15], [x + side, y + 0.26, z], '#555d63', true);
}

export function buildStaticTrain(
  b: WorldBuilder,
  sector: string,
  id: string,
  x: number,
  y: number,
  z: number,
  cars = 3,
): void {
  for (let car = 0; car < cars; car++) {
    const cz = z + (car - (cars - 1) / 2) * 12;
    b.prop(sector, `${id}-body`, [3.1, 2.85, 11.4], [x, y + 1.35, cz], '#d9dfe2', true);
    b.prop(sector, `${id}-stripe`, [3.14, 0.45, 10.7], [x, y + 1.15, cz], '#cf2731');
    for (const side of [-1, 1])
      for (const dz of [-3.6, -1.2, 1.2, 3.6])
        b.prop(
          sector,
          `${id}-window`,
          [0.04, 0.78, 1.25],
          [x + side * 1.58, y + 1.82, cz + dz],
          '#25475c',
        );
  }
}

export function buildRailCurve(
  b: WorldBuilder,
  sector: string,
  id: string,
  points: readonly { x: number; y: number; z: number }[],
): void {
  const steel = b.palette('#858e95');
  for (let i = 0; i + 1 < points.length; i++) {
    const from = new Vector3(points[i]!.x, points[i]!.y, points[i]!.z),
      to = new Vector3(points[i + 1]!.x, points[i + 1]!.y, points[i + 1]!.z),
      tangent = to.subtract(from).normalize(),
      side = new Vector3(tangent.z, 0, -tangent.x).scale(0.72);
    for (const offset of [side, side.scale(-1)]) {
      const rail = cylinderBetween(
        b.scene,
        `${id}-rail`,
        from.add(offset),
        to.add(offset),
        0.1,
        steel,
      );
      b.sectors.add(sector, rail);
    }
  }
}

export function buildStationClock(
  b: WorldBuilder,
  sector: string,
  x: number,
  y: number,
  z: number,
): void {
  const face = MeshBuilder.CreateCylinder(
    'sbb-clock',
    { diameter: 2.4, height: 0.18, tessellation: 24 },
    b.scene,
  );
  face.rotation.x = Math.PI / 2;
  face.position.set(x, y, z);
  face.material = b.palette('#f3f0e7');
  face.metadata = { collision: { collision: 'none' } };
  b.sectors.add(sector, face);
  for (const [length, angle, color] of [
    [0.82, 0.7, '#20262b'],
    [0.65, -1.25, '#20262b'],
    [0.95, 2.5, '#d72b36'],
  ] as const) {
    const hand = box(
      b.scene,
      'clock-hand',
      [0.07, length, 0.04],
      [0, length / 2, 0],
      b.palette(color),
    );
    hand.parent = face;
    hand.rotation.z = angle;
    hand.position.set(0, 0, -0.12);
    hand.metadata = { collision: { collision: 'none' } };
  }
  sceneSign(b.scene, 'ZÜRICH HB', x, y - 1.2, z - 0.05, 8, { ink: '#f7f0d8', plate: '#25445b' });
}
