import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent.js';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color.js';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight.js';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { LevelDefinition } from '@tobi/contracts';
import type { HavokWorld } from '../physics/havok-world.js';
import { box, material } from './materials.js';
import { palm, parasol } from './scenery.js';
import { createBaliVenue } from './bali-venues.js';

export interface BaliScene {
  shadows: ShadowGenerator;
  destination: Mesh;
  colliders: Mesh[];
}

/** Procedural original blockout assets. All gameplay locations come from the level definition. */
export function createBaliScene(
  scene: Scene,
  physics: HavokWorld,
  level: LevelDefinition,
): BaliScene {
  const night = level.atmosphere === 'night';
  const sky = night ? '#233951' : level.atmosphere === 'sunset' ? '#edb7aa' : '#b9e5e7';
  scene.clearColor = Color4.FromHexString(`${sky}ff`);
  scene.fogMode = 3;
  scene.fogColor = Color3.FromHexString(sky);
  scene.fogStart = 65;
  scene.fogEnd = 145;
  const ambient = new HemisphericLight('sky-light', new Vector3(0, 1, 0), scene);
  ambient.intensity = 0.65;
  ambient.groundColor = Color3.FromHexString('#ddbd8a');
  const sun = new DirectionalLight('afternoon-sun', new Vector3(-0.5, -1, 0.35), scene);
  sun.position.set(20, 35, -20);
  sun.intensity = night ? 0.35 : 0.85;
  sun.diffuse = Color3.FromHexString(
    night ? '#a2caff' : level.atmosphere === 'sunset' ? '#ffc7a1' : '#ffffff',
  );
  const shadows = new ShadowGenerator(1024, sun);
  shadows.usePercentageCloserFiltering = true;
  shadows.bias = 0.002;
  shadows.normalBias = 0.025;
  shadows.darkness = 0.25;
  const sand = material(scene, 'warm-sand', night ? '#a8a08d' : '#e9ce98');
  const pavement = material(scene, 'sun-bleached-pavement', night ? '#c5bb9d' : '#efdfb7');
  const road = material(scene, 'road', '#90988a');
  const water = material(scene, 'lagoon-water', '#43c2ca');
  water.specularColor = Color3.FromHexString('#abdedd');
  const foam = material(scene, 'shore-foam', '#d6f0d9');
  const coral = material(scene, 'coral', '#ef7758');
  const yellow = material(scene, 'ochre', '#e8b44e');
  const teal = material(scene, 'teal', '#3b8f81');
  const roof = material(scene, 'terracotta', '#b66b4f');
  const wood = material(scene, 'wood', '#8c6b4c');
  const leaves = material(scene, 'palm-green', '#479467');
  const cream = material(scene, 'cream', '#fff0cf');
  const dark = material(scene, 'window-dark', '#294e4d');
  const colliders: Mesh[] = [];
  const solid = (mesh: Mesh): Mesh => {
    physics.addStatic(mesh);
    colliders.push(mesh);
    shadows.addShadowCaster(mesh);
    return mesh;
  };
  solid(box(scene, 'island-ground', [64, 1, 72], [0, -0.5, 0], sand));
  box(scene, 'ocean', [160, 0.3, 210], [96, -0.2, 10], water);
  box(scene, 'shoreline', [2.8, 0.1, 72], [31.8, -0.08, 0], foam);
  box(scene, 'walking-lane', [7, 0.025, 57], [0, 0.018, 0], pavement);
  box(scene, 'coast-road', [6, 0.03, 70], [12, 0.02, 0], road);
  for (let z = -30; z < 32; z += 5)
    box(scene, 'road-stripe', [0.13, 0.025, 2.2], [12, 0.05, z], cream);
  // Invisible physical boundary keeps the blockout traversable without fake water physics.
  for (const [x, z, w, d] of [
    [-31, 0, 1, 72],
    [31, 0, 1, 72],
    [0, -35, 64, 1],
    [0, 35, 64, 1],
  ]) {
    const boundary = solid(
      box(scene, 'island-boundary', [w ?? 1, 4, d ?? 1], [x ?? 0, 1, z ?? 0], sand),
    );
    boundary.isVisible = false;
    boundary.metadata = { cameraObstacle: false };
  }
  const house = (x: number, z: number, surface: StandardMaterial, width = 7, depth = 7): void => {
    solid(box(scene, 'bungalow', [width, 3.7, depth], [x, 1.85, z], surface));
    const hat = MeshBuilder.CreateCylinder(
      'hip-roof',
      { height: 1.8, diameterTop: 0, diameterBottom: width * 1.5, tessellation: 4 },
      scene,
    );
    hat.position.set(x, 4.3, z);
    hat.rotation.y = Math.PI / 4;
    hat.material = roof;
    physics.addCollider(hat, { collision: 'convex' });
    shadows.addShadowCaster(hat);
    box(scene, 'door', [1.25, 2.4, 0.08], [x, 1.2, z - depth / 2 - 0.04], dark);
    for (const offset of [-2.2, 2.2]) {
      box(scene, 'window-frame', [1.3, 1.3, 0.1], [x + offset, 2, z - depth / 2 - 0.05], cream);
      box(scene, 'window', [1.1, 1.1, 0.12], [x + offset, 2, z - depth / 2 - 0.1], teal);
    }
  };
  house(-10, -14, coral);
  house(-11, 1, yellow, 8, 8);
  house(-10, 17, teal);
  house(0, 26, cream, 8, 7);
  house(22, 19, coral, 6, 6);
  house(-24, 26, cream, 9, 8);
  for (const [x, z, h] of [
    [7, -18, 7],
    [22, -23, 6],
    [25, -8, 7],
    [23, 8, 8],
    [7, 15, 6],
    [-6, 24, 7],
    [-19, -5, 8],
    [-24, 10, 6],
    [5, -1, 6],
  ])
    palm(scene, x ?? 0, z ?? 0, h ?? 6, wood, leaves, shadows);
  for (const z of [-17, -4, 9]) parasol(scene, 25, z, z === -4 ? coral : cream, wood, shadows);
  // Alternate route, jumpable crates and a three-step test stair beside the main path.
  solid(box(scene, 'garden-wall', [0.5, 1, 7], [-4.8, 0.5, -4], cream));
  solid(box(scene, 'jump-crate', [1.5, 0.65, 1.5], [5.2, 0.325, 6], wood));
  for (let i = 0; i < 3; i++)
    solid(
      box(scene, `test-step-${i}`, [2.8, 0.2 * (i + 1), 1], [-7, 0.1 * (i + 1), 8 + i], pavement),
    );
  for (const z of [-11, 2, 14]) {
    const planter = solid(box(scene, 'planter', [1.1, 0.7, 1.1], [4.6, 0.35, z], coral));
    const bush = MeshBuilder.CreateSphere('shrub', { diameter: 1.4, segments: 3 }, scene);
    bush.position.copyFrom(planter.position.add(new Vector3(0, 0.7, 0)));
    bush.material = leaves;
    shadows.addShadowCaster(bush);
  }
  createBaliVenue(scene, level, solid);
  const signTexture = new DynamicTexture('airbnb-sign', { width: 512, height: 128 }, scene, false);
  signTexture.drawText('CASA TOBI', null, 86, 'bold 56px sans-serif', '#234744', '#f8eacb', true);
  const signMaterial = new StandardMaterial('sign', scene);
  signMaterial.diffuseTexture = signTexture;
  signMaterial.emissiveColor = new Color3(0.3, 0.3, 0.3);
  const sign = MeshBuilder.CreatePlane('airbnb-sign', { width: 4.4, height: 1.1 }, scene);
  sign.position.set(0, 3.4, 22.43);
  sign.material = signMaterial;
  const destination = MeshBuilder.CreateTorus(
    'safe-zone-ring',
    { diameter: 4.5, thickness: 0.07, tessellation: 48 },
    scene,
  );
  destination.position.set(level.destination.position.x, 0.09, level.destination.position.z);
  const glow = material(scene, 'safe-zone-gold', '#ffd86f');
  glow.emissiveColor = Color3.FromHexString('#80692e');
  destination.material = glow;
  return { shadows, destination, colliders };
}
