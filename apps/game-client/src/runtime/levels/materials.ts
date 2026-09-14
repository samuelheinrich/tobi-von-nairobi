import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';

export function material(scene: Scene, name: string, color: string): StandardMaterial {
  const result = new StandardMaterial(name, scene);
  result.diffuseColor = Color3.FromHexString(color);
  result.specularColor = Color3.Black();
  return result;
}

export function box(
  scene: Scene,
  name: string,
  size: [number, number, number],
  position: [number, number, number],
  surface: StandardMaterial,
): Mesh {
  const mesh = MeshBuilder.CreateBox(
    name,
    { width: size[0], height: size[1], depth: size[2] },
    scene,
  );
  mesh.position.set(...position);
  mesh.material = surface;
  mesh.receiveShadows = true;
  return mesh;
}

export function cylinderBetween(
  scene: Scene,
  name: string,
  start: Vector3,
  end: Vector3,
  diameter: number,
  surface: StandardMaterial,
): Mesh {
  const delta = end.subtract(start);
  const mesh = MeshBuilder.CreateCylinder(
    name,
    { height: delta.length(), diameter, tessellation: 7 },
    scene,
  );
  mesh.position.copyFrom(start.add(end).scale(0.5));
  mesh.rotationQuaternion = Quaternion.Identity();
  Quaternion.FromUnitVectorsToRef(Vector3.Up(), delta.normalize(), mesh.rotationQuaternion);
  mesh.material = surface;
  return mesh;
}
