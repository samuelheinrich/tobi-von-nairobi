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

const BUCKET_METRES = 8;

/** Small, static ground grid. Inflated colliders keep agent bodies clear of walls.
 * Four-way BFS is deliberately bounded; no diagonal corner cutting or random fallback moves.
 * Obstacles are bucketed so a query touches only nearby rectangles: the larger city levels
 * keep the same predicates without a per-call scan over every collider.
 */
export class NavigationGrid {
  private readonly nodes: Point2[] = [];
  private readonly free: boolean[] = [];
  private readonly width: number;
  private readonly height: number;
  private readonly buckets = new Map<number, number[]>();
  private readonly visited: Int32Array;
  private visitMark = 0;
  public constructor(
    private readonly bounds: Obstacle,
    private readonly obstacles: readonly Obstacle[],
    private readonly radius = 0.5,
  ) {
    this.visited = new Int32Array(obstacles.length);
    for (const [index, obstacle] of obstacles.entries())
      for (
        let cx = Math.floor(obstacle.minX / BUCKET_METRES);
        cx <= Math.floor(obstacle.maxX / BUCKET_METRES);
        cx++
      )
        for (
          let cz = Math.floor(obstacle.minZ / BUCKET_METRES);
          cz <= Math.floor(obstacle.maxZ / BUCKET_METRES);
          cz++
        ) {
          const key = cx * 73856093 + cz;
          const bucket = this.buckets.get(key);
          if (bucket) bucket.push(index);
          else this.buckets.set(key, [index]);
        }
    this.width = Math.floor(bounds.maxX - bounds.minX) + 1;
    this.height = Math.floor(bounds.maxZ - bounds.minZ) + 1;
    for (let z = 0; z < this.height; z++)
      for (let x = 0; x < this.width; x++) {
        const p = { x: bounds.minX + x, z: bounds.minZ + z };
        this.nodes.push(p);
        this.free.push(this.open(p));
      }
  }

  /** Visits every obstacle whose bucket overlaps the query box; stops when `hit` returns true. */
  private anyNear(
    minX: number,
    maxX: number,
    minZ: number,
    maxZ: number,
    hit: (obstacle: Obstacle) => boolean,
  ): boolean {
    const mark = ++this.visitMark;
    for (let cx = Math.floor(minX / BUCKET_METRES); cx <= Math.floor(maxX / BUCKET_METRES); cx++)
      for (
        let cz = Math.floor(minZ / BUCKET_METRES);
        cz <= Math.floor(maxZ / BUCKET_METRES);
        cz++
      ) {
        const bucket = this.buckets.get(cx * 73856093 + cz);
        if (!bucket) continue;
        for (const index of bucket) {
          if (this.visited[index] === mark) continue;
          this.visited[index] = mark;
          const obstacle = this.obstacles[index];
          if (obstacle && hit(obstacle)) return true;
        }
      }
    return false;
  }

  public open(p: Point2, radius = this.radius): boolean {
    return (
      p.x >= this.bounds.minX &&
      p.x <= this.bounds.maxX &&
      p.z >= this.bounds.minZ &&
      p.z <= this.bounds.maxZ &&
      !this.anyNear(
        p.x - radius,
        p.x + radius,
        p.z - radius,
        p.z + radius,
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
    return !this.anyNear(
      Math.min(from.x, to.x) - radius,
      Math.max(from.x, to.x) + radius,
      Math.min(from.z, to.z) - radius,
      Math.max(from.z, to.z) + radius,
      (o) => {
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
      },
    );
  }
  public canSee(from: Point2, to: Point2): boolean {
    return this.clear(from, to, 0);
  }

  /** Nearest free node by Euclidean distance, ties resolved by the lower grid index. */
  private nearest(p: Point2): number {
    const centreX = Math.round(p.x - this.bounds.minX);
    const centreZ = Math.round(p.z - this.bounds.minZ);
    let best = -1;
    let bestDistance = Infinity;
    const consider = (x: number, z: number): void => {
      if (x < 0 || x >= this.width || z < 0 || z >= this.height) return;
      const index = z * this.width + x;
      const node = this.nodes[index];
      if (!node || !this.free[index]) return;
      const distance = distance2(node, p);
      if (distance < bestDistance || (distance === bestDistance && index < best)) {
        best = index;
        bestDistance = distance;
      }
    };
    const maxRing = Math.max(this.width, this.height);
    for (let ring = 0; ring <= maxRing; ring++) {
      // A node on ring r is at least r - 1 metres away, so one extra ring proves optimality.
      if (best >= 0 && ring > bestDistance + 1) break;
      if (ring === 0) consider(centreX, centreZ);
      else {
        for (let d = -ring; d <= ring; d++) {
          consider(centreX + d, centreZ - ring);
          consider(centreX + d, centreZ + ring);
          consider(centreX - ring, centreZ + d);
          consider(centreX + ring, centreZ + d);
        }
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
