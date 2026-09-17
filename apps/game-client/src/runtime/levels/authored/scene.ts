import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent.js';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight.js';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight.js';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Color4 } from '@babylonjs/core/Maths/math.color.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { LevelDefinition } from '@tobi/contracts';
import type { HavokWorld } from '../../physics/havok-world.js';
import type { LevelScene } from '../create-level-scene.js';
import { loadAuthoredLevel } from './import-level.js';

/** Composition adapter: exported geometry, existing player/physics/gameplay runtime. */
export function createAuthoredScene(
  scene: Scene,
  _world: HavokWorld,
  level: LevelDefinition,
): LevelScene {
  if (!level.authoredAsset) throw new Error('Authored level is missing its asset URL.');
  scene.clearColor = new Color4(0.65, 0.8, 0.9, 1);
  new HemisphericLight('authored-sky', new Vector3(0, 1, 0), scene).intensity = 0.8;
  const sun = new DirectionalLight('authored-sun', new Vector3(-0.5, -1, 0.3), scene);
  sun.position.set(15, 35, -15);
  sun.intensity = 1;
  const shadows = new ShadowGenerator(1024, sun);
  shadows.usePercentageCloserFiltering = true;
  shadows.bias = 0.002;
  shadows.normalBias = 0.025;
  const destination = new Mesh('authored-destination', scene);
  destination.position.set(
    level.destination.position.x,
    level.destination.position.y,
    level.destination.position.z,
  );
  destination.isVisible = false;
  const colliders: Mesh[] = [];
  const debugTeleports: { label: string; position: { x: number; y: number; z: number } }[] = [];
  const ready = loadAuthoredLevel(scene, level.authoredAsset).then((loaded) => {
    colliders.push(...loaded.proxies);
    const solidNames = new Set(loaded.proxies.map((mesh) => mesh.metadata?.renderId));
    for (const mesh of loaded.container.meshes) {
      mesh.receiveShadows = true;
      if (solidNames.has(mesh.name)) mesh.metadata = { ...mesh.metadata, cameraObstacle: true };
      if (mesh.getTotalVertices()) shadows.addShadowCaster(mesh);
    }
    for (const marker of [...loaded.metadata.playerSpawns, ...loaded.metadata.roofAccess]) {
      const [x, y, z] = marker.position;
      debugTeleports.push({ label: marker.id, position: { x, y: y + 1.1, z } });
    }
  });
  return {
    shadows,
    destination,
    colliders,
    ready,
    debugTeleports,
    worldLabel: () => level.title,
    safeGround: (p) => p.y > -4,
  };
}
