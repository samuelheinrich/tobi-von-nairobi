import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Parts, Finish, V3 } from './geometry.js';
import type { Appearance } from './presets.js';
import { faceSurface, sectionAt, gauss, type FaceProfile } from './face-profile.js';

/** Shared indexed patch builder; no separate material/texture per face feature. */
export function patch(
  scene: Scene,
  parts: Parts,
  name: string,
  rows: number,
  columns: number,
  point: (u: number, v: number) => V3,
  color: string,
  finish: Finish = 'skin',
  vertexColor?: (p: V3) => Color3,
  frontFacing = false,
) {
  const positions: number[] = [],
    indices: number[] = [],
    normals: number[] = [],
    colors: number[] = [];
  for (let r = 0; r <= rows; r++)
    for (let c = 0; c <= columns; c++) {
      const p = point(c / columns, r / rows);
      positions.push(...p);
      if (vertexColor) {
        const rgb = vertexColor(p);
        colors.push(rgb.r, rgb.g, rgb.b, 1);
      }
    }
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < columns; c++) {
      const a = r * (columns + 1) + c,
        b = a + columns + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  VertexData.ComputeNormals(positions, indices, normals);
  if (frontFacing && normals.filter((_, i) => i % 3 === 2).reduce((a, b) => a + b, 0) < 0) {
    for (let i = 0; i < indices.length; i += 3)
      [indices[i + 1], indices[i + 2]] = [indices[i + 2]!, indices[i + 1]!];
    VertexData.ComputeNormals(positions, indices, normals);
  }
  const data = new VertexData();
  data.positions = positions;
  data.indices = indices;
  data.normals = normals;
  data.uvs = new Float32Array((positions.length / 3) * 2);
  const mesh = new Mesh(name, scene);
  data.applyToMesh(mesh);
  parts.include(mesh, color, finish);
  if (vertexColor) mesh.setVerticesData('color', colors);
  return mesh;
}
/** Tapered swept geometry for lids, lips, brows and ear folds; budget typically 60–180 triangles. */
export function ribbon(
  scene: Scene,
  parts: Parts,
  name: string,
  path: (t: number) => V3,
  width: (t: number) => number,
  depth: number,
  color: string,
  finish: Finish = 'skin',
  steps = 12,
) {
  return patch(
    scene,
    parts,
    name,
    6,
    steps,
    (u, v) => {
      const p = path(u),
        before = path(Math.max(0, u - 0.001)),
        after = path(Math.min(1, u + 0.001));
      const dx = after[0] - before[0],
        dy = after[1] - before[1],
        length = Math.hypot(dx, dy) || 1,
        angle = v * Math.PI * 2,
        w = Math.cos(angle) * width(u);
      return [p[0] - (dy / length) * w, p[1] + (dx / length) * w, p[2] + Math.sin(angle) * depth];
    },
    color,
    finish,
  );
}
export function sculptHead(scene: Scene, parts: Parts, a: Appearance, p: FaceProfile) {
  const skin = Color3.FromHexString(a.skin),
    warm = Color3.FromHexString('#b85d52'),
    shadow = skin.scale(0.76);
  return patch(
    scene,
    parts,
    'sculpted-head',
    48,
    64,
    (u, v) => {
      const y = -0.258 + v * (p.crown + 0.27),
        angle = u * Math.PI * 2;
      const [width, front, back] = sectionAt(y, p) as [number, number, number];
      const x = Math.sin(angle) * width,
        cos = Math.cos(angle);
      const z = cos >= 0 ? faceSurface(x, y, p) : back * cos;
      return [x, y, z];
    },
    a.skin,
    'skin',
    ([x, y, z]) => {
      if (z < 0) return skin;
      const cheeks = gauss(Math.abs(x) - p.cheek * 0.57, y + 0.055, 0.073, 0.065);
      const nose = gauss(x, y + 0.05, 0.04, 0.035);
      const socket = gauss(Math.abs(x) - p.eyeSpacing, y - 0.018, 0.048, 0.025);
      let result = Color3.Lerp(skin, warm, 0.085 * cheeks + 0.06 * nose);
      result = Color3.Lerp(result, shadow, socket * (p.age === 'older' ? 0.35 : 0.16));
      if (a.beard === 'stubble')
        result = Color3.Lerp(
          result,
          Color3.FromHexString(a.hairColor),
          0.16 * gauss(x, y + 0.19, 0.16, 0.05),
        );
      return result;
    },
  );
}
