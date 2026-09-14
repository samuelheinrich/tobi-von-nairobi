import { describe, expect, it } from 'vitest';
import { NavigationGrid, type Obstacle, type Point2 } from './navigation-grid.js';

const bounds: Obstacle = { minX: -30, maxX: 30, minZ: -30, maxZ: 30 };
// A deterministic sprinkle of rectangles, wide enough to span several spatial buckets.
const obstacles: Obstacle[] = Array.from({ length: 40 }, (_, i) => {
  const x = ((i * 7) % 55) - 27;
  const z = ((i * 13) % 55) - 27;
  const width = 1 + (i % 5) * 2.5;
  const depth = 1 + (i % 3) * 4;
  return { minX: x, maxX: x + width, minZ: z, maxZ: z + depth };
});

/** Reference implementation: the predicate before obstacles were bucketed. */
const openBrute = (p: Point2, radius: number): boolean =>
  p.x >= bounds.minX &&
  p.x <= bounds.maxX &&
  p.z >= bounds.minZ &&
  p.z <= bounds.maxZ &&
  !obstacles.some(
    (o) =>
      p.x >= o.minX - radius &&
      p.x <= o.maxX + radius &&
      p.z >= o.minZ - radius &&
      p.z <= o.maxZ + radius,
  );

describe('bucketed navigation grid', () => {
  const grid = new NavigationGrid(bounds, obstacles, 0.5);

  it('answers `open` exactly like a scan over every obstacle', () => {
    const mismatches: Point2[] = [];
    for (let x = -30; x <= 30; x += 0.5)
      for (let z = -30; z <= 30; z += 0.5)
        if (grid.open({ x, z }) !== openBrute({ x, z }, 0.5)) mismatches.push({ x, z });
    expect(mismatches).toEqual([]);
  });

  it('blocks a segment through a wall and allows one beside it', () => {
    const wall: Obstacle = { minX: -1, maxX: 1, minZ: -8, maxZ: 8 };
    const thin = new NavigationGrid(bounds, [wall], 0.3);
    expect(thin.clear({ x: -5, z: 0 }, { x: 5, z: 0 })).toBe(false);
    expect(thin.clear({ x: -5, z: 12 }, { x: 5, z: 12 })).toBe(true);
  });

  it('finds a route around an obstacle and reports none when the goal is walled in', () => {
    const room: Obstacle[] = [
      { minX: -4, maxX: 4, minZ: 4, maxZ: 5 },
      { minX: -4, maxX: 4, minZ: 9, maxZ: 10 },
      { minX: -4, maxX: -3, minZ: 4, maxZ: 10 },
      { minX: 3, maxX: 4, minZ: 4, maxZ: 10 },
    ];
    const sealed = new NavigationGrid(bounds, room, 0.4);
    expect(sealed.path({ x: 0, z: -10 }, { x: 0, z: 7 })).toEqual([]);
    const route = sealed.path({ x: -10, z: 7 }, { x: 10, z: 7 });
    expect(route.length).toBeGreaterThan(1);
    expect(route.every((step) => sealed.open(step))).toBe(true);
  });
});
