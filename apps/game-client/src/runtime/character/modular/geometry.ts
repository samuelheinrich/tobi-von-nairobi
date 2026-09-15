import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
export type V3 = [number, number, number];
export type Finish = 'cloth' | 'skin' | 'metal' | 'satin' | 'leather' | 'eye';
const caches = new WeakMap<Scene, Map<string, Mesh>>();
export function surface(scene: Scene, finish: Finish) {
  const id = `character-${finish}`;
  const found = scene.getMaterialByName(id);
  if (found) return found;
  const m = new StandardMaterial(id, scene);
  m.diffuseColor = Color3.White();
  m.specularColor = Color3.FromHexString(
    finish === 'eye'
      ? '#5a5550'
      : finish === 'metal'
        ? '#b8b4a2'
        : finish === 'satin'
          ? '#67616c'
          : finish === 'leather'
            ? '#3c4149'
            : finish === 'skin'
              ? '#070504'
              : '#030303',
  );
  m.specularPower = finish === 'eye' ? 96 : finish === 'metal' ? 64 : 28;
  if (finish === 'skin') m.roughness = 0.78;
  return m;
}
/** Unit geometry is shared; parts are baked and combined per joint instead of one draw per detail. */
export class Parts {
  private readonly parts = new Map<Finish, Mesh[]>();
  public constructor(private readonly scene: Scene) {}
  public oval(
    name: string,
    size: V3,
    at: V3,
    color: string,
    finish: Finish = 'cloth',
    rotation?: V3,
  ) {
    let cache = caches.get(this.scene);
    if (!cache) {
      cache = new Map();
      caches.set(this.scene, cache);
    }
    const segments = name === 'head' || name === 'jaw' ? 10 : 4;
    const key = `sphere-${segments}`;
    let base = cache.get(key);
    if (!base) {
      base = MeshBuilder.CreateSphere(
        'character-unit-sphere',
        { diameter: 1, segments },
        this.scene,
      );
      base.setEnabled(false);
      cache.set(key, base);
    }
    const mesh = new Mesh(name, this.scene);
    base.geometry!.applyToMesh(mesh);
    mesh.scaling.set(...size);
    mesh.position.set(...at);
    if (rotation) mesh.rotation.set(...rotation);
    this.include(mesh, color, finish);
    return mesh;
  }
  /** Smooth ring profile shapes shoulders, waist, hips and garment hems independently. */
  public profile(
    name: string,
    rings: readonly [number, number, number][],
    color: string,
    finish: Finish = 'cloth',
  ) {
    const positions: number[] = [],
      indices: number[] = [],
      normals: number[] = [];
    const sides = 16;
    for (const [y, width, depth] of rings)
      for (let i = 0; i <= sides; i++) {
        const angle = (i / sides) * Math.PI * 2;
        positions.push((Math.sin(angle) * width) / 2, y, (Math.cos(angle) * depth) / 2);
      }
    for (let row = 0; row < rings.length - 1; row++)
      for (let i = 0; i < sides; i++) {
        const a = row * (sides + 1) + i,
          b = a + sides + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    VertexData.ComputeNormals(positions, indices, normals);
    const data = new VertexData();
    data.positions = positions;
    data.indices = indices;
    data.normals = normals;
    data.uvs = new Float32Array((positions.length / 3) * 2);
    const mesh = new Mesh(name, this.scene);
    data.applyToMesh(mesh);
    this.include(mesh, color, finish);
    return mesh;
  }
  public include(mesh: Mesh, color: string, finish: Finish) {
    const rgb = Color3.FromHexString(color),
      colors = new Float32Array(mesh.getTotalVertices() * 4);
    for (let i = 0; i < colors.length; i += 4) colors.set([rgb.r, rgb.g, rgb.b, 1], i);
    // Separate geometry before assigning vertex colours: cached unit meshes must stay immutable.
    mesh.makeGeometryUnique();
    mesh.setVerticesData('color', colors);
    mesh.material = surface(this.scene, finish);
    const group = this.parts.get(finish) ?? [];
    group.push(mesh);
    this.parts.set(finish, group);
  }
  public bake(name: string, parent: TransformNode): Mesh[] {
    const result: Mesh[] = [];
    for (const [finish, pieces] of this.parts) {
      const mesh = Mesh.MergeMeshes(pieces, true, true, undefined, false, false)!;
      mesh.name = `${name}-${finish}`;
      mesh.parent = parent;
      mesh.isPickable = false;
      mesh.material = surface(this.scene, finish);
      result.push(mesh);
    }
    return result;
  }
}
