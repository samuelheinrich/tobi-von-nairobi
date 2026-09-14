import type { Point2 } from '../navigation/navigation-grid.js';

export interface CrowdPerson {
  id: number;
  home: Point2;
  position: Point2;
  frightened: number;
  direction: Point2;
}
/** Lightweight individually addressable crowd; collision is provided by the level adapter. */
export class ReactiveCrowd {
  public readonly people: CrowdPerson[];
  public readonly taunted = new Set<number>();
  public readonly charmed = new Set<number>();
  public constructor(positions: readonly Point2[]) {
    this.people = positions.map((p, id) => ({
      id,
      home: { x: p.x, z: p.z },
      position: { x: p.x, z: p.z },
      frightened: 0,
      direction: { x: 0, z: 1 },
    }));
  }
  public frighten(id: number, source: Point2): boolean {
    const p = this.people[id];
    if (!p) return false;
    const dx = p.position.x - source.x,
      dz = p.position.z - source.z,
      length = Math.hypot(dx, dz) || 1;
    p.direction = { x: dx / length, z: dz / length };
    p.frightened = 3;
    this.taunted.add(id);
    return true;
  }
  /** The closest person who reacted to the last taunt, so a caller can anchor a reply. */
  public lastResponder: CrowdPerson | undefined;

  public taunt(source: Point2, canSee: (a: Point2, b: Point2) => boolean): number {
    let count = 0;
    let nearest = Infinity;
    this.lastResponder = undefined;
    for (const p of this.people) {
      const distance = Math.hypot(p.position.x - source.x, p.position.z - source.z);
      if (distance > 8 || !canSee(source, p.position)) continue;
      this.frighten(p.id, source);
      count++;
      if (distance < nearest) {
        nearest = distance;
        this.lastResponder = p;
      }
    }
    return count;
  }
  /** Closest person Tobi can actually see, used for one-to-one interactions such as flirting. */
  public nearestVisible(
    source: Point2,
    range: number,
    canSee: (a: Point2, b: Point2) => boolean,
  ): CrowdPerson | undefined {
    let best: CrowdPerson | undefined;
    let bestDistance = range;
    for (const p of this.people) {
      const distance = Math.hypot(p.position.x - source.x, p.position.z - source.z);
      if (distance > bestDistance || p.frightened > 0) continue;
      if (!canSee(source, p.position)) continue;
      best = p;
      bestDistance = distance;
    }
    if (best) this.charmed.add(best.id);
    return best;
  }
  public step(delta: number, clear: (a: Point2, b: Point2) => boolean): void {
    for (const p of this.people) {
      if (p.frightened > 0) {
        p.frightened = Math.max(0, p.frightened - delta);
        const next = {
          x: p.position.x + p.direction.x * delta * 2.4,
          z: p.position.z + p.direction.z * delta * 2.4,
        };
        if (clear(p.position, next)) p.position = next;
      } else {
        const dx = p.home.x - p.position.x,
          dz = p.home.z - p.position.z,
          distance = Math.hypot(dx, dz);
        if (distance > 0.1) {
          const amount = Math.min(distance, delta * 0.8),
            next = {
              x: p.position.x + (dx / distance) * amount,
              z: p.position.z + (dz / distance) * amount,
            };
          if (clear(p.position, next)) p.position = next;
        }
      }
    }
  }
}
