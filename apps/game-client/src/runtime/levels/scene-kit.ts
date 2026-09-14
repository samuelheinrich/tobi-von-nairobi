import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent.js';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color.js';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight.js';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight.js';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { LevelDefinition } from '@tobi/contracts';
import type { HavokWorld } from '../physics/havok-world.js';
import { material } from './materials.js';

export function sceneKit(scene: Scene, world: HavokWorld, sky: string) {
  scene.clearColor = Color4.FromHexString(`${sky}ff`);
  scene.fogMode = 3;
  scene.fogColor = Color3.FromHexString(sky);
  scene.fogStart = 70;
  scene.fogEnd = 150;
  const ambient = new HemisphericLight('sky', new Vector3(0, 1, 0), scene);
  ambient.intensity = 0.8;
  const sun = new DirectionalLight('sun', new Vector3(-0.4, -1, 0.2), scene);
  sun.position.set(20, 40, -25);
  sun.intensity = 0.6;
  const shadows = new ShadowGenerator(1024, sun);
  shadows.usePercentageCloserFiltering = true;
  shadows.bias = 0.002;
  shadows.normalBias = 0.03;
  const colliders: Mesh[] = [];
  const solid = (mesh: Mesh, cameraObstacle = true): Mesh => {
    world.addStatic(mesh);
    mesh.metadata = { ...mesh.metadata, cameraObstacle };
    colliders.push(mesh);
    shadows.addShadowCaster(mesh);
    return mesh;
  };
  return { shadows, colliders, solid };
}
export function sceneSign(scene: Scene, text: string, x: number, y: number, z: number, width = 5) {
  const texture = new DynamicTexture(`sign-${text}`, { width: 1024, height: 256 }, scene, false);
  texture.drawText(text, null, 165, 'bold 66px sans-serif', '#fff3cd', '#243d45', true);
  const surface = new StandardMaterial(`sign-${text}`, scene);
  surface.diffuseTexture = texture;
  surface.emissiveColor.set(0.4, 0.4, 0.4);
  const mesh = MeshBuilder.CreatePlane(`sign-${text}`, { width, height: width / 4 }, scene);
  mesh.position.set(x, y, z);
  mesh.material = surface;
  return mesh;
}
export function destinationRing(scene: Scene, level: LevelDefinition): Mesh {
  const mesh = MeshBuilder.CreateTorus(
    'safe-zone-ring',
    { diameter: level.destination.radius * 2, thickness: 0.08, tessellation: 32 },
    scene,
  );
  mesh.position.set(
    level.destination.position.x,
    level.destination.position.y + 0.09,
    level.destination.position.z,
  );
  const surface = material(scene, 'destination-glow', '#ffdc78');
  surface.emissiveColor.set(0.5, 0.4, 0.1);
  mesh.material = surface;
  return mesh;
}
