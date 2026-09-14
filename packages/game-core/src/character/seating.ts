import type { Position3 } from '@tobi/contracts';

/** A stable seat/toilet anchor and its author-validated, unobstructed aisle exit. */
export interface RestSpot {
  id: string;
  label: string;
  kind: 'seat' | 'toilet';
  position: Position3;
  exit: Position3;
  yaw: number;
}

/** Engine-independent posture. Only an explicit interaction enters or leaves a spot. */
export class Seating {
  public active: RestSpot | null = null;
  public nearest(position: Position3, spots: readonly RestSpot[]): RestSpot | null {
    let best: RestSpot | null = null;
    let distance = 1.65;
    for (const spot of spots) {
      const d = Math.hypot(position.x - spot.exit.x, position.z - spot.exit.z);
      if (Math.abs(position.y - spot.exit.y) < 0.75 && d < distance) {
        distance = d;
        best = spot;
      }
    }
    return best;
  }
  public enter(spot: RestSpot): Position3 {
    this.active = spot;
    return { ...spot.position };
  }
  public leave(): Position3 | null {
    const exit = this.active ? { ...this.active.exit } : null;
    this.active = null;
    return exit;
  }
}
