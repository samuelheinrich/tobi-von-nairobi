#!/usr/bin/env node
/** Sweep all three carriage footprints over the Blender route against static walls. */
import { readFileSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const read = (name) => JSON.parse(readFileSync(new URL(name, root), 'utf8'));
const level = read('assets/game/levels/zurich-rail/zurich-rail.runtime.json');
const collisions = read('assets/game/levels/zurich-rail/zurich-rail.collision.json');
const geometry = read('tools/levels/geometry/zurich_street_parade.json');
const marker = level.vehicleRoutes[0];
if (!marker?.points?.length || marker.stopDistances?.length !== 2)
  throw Error('Blender export must include the S16 route and both stops.');

const points = marker.points;
const cumulative = [0];
for (let i = 1; i < points.length; i++)
  cumulative.push(
    cumulative.at(-1) +
      Math.hypot(points[i][0] - points[i - 1][0], points[i][2] - points[i - 1][2]),
  );
const total = cumulative.at(-1);
const sample = (distance) => {
  const d = Math.min(total, Math.max(0, distance));
  let segment = cumulative.length - 2;
  for (let i = 0; i + 1 < cumulative.length; i++)
    if (d <= cumulative[i + 1]) {
      segment = i;
      break;
    }
  const a = points[segment],
    b = points[segment + 1];
  const t = (d - cumulative[segment]) / (cumulative[segment + 1] - cumulative[segment]);
  const dx = b[0] - a[0],
    dz = b[2] - a[2],
    length = Math.hypot(dx, dz);
  return { centre: [a[0] + dx * t, a[2] + dz * t], forward: [dx / length, dz / length] };
};
const rect = (centre, side, forward, halfSide, halfForward) => ({
  centre,
  axes: [side, forward],
  half: [halfSide, halfForward],
});
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const overlap = (a, b) => {
  for (const axis of [...a.axes, ...b.axes]) {
    const radius = (r) =>
      r.half[0] * Math.abs(dot(axis, r.axes[0])) + r.half[1] * Math.abs(dot(axis, r.axes[1]));
    if (
      Math.abs(dot(axis, [a.centre[0] - b.centre[0], a.centre[1] - b.centre[1]])) >=
      radius(a) + radius(b)
    )
      return false;
  }
  return true;
};
const polygonOverlap = (box, vertices) => {
  const corners = [-1, 1].flatMap((x) =>
    [-1, 1].map((z) => [
      box.centre[0] + x * box.axes[0][0] * box.half[0] + z * box.axes[1][0] * box.half[1],
      box.centre[1] + x * box.axes[0][1] * box.half[0] + z * box.axes[1][1] * box.half[1],
    ]),
  );
  const axes = [...box.axes];
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i],
      b = vertices[(i + 1) % vertices.length],
      edge = [b[0] - a[0], b[1] - a[1]];
    const length = Math.hypot(...edge);
    if (length > 1e-6) axes.push([-edge[1] / length, edge[0] / length]);
  }
  return axes.every((axis) => {
    const left = corners.map((point) => dot(point, axis)),
      right = vertices.map((point) => dot(point, axis));
    return (
      Math.min(Math.max(...left), Math.max(...right)) >
      Math.max(Math.min(...left), Math.min(...right))
    );
  });
};
const walls = [];
for (const b of geometry.bodies) {
  if (!/city-quay-parapet|hb-side-wall|stadelhofen-end-wall|zurich-facade|hb-buffer/.test(b.name))
    continue;
  if (b.max[1] < 0.45 || b.min[1] > 3.1) continue;
  walls.push({
    id: b.name,
    rect: rect(
      [(b.min[0] + b.max[0]) / 2, (b.min[2] + b.max[2]) / 2],
      [1, 0],
      [0, 1],
      (b.max[0] - b.min[0]) / 2,
      (b.max[2] - b.min[2]) / 2,
    ),
  });
}
for (const c of collisions.colliders) {
  if (c.shape === 'mesh') {
    const triangles = [];
    for (let i = 0; i < c.indices.length; i += 3) {
      const points = c.indices
        .slice(i, i + 3)
        .map((index) => c.vertices.slice(index * 3, index * 3 + 3));
      if (
        Math.min(...points.map((point) => point[1])) > 3.1 ||
        Math.max(...points.map((point) => point[1])) < 0.45
      )
        continue;
      triangles.push(points.map((point) => [point[0], point[2]]));
    }
    walls.push({ id: c.id, triangles });
    continue;
  }
  if (c.shape !== 'box' || c.position[1] > 3.1 || (c.walkable && c.size[1] < 1)) continue;
  const [x, y, z, w] = c.rotation;
  const side = [1 - 2 * (y * y + z * z), 2 * (x * z - y * w)];
  const forward = [2 * (x * z + y * w), 1 - 2 * (x * x + y * y)];
  walls.push({
    id: c.id,
    rect: rect([c.position[0], c.position[2]], side, forward, c.size[0] / 2, c.size[2] / 2),
  });
}
const hits = new Map();
const from = total * marker.stopDistances[0],
  to = total * marker.stopDistances[1];
for (let d = from; d <= to; d += 0.5)
  for (const carriage of [-1, 0, 1]) {
    const { centre, forward } = sample(d + carriage * 12.2);
    const train = rect(centre, [forward[1], -forward[0]], forward, 1.575 + 0.12, 5.75 + 0.12);
    for (const wall of walls)
      if (
        wall.rect
          ? overlap(train, wall.rect)
          : wall.triangles.some((triangle) => polygonOverlap(train, triangle))
      )
        hits.set(wall.id, { wall: wall.id, metresFromHB: +(d - from).toFixed(1), carriage });
  }
const result = {
  status: hits.size ? 'ERROR' : 'PASS',
  sampledMetres: +(to - from).toFixed(1),
  cars: 3,
  staticWalls: walls.length,
  collisions: [...hits.values()],
};
console.log(JSON.stringify(result, null, 2));
if (hits.size) process.exitCode = 1;
