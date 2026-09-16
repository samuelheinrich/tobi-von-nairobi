import '@babylonjs/loaders/glTF/index.js';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { ColliderConfig } from './collider-factory.js';
import { physicsWorld } from './havok-world.js';

/** World-asset entry point. Humanoid GLBs continue to use character capsules instead. */
export async function loadWorldAsset(
  scene: Scene,
  url: string,
  configs: Readonly<Record<string, ColliderConfig>> = {},
) {
  const world = physicsWorld(scene);
  if (!world) throw new Error('Create HavokWorld before loading physical world assets.');
  const container = await LoadAssetContainerAsync(url, scene);
  try {
    container.addAllToScene();
    world.registerAsset(
      container.meshes.filter((m) => m.getTotalVertices() > 0),
      configs,
    );
    return container;
  } catch (error) {
    container.dispose();
    throw error;
  }
}
