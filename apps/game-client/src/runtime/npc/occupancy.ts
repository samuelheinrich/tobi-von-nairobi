import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { CharacterRig } from '../character/modular/rig.js';
import { findGroundedSpawn } from '../physics/ground-detection.js';

interface Occupant {
  rig: CharacterRig;
  seated: boolean;
  radius: number;
  validated: boolean;
  owner: string;
}

export interface NpcOccupancyDebug {
  id: string;
  position: readonly [number, number, number];
  radius: number;
  seated: boolean;
  seatAnchor: string | null;
  occupiedBy: string | null;
  overlapping: boolean;
}

const registries = new WeakMap<Scene, NpcOccupancy>();
const CELL = 1;
const key = (position: Vector3) =>
  `${Math.floor(position.x / CELL)}:${Math.floor(position.z / CELL)}`;

/**
 * Scene-wide lightweight occupancy. It validates deferred level spawns, owns SeatAnchors and
 * applies a small steering separation without introducing a second crowd/physics simulation.
 */
class NpcOccupancy {
  private readonly occupants = new Set<Occupant>();
  private readonly warned = new Set<string>();

  constructor(private readonly scene: Scene) {
    scene.onBeforeRenderObservable.add(() => this.update());
    scene.onDisposeObservable.add(() => this.occupants.clear());
  }

  add(rig: CharacterRig, seated: boolean): void {
    const occupant: Occupant = {
      rig,
      seated,
      radius: 0.28 * Math.max(0.7, rig.root.scaling.x),
      validated: false,
      owner: `${rig.root.name}:${rig.root.uniqueId}`,
    };
    this.occupants.add(occupant);
    rig.root.onDisposeObservable.addOnce(() => {
      rig.seatAnchor?.release(occupant.owner);
      this.occupants.delete(occupant);
    });
  }

  private position(occupant: Occupant): Vector3 {
    return occupant.rig.seatAnchor?.worldPosition ?? occupant.rig.root.getAbsolutePosition();
  }

  private neighbours(
    occupant: Occupant,
    position: Vector3,
    grid: ReadonlyMap<string, readonly Occupant[]>,
  ): Occupant[] {
    const cx = Math.floor(position.x / CELL);
    const cz = Math.floor(position.z / CELL);
    const result: Occupant[] = [];
    for (let x = cx - 1; x <= cx + 1; x++)
      for (let z = cz - 1; z <= cz + 1; z++)
        for (const other of grid.get(`${x}:${z}`) ?? []) if (other !== occupant) result.push(other);
    return result;
  }

  private areaFree(occupant: Occupant, position: Vector3, accepted: readonly Occupant[]): boolean {
    return accepted.every((other) => {
      const at = this.position(other);
      if (Math.abs(at.y - position.y) > 1.1) return true;
      return Math.hypot(at.x - position.x, at.z - position.z) >= occupant.radius + other.radius;
    });
  }

  private validateSpawns(active: Occupant[]): void {
    const accepted: Occupant[] = [];
    for (const occupant of active) {
      if (occupant.validated) {
        accepted.push(occupant);
        continue;
      }
      const anchor = occupant.rig.seatAnchor;
      if (anchor) {
        if (!anchor.claim(occupant.owner)) {
          console.warn(
            `[npc-occupancy] seat ${anchor.id} already belongs to ${anchor.occupiedBy}; ${occupant.owner} disabled`,
          );
          occupant.rig.root.setEnabled(false);
        }
        occupant.validated = true;
        accepted.push(occupant);
        continue;
      }
      const origin = this.position(occupant);
      if (!this.areaFree(occupant, origin, accepted)) {
        let replacement: Vector3 | null = null;
        for (let ring = 1; ring <= 5 && !replacement; ring++) {
          const distance = ring * (occupant.radius * 2 + 0.08);
          for (let step = 0; step < 12; step++) {
            const angle = (step / 12) * Math.PI * 2 + occupant.rig.appearance.seed * 0.37;
            const candidate = origin.add(
              new Vector3(Math.sin(angle) * distance, 0, Math.cos(angle) * distance),
            );
            const grounded = findGroundedSpawn(this.scene, candidate) ?? candidate;
            if (this.areaFree(occupant, grounded, accepted)) {
              replacement = grounded;
              break;
            }
          }
        }
        if (replacement) occupant.rig.root.setAbsolutePosition(replacement);
      }
      occupant.validated = true;
      accepted.push(occupant);
    }
  }

  private update(): void {
    const active = [...this.occupants].filter(
      (entry) => !entry.rig.root.isDisposed() && entry.rig.root.isEnabled(),
    );
    this.validateSpawns(active);
    const grid = new Map<string, Occupant[]>();
    for (const occupant of active) {
      const bucket = grid.get(key(this.position(occupant))) ?? [];
      bucket.push(occupant);
      grid.set(key(this.position(occupant)), bucket);
    }
    const overlaps = new Set<Occupant>();
    const handled = new Set<string>();
    for (const occupant of active) {
      const at = this.position(occupant);
      for (const other of this.neighbours(occupant, at, grid)) {
        const pair = [occupant.owner, other.owner].sort().join('|');
        if (handled.has(pair)) continue;
        handled.add(pair);
        const there = this.position(other);
        if (Math.abs(at.y - there.y) > 1.1) continue;
        let dx = at.x - there.x,
          dz = at.z - there.z,
          distance = Math.hypot(dx, dz);
        const minimum = occupant.radius + other.radius;
        // Closely spaced authored seats are legitimate; only duplicate anchors are an error.
        if (distance >= minimum || (occupant.seated && other.seated)) continue;
        overlaps.add(occupant);
        overlaps.add(other);
        if (distance < 0.001) {
          const angle = occupant.rig.appearance.seed * 1.618 + other.rig.appearance.seed;
          dx = Math.sin(angle);
          dz = Math.cos(angle);
          distance = 1;
        }
        const push = Math.min(0.07, (minimum - distance) * 0.5);
        const move = (target: Occupant, direction: number) => {
          if (target.seated || target.rig.seatAnchor) return;
          const current = target.rig.root.getAbsolutePosition();
          const candidate = current.add(
            new Vector3((dx / distance) * push * direction, 0, (dz / distance) * push * direction),
          );
          const grounded = findGroundedSpawn(this.scene, candidate);
          target.rig.root.setAbsolutePosition(grounded ?? candidate);
        };
        move(occupant, 1);
        move(other, -1);
        if (!this.warned.has(pair)) {
          this.warned.add(pair);
          console.warn(
            `[npc-occupancy] overlap separated: ${occupant.owner} / ${other.owner} (${distance.toFixed(2)}m)`,
          );
        }
      }
    }
    const debug: NpcOccupancyDebug[] = active.map((occupant) => {
      const at = this.position(occupant);
      return {
        id: occupant.owner,
        position: [at.x, at.y, at.z],
        radius: occupant.radius,
        seated: occupant.seated || !!occupant.rig.seatAnchor,
        seatAnchor: occupant.rig.seatAnchor?.id ?? null,
        occupiedBy: occupant.rig.seatAnchor?.occupiedBy ?? null,
        overlapping: overlaps.has(occupant),
      };
    });
    this.scene.metadata = { ...this.scene.metadata, npcOccupancy: debug };
  }
}

export function registerNpcOccupancy(scene: Scene, rig: CharacterRig, seated: boolean): void {
  let occupancy = registries.get(scene);
  if (!occupancy) {
    occupancy = new NpcOccupancy(scene);
    registries.set(scene, occupancy);
  }
  occupancy.add(rig, seated);
}
