import type { AssetContainer } from '@babylonjs/core/assetContainer.js';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader.js';
import '@babylonjs/loaders/glTF/2.0/glTFLoader.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';

export interface AircraftModelOptions {
  url: string;
  parent: TransformNode;
  centre: readonly [number, number, number];
  maximumSize: readonly [number, number, number];
  yaw?: number;
}

export interface LoadedAircraftModel {
  container: AssetContainer;
  root: TransformNode;
  dispose(): void;
}

/** Loads an authored GLB unchanged and normalises only its scene transform. */
export async function loadAircraftModel(
  scene: Scene,
  options: AircraftModelOptions,
): Promise<LoadedAircraftModel> {
  const container = await LoadAssetContainerAsync(options.url, scene);
  if (scene.isDisposed || options.parent.isDisposed()) {
    container.dispose();
    throw new Error(`Aircraft model load cancelled: ${options.url}`);
  }
  container.addAllToScene();
  const root = new TransformNode(`model:${options.url}`, scene);
  root.parent = options.parent;
  for (const node of container.rootNodes) node.parent = root;
  let min = new Vector3(Infinity, Infinity, Infinity);
  let max = new Vector3(-Infinity, -Infinity, -Infinity);
  for (const mesh of container.meshes) {
    if (!mesh.getTotalVertices()) continue;
    mesh.computeWorldMatrix(true);
    const bounds = mesh.getBoundingInfo().boundingBox;
    min = Vector3.Minimize(min, bounds.minimumWorld);
    max = Vector3.Maximize(max, bounds.maximumWorld);
    mesh.isPickable = false;
    mesh.receiveShadows = true;
  }
  const size = max.subtract(min);
  if (![size.x, size.y, size.z].every((value) => Number.isFinite(value) && value > 0.01)) {
    container.dispose();
    root.dispose();
    throw new Error(`Aircraft model has invalid bounds: ${options.url}`);
  }
  const scale = Math.min(
    options.maximumSize[0] / size.x,
    options.maximumSize[1] / size.y,
    options.maximumSize[2] / size.z,
  );
  const centre = min.add(max).scale(0.5);
  root.scaling.setAll(scale);
  const yaw = options.yaw ?? 0;
  root.rotation.y = yaw;
  const transformedCentre = Vector3.TransformCoordinates(
    centre.scale(scale),
    Matrix.RotationY(yaw),
  );
  root.position.set(
    options.centre[0] - transformedCentre.x,
    options.centre[1] - transformedCentre.y,
    options.centre[2] - transformedCentre.z,
  );
  return {
    container,
    root,
    dispose() {
      container.dispose();
      root.dispose();
    },
  };
}
