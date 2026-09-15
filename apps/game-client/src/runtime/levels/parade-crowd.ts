import { diversifyFemaleGroup } from '../character/modular/female/presets.js';
import { animateFemale } from '../character/modular/female/animation.js';
import '@babylonjs/core/Meshes/thinInstanceMesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Ray } from '@babylonjs/core/Culling/ray.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { NavigationGrid, ReactiveCrowd } from '@tobi/game-core';
import type { Point2 } from '@tobi/game-core';
import type { LevelDefinition, Position3 } from '@tobi/contracts';
import { createNpc, npcPalette, type NpcRig } from './npc-kit.js';
import { animateDance } from '../character/dance-system.js';
import { FarNpcModels } from '../character/far-npc-models.js';
import { appearance, type Appearance } from '../character/modular/presets.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { material } from './materials.js';
import { navigationObstacles, sightBlockers } from './nav-obstacles.js';

// Thinned by a quarter on 15.09.2026: 240 read as a wall rather than a crowd, and cost the most
// of anything on the route.
export const PARADE_CROWD_SIZE = 180;

/** Fills the route with dancers instead of lining them up: walk the polyline, then fan out
 * sideways and keep whatever the navigation grid says is standable.
 *
 * Candidates are collected along the **whole** route and then thinned to the limit. Stopping as
 * soon as the limit was reached packed every dancer onto the first leg along the Utoquai and left
 * the Quaibruecke and everything past it empty.
 */
export function crowdAlongRoute(
  route: readonly Point2[],
  nav: NavigationGrid,
  limit: number,
): Point2[] {
  const candidates: Point2[] = [];
  const offsets = [2.6, -2.6, 4.2, -4.2, 5.8, -5.8, 7.4, -7.4];
  for (let leg = 0; leg + 1 < route.length; leg++) {
    const from = route[leg]!,
      to = route[leg + 1]!;
    const dx = to.x - from.x,
      dz = to.z - from.z;
    const length = Math.hypot(dx, dz);
    if (length < 0.01) continue;
    const nx = -dz / length,
      nz = dx / length;
    for (let travelled = 0; travelled < length; travelled += 1.6) {
      const t = travelled / length;
      const baseX = from.x + dx * t,
        baseZ = from.z + dz * t;
      for (const [index, offset] of offsets.entries()) {
        // Deterministic jitter avoids a parade that marches in perfect rows.
        const wobble = Math.sin(travelled * 1.7 + index * 2.3) * 0.55;
        const point = {
          x: baseX + nx * (offset + wobble),
          z: baseZ + nz * (offset + wobble) + Math.cos(travelled + index) * 0.4,
        };
        if (nav.open(point)) candidates.push(point);
      }
    }
  }
  if (candidates.length <= limit) return candidates;
  // Even stride over the collected order, which runs from the start of the route to the end.
  const step = candidates.length / limit;
  const spread: Point2[] = [];
  for (let i = 0; i < limit; i++) spread.push(candidates[Math.floor(i * step)]!);
  return spread;
}

/** Hundreds of individually reactive dancers rendered with six thin-instance batches. */
export class ParadeCrowd {
  public readonly system: ReactiveCrowd;
  private readonly nav: NavigationGrid;
  private readonly batches: {
    mesh: Mesh;
    matrices: Float32Array;
    offset: Vector3;
    size: Vector3;
    limb: number;
  }[] = [];
  private readonly near: { rig: NpcRig; id: number | null }[] = [];
  private readonly looks: Appearance[];
  private readonly models: FarNpcModels;
  private allocation = 1;
  private time = 0;
  private paintTime = 0;
  private readonly solids: Set<Mesh>;
  public constructor(
    private readonly scene: Scene,
    level: LevelDefinition,
    colliders: Mesh[],
    route: readonly Point2[],
    limit = PARADE_CROWD_SIZE,
  ) {
    this.solids = sightBlockers(colliders);
    this.nav = new NavigationGrid(level.navigationBounds!, navigationObstacles(colliders), 0.3);
    this.system = new ReactiveCrowd(crowdAlongRoute(route, this.nav, limit));
    this.models = new FarNpcModels(
      scene,
      this.system.people.map((p) => ({
        id: p.id,
        role: 'raver',
        position: () => ({ x: p.position.x, y: 0, z: p.position.z }),
        yaw: p.id * 2.399,
      })),
    );
    this.looks = diversifyFemaleGroup(
      this.system.people.map((p) => appearance('club_guest', p.id)),
    );
    for (let i = 0; i < 16; i++) {
      const rig = createNpc(
        scene,
        `parade-near-${i}`,
        npcPalette(scene, i),
        null,
        false,
        'club_guest',
      );
      rig.root.setEnabled(false);
      rig.castRole = 'raver';
      this.near.push({ rig, id: null });
    }
    const surface = material(scene, 'crowd-instance-white', '#ffffff');
    for (const [name, size, offset, limb] of [
      ['body', [0.55, 0.75, 0.35], [0, 1.1, 0], 0],
      ['head', [0.36, 0.4, 0.36], [0, 1.69, 0], 0],
      ['left-arm', [0.17, 0.65, 0.2], [-0.38, 1.12, 0], 1],
      ['right-arm', [0.17, 0.65, 0.2], [0.38, 1.12, 0], -1],
      ['left-leg', [0.22, 0.65, 0.25], [-0.16, 0.35, 0], 2],
      ['right-leg', [0.22, 0.65, 0.25], [0.16, 0.35, 0], -2],
    ] as const) {
      const mesh = MeshBuilder.CreateSphere(
        `parade-crowd-${name}`,
        { diameter: 1, segments: 5 },
        scene,
      );
      mesh.material = surface;
      mesh.isPickable = false;
      mesh.alwaysSelectAsActiveMesh = true;
      const matrices = new Float32Array(this.system.people.length * 16),
        colors = new Float32Array(this.system.people.length * 4);
      for (const p of this.system.people) {
        const outfit = this.looks[p.id]!;
        const color = Color3.FromHexString(
          name === 'head'
            ? outfit.skin
            : name.includes('leg')
              ? outfit.bottomColor
              : outfit.topColor,
        );
        colors.set([color.r, color.g, color.b, 1], p.id * 4);
      }
      mesh.thinInstanceSetBuffer('matrix', matrices, 16, false);
      mesh.thinInstanceSetBuffer('color', colors, 4, true);
      this.batches.push({
        mesh,
        matrices,
        offset: new Vector3(...offset),
        size: new Vector3(...size),
        limb,
      });
    }
    this.paint();
  }
  public canSee = (a: { x: number; z: number }, b: { x: number; z: number }): boolean => {
    const delta = new Vector3(b.x - a.x, 0, b.z - a.z),
      distance = delta.length();
    return (
      distance < 0.001 ||
      !this.scene.pickWithRay(
        new Ray(new Vector3(a.x, 1.3, a.z), delta.normalize(), distance),
        (m) => this.solids.has(m as Mesh),
      )?.hit
    );
  };
  public taunt(position: Position3): number {
    return this.system.taunt(position, this.canSee);
  }
  /** Head height of the nearest dancer who reacted, for a speech plate. */
  public get responder(): Position3 | null {
    const person = this.system.lastResponder;
    return person ? { x: person.position.x, y: 1.9, z: person.position.z } : null;
  }
  public update(delta: number): void {
    if (delta <= 0) return;
    this.time += delta;
    this.allocation += delta;
    const camera = this.scene.activeCamera;
    if (camera && this.allocation >= 0.4) {
      this.allocation = 0;
      const candidates = this.system.people
        .filter(
          (p) =>
            Math.hypot(p.position.x - camera.position.x, p.position.z - camera.position.z) < 16,
        )
        .sort(
          (a, b) =>
            Math.hypot(a.position.x - camera.position.x, a.position.z - camera.position.z) -
            Math.hypot(b.position.x - camera.position.x, b.position.z - camera.position.z),
        )
        .slice(0, this.near.length);
      for (const slot of this.near)
        if (!candidates.some((p) => p.id === slot.id)) {
          slot.id = null;
          slot.rig.root.setEnabled(false);
        }
      for (const p of candidates)
        if (!this.near.some((s) => s.id === p.id)) {
          const slot =
            this.near.find((s) => s.id === null && s.rig.appearance.seed === p.id) ??
            this.near.find((s) => s.id === null);
          if (!slot) break;
          slot.id = p.id;
          slot.rig.dressAppearance(this.looks[p.id]!);
          slot.rig.root.setEnabled(true);
        }
    }
    for (const slot of this.near) {
      if (slot.id === null) continue;
      const p = this.system.people[slot.id]!;
      slot.rig.root.position.set(p.position.x, 0, p.position.z);
      slot.rig.root.rotation.y = p.id * 2.399;
      if (this.scene.frustumPlanes && !slot.rig.head.isInFrustum(this.scene.frustumPlanes))
        continue;
      if (slot.rig.appearance.femaleStyle)
        animateFemale(slot.rig, this.time * (p.frightened ? 1.7 : 1), 'dance');
      else
        animateDance(
          slot.rig,
          p.id % 2 ? 'dance_club_01' : 'dance_club_02',
          this.time * (p.frightened ? 1.7 : 1),
          p.id,
          true,
        );
    }
    this.paintTime += delta;
    this.system.step(delta, (a, b) => this.nav.clear(a, b));
    if (this.paintTime >= 1 / 20) {
      this.paintTime = 0;
      this.paint();
    }
  }
  private paint(): void {
    const matrix = Matrix.Identity(),
      rotation = Quaternion.Identity(),
      position = Vector3.Zero();
    const nearIds = new Set(this.near.map((s) => s.id));
    if (this.scene.activeCamera)
      this.models.update(this.scene.activeCamera.globalPosition, nearIds);
    const hidden = Vector3.Zero();
    for (const batch of this.batches) {
      for (const p of this.system.people) {
        const dance = Math.sin(this.time * (p.frightened ? 11 : 3) + p.id);
        const angle =
          batch.limb === 0
            ? dance * 0.05
            : Math.sign(batch.limb) *
              (Math.abs(batch.limb) === 1
                ? (p.frightened ? 1.8 : 0.6) + dance * 0.3
                : dance * 0.16);
        Quaternion.FromEulerAnglesToRef(0, 0, angle, rotation);
        position.set(
          p.position.x + batch.offset.x,
          batch.offset.y + Math.abs(dance) * 0.06,
          p.position.z,
        );
        Matrix.ComposeToRef(
          nearIds.has(p.id) || this.models.has(p.id) ? hidden : batch.size,
          rotation,
          position,
          matrix,
        );
        matrix.copyToArray(batch.matrices, p.id * 16);
      }
      batch.mesh.thinInstanceBufferUpdated('matrix');
    }
  }
  public dispose(): void {
    this.models.dispose();
    for (const slot of this.near) slot.rig.dispose();
    for (const batch of this.batches) batch.mesh.dispose();
  }
}
