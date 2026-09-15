import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';

/** Local candidate preview: no catalogue edits or production registration required. */
export async function previewModelFile(
  scene: Scene,
  camera: ArcRotateCamera,
  file: string,
): Promise<void> {
  if (!/^(?:[\w.+-]+\/)*[\w.+-]+\.glb$/i.test(file) || file.split('/').includes('..'))
    throw new Error('Expected a GLB path relative to models/, e.g. work/nina-rigged.glb');
  const container = await LoadAssetContainerAsync('/models/' + file, scene);
  container.addAllToScene();
  const root = container.rootNodes[0];
  if (!(root instanceof TransformNode)) {
    container.dispose();
    throw new Error('GLB has no transform root');
  }
  for (const group of container.animationGroups) group.stop();
  const bounds = root.getHierarchyBoundingVectors(true);
  const size = bounds.max.subtract(bounds.min);
  const target = bounds.min.add(size.scale(0.5));
  camera.setTarget(target);
  camera.radius = Math.max(0.6, size.length() * 1.65);
  camera.lowerRadiusLimit = Math.max(0.02, size.length() * 0.05);
  camera.upperRadiusLimit = Math.max(40, size.length() * 4);
  document.querySelector('#status')!.textContent =
    file +
    ' · ' +
    container.meshes.filter((m) => m.getTotalVertices() > 0).length +
    ' Meshes · ' +
    container.skeletons.reduce((n, s) => n + s.bones.length, 0) +
    ' Bones · ' +
    container.animationGroups.length +
    ' Clips · Höhe ' +
    size.y.toFixed(3) +
    ' m (unskaliert)';
  const clips = document.createElement('select');
  clips.setAttribute('aria-label', 'Animation der lokalen Datei');
  const rest = document.createElement('option');
  rest.value = '';
  rest.textContent = 'Bindepose';
  clips.append(rest);
  for (const [index, clip] of container.animationGroups.entries()) {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = clip.name;
    clips.append(option);
  }
  clips.onchange = () => {
    for (const clip of container.animationGroups) clip.stop();
    for (const skeleton of container.skeletons) skeleton.returnToRest();
    if (clips.value !== '') container.animationGroups[Number(clips.value)]?.play(true);
  };
  document.querySelector('header')!.append(clips);
  scene.getEngine().resize();
  scene.onDisposeObservable.addOnce(() => container.dispose());
  document.body.dataset.ready = 'true';
  // A helper for framing tall/unit-mismatched imports without mutating the source geometry.
  camera.target = new Vector3(target.x, target.y, target.z);
}
