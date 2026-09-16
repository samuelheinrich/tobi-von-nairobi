#!/usr/bin/env node
/** Read-only train GLB inventory. Originals are never rewritten. */
import { readdirSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { readGlb, summarise } from '../models/glb.mjs';

const directory = resolve(process.argv[2] ?? 'models/objects/trains');
const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const multiply = (a, b) => {
  const out = Array(16).fill(0);
  for (let column = 0; column < 4; column++)
    for (let row = 0; row < 4; row++)
      for (let k = 0; k < 4; k++) out[column * 4 + row] += a[k * 4 + row] * b[column * 4 + k];
  return out;
};
const localMatrix = (node) => {
  if (node.matrix) return node.matrix;
  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1],
    [sx, sy, sz] = node.scale ?? [1, 1, 1],
    [tx, ty, tz] = node.translation ?? [0, 0, 0];
  return [
    (1 - 2 * y * y - 2 * z * z) * sx,
    (2 * x * y + 2 * w * z) * sx,
    (2 * x * z - 2 * w * y) * sx,
    0,
    (2 * x * y - 2 * w * z) * sy,
    (1 - 2 * x * x - 2 * z * z) * sy,
    (2 * y * z + 2 * w * x) * sy,
    0,
    (2 * x * z + 2 * w * y) * sz,
    (2 * y * z - 2 * w * x) * sz,
    (1 - 2 * x * x - 2 * y * y) * sz,
    0,
    tx,
    ty,
    tz,
    1,
  ];
};
const transform = (m, [x, y, z]) => [
  m[0] * x + m[4] * y + m[8] * z + m[12],
  m[1] * x + m[5] * y + m[9] * z + m[13],
  m[2] * x + m[6] * y + m[10] * z + m[14],
];
function dimensions(json) {
  const min = [Infinity, Infinity, Infinity],
    max = [-Infinity, -Infinity, -Infinity];
  const visit = (index, parent) => {
    const node = json.nodes[index],
      world = multiply(parent, localMatrix(node));
    if (node.mesh !== undefined)
      for (const primitive of json.meshes[node.mesh].primitives ?? []) {
        const accessor = json.accessors[primitive.attributes.POSITION];
        if (!accessor.min || !accessor.max) continue;
        for (const x of [accessor.min[0], accessor.max[0]])
          for (const y of [accessor.min[1], accessor.max[1]])
            for (const z of [accessor.min[2], accessor.max[2]]) {
              const point = transform(world, [x, y, z]);
              for (let axis = 0; axis < 3; axis++) {
                min[axis] = Math.min(min[axis], point[axis]);
                max[axis] = Math.max(max[axis], point[axis]);
              }
            }
      }
    for (const child of node.children ?? []) visit(child, world);
  };
  for (const root of json.scenes[json.scene ?? 0]?.nodes ?? []) visit(root, identity);
  return max.map((value, axis) => Number((value - min[axis]).toFixed(2)));
}

const reports = readdirSync(directory)
  .filter((name) => name.toLowerCase().endsWith('.glb'))
  .sort()
  .map((name) => {
    const path = join(directory, name),
      summary = summarise(path),
      { json } = readGlb(path);
    const triangleBudget = summary.triangles <= 120_000 ? 'candidate' : 'reference_only';
    return {
      file: basename(path),
      megabytes: Number(summary.megabytes.toFixed(1)),
      triangles: summary.triangles,
      meshes: summary.meshes,
      materials: summary.materials,
      textures: summary.images.length,
      dimensionsMetres: dimensions(json),
      skeleton: summary.joints > 0,
      animations: summary.animations,
      licence: summary.licence,
      author: summary.author,
      suitability: triangleBudget,
    };
  });
console.log(JSON.stringify({ directory, generatedAt: new Date().toISOString(), reports }, null, 2));
