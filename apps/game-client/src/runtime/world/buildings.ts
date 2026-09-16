import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { BuildingDefinition } from '@tobi/contracts';
import type { RestSpot } from '@tobi/game-core';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { InstancedMesh } from '@babylonjs/core/Meshes/instancedMesh.js';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import type { HavokWorld } from '../physics/havok-world.js';
import type { WorldSectors } from './sectors.js';
export interface BuildingAuthor {
  scene: Scene;
  world: HavokWorld;
  sectors: WorldSectors;
  colliders: Mesh[];
  palette(color: string): StandardMaterial;
  prop(
    sector: string,
    name: string,
    size: readonly [number, number, number],
    at: readonly [number, number, number],
    color: string,
    solid?: boolean,
  ): InstancedMesh;
  sign(sector: string, text: string, x: number, y: number, z: number, width?: number): Mesh;
}
/** Data-authored shells: real doorway gaps, separate roof, furniture and reusable roof access. */
export function buildBuilding(b: BuildingAuthor, d: BuildingDefinition, sector: string) {
  const { x, y, z } = d.position,
    w = d.width,
    h = d.height,
    depth = d.depth;
  const parts: { size: [number, number, number]; position: [number, number, number] }[] = [];
  const add = (
    name: string,
    size: [number, number, number],
    local: [number, number, number],
    color = d.color,
  ) => {
    const mesh = b.prop(
      sector,
      d.id + '-' + name,
      size,
      [x + local[0], y + local[1], z + local[2]],
      color,
    );
    parts.push({ size, position: local });
    return mesh;
  };
  if (d.enterable === 'facade_only') add('shell', [w, h, depth], [0, h / 2, 0]);
  else {
    add('left', [0.24, h, depth], [-w / 2, h / 2, 0]);
    add('right', [0.24, h, depth], [w / 2, h / 2, 0]);
    add('back', [w, h, 0.24], [0, h / 2, depth / 2]);
    if (d.enterable === 'fully_enterable') {
      const door = d.doors[0] ?? { x: 0, width: 3 };
      const edges = [-w / 2, door.x - door.width / 2, door.x + door.width / 2, w / 2];
      for (const [a, c] of [
        [edges[0]!, edges[1]!],
        [edges[2]!, edges[3]!],
      ] as const)
        add('front', [c - a, h, 0.24], [(a + c) / 2, h / 2, -depth / 2]);
      add('lintel', [door.width, h - 2.6, 0.24], [door.x, 2.6 + (h - 2.6) / 2, -depth / 2]);
    }
  }
  const roof = add('roof', [w + 0.45, 0.22, depth + 0.45], [0, h + 0.11, 0], '#97614d');
  const root = MeshBuilder.CreateBox(
    d.id + '-collision-shell',
    { width: w, height: h, depth },
    b.scene,
  );
  root.position.set(x, y, z);
  root.isVisible = false;
  root.isPickable = false;
  const handle = b.world.addCollider(root, { collision: 'box', parts, walkable: d.roofWalkable })!;
  handle.mesh.metadata.navigationObstacle = false;
  b.colliders.push(handle.mesh);
  b.sign(sector, d.label, x, y + 2.9, z - depth / 2 - 0.16, 9);
  const restSpots: RestSpot[] = [];
  if (d.enterable !== 'facade_only') {
    b.prop(sector, d.id + '-counter', [3, 1, 1], [x + 3, y + 0.5, z + 2.5], '#6c4634', true);
    b.prop(sector, d.id + '-table', [2, 0.15, 1.4], [x - 2, y + 0.85, z + 1], '#b58b5d', true);
    b.prop(
      sector,
      d.id + '-table-leg',
      [0.35, 0.85, 0.35],
      [x - 2, y + 0.42, z + 1],
      '#684c3e',
      true,
    );
    b.prop(sector, d.id + '-bench', [2, 0.48, 0.65], [x - 2, y + 0.24, z - 0.3], '#94684b', true);
    restSpots.push({
      id: d.id + '-seat',
      kind: 'seat',
      label: d.label + ' · HINSETZEN',
      position: { x: x - 2, y: y + 0.9, z: z - 0.3 },
      exit: { x: x - 2, y: y + 1.15, z: z - 1.5 },
      yaw: 0,
      seatHeight: 0.48,
    });
    for (let i = 0; i < 4; i++)
      b.prop(
        sector,
        d.id + '-food',
        [0.3, 0.2, 0.3],
        [x + 2 + i * 0.6, y + 1.12, z + 2.5],
        i % 2 ? '#80ad4e' : '#e4b750',
      );
    if (d.interiorType === 'home')
      b.prop(sector, d.id + '-bed', [2, 0.5, 2.8], [x + 3, y + 0.25, z], '#d8cfba', true);
  }
  if (d.roofWalkable) {
    // Gentle exterior staircase along left wall, rising from the south to roof height.
    const rise = h + 0.22,
      length = 11,
      cx = x - w / 2 - 1.2,
      cz = z;
    const ramp = MeshBuilder.CreateBox(
      d.id + '-stairs-ramp',
      { width: 2, height: 0.16, depth: Math.hypot(length, rise) },
      b.scene,
    );
    ramp.position.set(cx, y + rise / 2 - 0.08, cz);
    ramp.rotation.x = -Math.atan2(rise, length);
    ramp.material = b.palette('#a28e70');
    b.world.addStatic(ramp);
    ramp.metadata.navigationObstacle = false;
    b.colliders.push(ramp);
    b.sectors.add(sector, ramp);
    for (let i = 0; i < 22; i++)
      b.prop(
        sector,
        'stair-tread',
        [2, 0.025, 0.08],
        [cx, y + (i * rise) / 22, z - length / 2 + (i * length) / 22],
        '#ccb796',
      );
    b.prop(
      sector,
      'roof-landing',
      [5, 0.2, 2],
      [x - w / 2 + 1, y + rise - 0.1, z + depth / 2 + 1.5],
      '#a28e70',
      true,
    );
    b.sign(sector, 'ROOFTOP ↑', cx, y + 1.4, z - 6, 3);
  }
  return {
    restSpots,
    focus: (px: number, py: number, pz: number) => {
      roof.isVisible = !(
        d.enterable !== 'facade_only' &&
        Math.abs(px - x) < w / 2 &&
        Math.abs(pz - z) < depth / 2 &&
        py < y + h
      );
    },
    contains: (px: number, pz: number) =>
      d.enterable !== 'facade_only' && Math.abs(px - x) < w / 2 && Math.abs(pz - z) < depth / 2,
  };
}
