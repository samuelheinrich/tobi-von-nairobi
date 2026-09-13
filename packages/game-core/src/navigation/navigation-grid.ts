export interface Point2 {
  x: number;
  z: number;
}
export interface Obstacle {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}
export const distance2 = (a: Point2, b: Point2): number => Math.hypot(a.x - b.x, a.z - b.z);

/** Small, static ground grid. Inflated colliders keep agent bodies clear of walls.
 * Four-way BFS is deliberately bounded; no diagonal corner cutting or random fallback moves.
 */
export class NavigationGrid {
  private readonly nodes: Point2[] = [];
  private readonly free: boolean[] = [];
  private readonly width: number;
  private readonly height: number;
  public constructor(
    private readonly bounds: Obstacle,
    private readonly obstacles: readonly Obstacle[],
    private readonly radius = 0.5,
  ) {
    this.width = Math.floor(bounds.maxX - bounds.minX) + 1;
    this.height = Math.floor(bounds.maxZ - bounds.minZ) + 1;
    for (let z = 0; z < this.height; z++)
      for (let x = 0; x < this.width; x++) {
        const p = { x: bounds.minX + x, z: bounds.minZ + z };
        this.nodes.push(p);
        this.free.push(this.open(p));
      }
  }
  public open(p: Point2, radius = this.radius): boolean {
    return (
      p.x >= this.bounds.minX &&
      p.x <= this.bounds.maxX &&
      p.z >= this.bounds.minZ &&
      p.z <= this.bounds.maxZ &&
      !this.obstacles.some(
        (o) =>
          p.x >= o.minX - radius &&
          p.x <= o.maxX + radius &&
          p.z >= o.minZ - radius &&
          p.z <= o.maxZ + radius,
      )
    );
  }
  public clear(from: Point2, to: Point2, radius = this.radius): boolean {
    if (!this.open(from, radius) || !this.open(to, radius)) return false;
    // Exact segment/rectangle intersection, including thin walls between grid nodes.
    return !this.obstacles.some((o) => {
      let enter = 0,
        leave = 1;
      for (const [origin, direction, min, max] of [
        [from.x, to.x - from.x, o.minX - radius, o.maxX + radius],
        [from.z, to.z - from.z, o.minZ - radius, o.maxZ + radius],
      ] as const) {
        if (Math.abs(direction) < 1e-9) {
          if (origin < min || origin > max) return false;
          continue;
        }
        const a = (min - origin) / direction,
          b = (max - origin) / direction;
        enter = Math.max(enter, Math.min(a, b));
        leave = Math.min(leave, Math.max(a, b));
        if (enter > leave) return false;
      }
      return true;
    });
  }
  public canSee(from: Point2, to: Point2): boolean {
    return this.clear(from, to, 0);
  }

  private nearest(p: Point2): number {
    let best = -1,
      bestDistance = Infinity;
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      if (!node || !this.free[i]) continue;
      const distance = distance2(node, p);
      if (distance < bestDistance) {
        best = i;
        bestDistance = distance;
      }
    }
    return best;
  }
  public path(from: Point2, target: Point2): Point2[] {
    if (this.clear(from, target)) return [{ x: target.x, z: target.z }];
    const start = this.nearest(from),
      goal = this.nearest(target);
    if (start < 0 || goal < 0) return [];
    const first = this.nodes[start];
    if (!first || !this.clear(from, first)) return [];
    const parent = new Map<number, number>([[start, -1]]);
    const queue = [start];
    for (let head = 0; head < queue.length && !parent.has(goal); head++) {
      const current = queue[head];
      if (current === undefined) break;
      const x = current % this.width;
      const neighbours = [current - this.width, current + this.width];
      if (x > 0) neighbours.push(current - 1);
      if (x < this.width - 1) neighbours.push(current + 1);
      for (const next of neighbours) {
        if (!this.free[next] || parent.has(next)) continue;
        const a = this.nodes[current],
          b = this.nodes[next];
        if (!a || !b || !this.clear(a, b)) continue;
        parent.set(next, current);
        queue.push(next);
      }
    }
    if (!parent.has(goal)) return [];
    const route: Point2[] = [];
    for (let cursor = goal; cursor !== -1; cursor = parent.get(cursor) ?? -1) {
      const node = this.nodes[cursor];
      if (node) route.push(node);
    }
    return route.reverse();
  }
}
